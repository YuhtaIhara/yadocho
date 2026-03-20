-- yadocho: 税システム刷新
-- tax_periods (単一税率) → tax_rules + tax_rule_rates (複数税・3方式対応)

-- ── 1. 新テーブル作成 ──

CREATE TABLE tax_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id          uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  tax_name        text NOT NULL,
  tax_type        text NOT NULL,
  calc_method     text NOT NULL,
  effective_from  date NOT NULL,
  effective_to    date,
  threshold       int NOT NULL DEFAULT 0,
  exempt_school_trips boolean NOT NULL DEFAULT false,
  rounding_unit   int NOT NULL DEFAULT 1,
  inclusive_pref_tax_rule_id uuid REFERENCES tax_rules(id) ON DELETE SET NULL,
  notes           text,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_tax_type CHECK (tax_type IN ('prefecture', 'municipal')),
  CONSTRAINT valid_calc_method CHECK (calc_method IN ('flat', 'tiered', 'percentage', 'inclusive_percentage')),
  CONSTRAINT valid_rounding_unit CHECK (rounding_unit IN (1, 100))
);

CREATE INDEX idx_tax_rules_inn ON tax_rules(inn_id);

CREATE TABLE tax_rule_rates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rule_id     uuid NOT NULL REFERENCES tax_rules(id) ON DELETE CASCADE,
  bracket_min     int NOT NULL DEFAULT 0,
  bracket_max     int,
  rate_percent    numeric(5,2),
  flat_amount     int,
  CONSTRAINT one_rate CHECK (
    (rate_percent IS NOT NULL AND flat_amount IS NULL) OR
    (rate_percent IS NULL AND flat_amount IS NOT NULL)
  )
);

CREATE INDEX idx_tax_rule_rates_rule ON tax_rule_rates(tax_rule_id);

-- ── 2. RLS ──

ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rule_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_tax_rules" ON tax_rules
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_tax_rule_rates" ON tax_rule_rates
  FOR ALL USING (
    tax_rule_id IN (
      SELECT id FROM tax_rules
      WHERE inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ── 3. 既存データ移行 (tax_periods → tax_rules + tax_rule_rates) ──

-- tax_periods の各行を percentage 方式の tax_rule に変換
INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, sort_order)
SELECT
  inn_id,
  '宿泊税',
  'municipal',
  'percentage',
  effective_from,
  effective_to,
  threshold,
  0
FROM tax_periods;

-- 対応する rate を挿入
INSERT INTO tax_rule_rates (tax_rule_id, rate_percent)
SELECT tr.id, tp.rate_percent
FROM tax_rules tr
JOIN tax_periods tp ON tr.inn_id = tp.inn_id
  AND tr.effective_from = tp.effective_from
  AND tr.calc_method = 'percentage';

-- ── 4. 旧テーブルをリネーム (完全削除は動作確認後) ──

DROP POLICY IF EXISTS "tenant_tax" ON tax_periods;
ALTER TABLE tax_periods RENAME TO tax_periods_deprecated;

-- ── 5. 自治体別税ルール一括セットアップ関数 ──
-- 使い方: SELECT setup_municipality_tax_rules('INN_ID', 'nozawa');

CREATE OR REPLACE FUNCTION setup_municipality_tax_rules(
  p_inn_id uuid,
  p_municipality text
) RETURNS void AS $$
DECLARE
  v_rule_id uuid;
  v_pref_rule_id uuid;
BEGIN
  -- 既存の税ルールを削除（この宿の全ルール）
  DELETE FROM tax_rules WHERE inn_id = p_inn_id;

  CASE p_municipality

  -- ══════════════════════════════════════════════════════════════
  -- 野沢温泉村: 県税込みpercentage方式
  --   3年間: 3.5%（県税100円を含む）→ 4年目以降: 5%（県税150円を含む）
  --   計算: 合計 = floor(price * rate%)、県税 = 固定額、村税 = 合計 - 県税
  --   ※電話確認待ち（N1）— 暫定実装
  -- ══════════════════════════════════════════════════════════════
  WHEN 'nozawa' THEN
    -- 期間1: 経過措置（R8.6.1〜R11.5.31）
    -- 長野県宿泊税（県税100円）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2026-06-01', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_pref_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_pref_rule_id, 100);

    -- 野沢温泉村宿泊税（3.5%から県税100円を差し引き）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, inclusive_pref_tax_rule_id, sort_order, notes)
    VALUES (p_inn_id, '野沢温泉村宿泊税', 'municipal', 'inclusive_percentage', '2026-06-01', '2029-06-01', 6000, true, v_pref_rule_id, 2,
            '県税込み3.5%。合計=floor(price*0.035)、村税=合計-県税100円。電話確認待ち（N1）')
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, rate_percent) VALUES (v_rule_id, 3.50);

    -- 期間2: 本則（R11.6.1〜）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_pref_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_pref_rule_id, 150);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, inclusive_pref_tax_rule_id, sort_order, notes)
    VALUES (p_inn_id, '野沢温泉村宿泊税', 'municipal', 'inclusive_percentage', '2029-06-01', 6000, true, v_pref_rule_id, 2,
            '県税込み5%。合計=floor(price*0.05)、村税=合計-県税150円')
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, rate_percent) VALUES (v_rule_id, 5.00);

  -- ══════════════════════════════════════════════════════════════
  -- 白馬村: 県税flat + 村税tiered（確定ブラケット）
  --   3年間: 村税100/300/800/1,800 → 4年目以降: 150/350/850/1,850
  -- ══════════════════════════════════════════════════════════════
  WHEN 'hakuba' THEN
    -- 期間1: 経過措置（R8.6.1〜R11.5.31）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2026-06-01', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 100);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '白馬村宿泊税', 'municipal', 'tiered', '2026-06-01', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, bracket_min, bracket_max, flat_amount) VALUES
      (v_rule_id, 6000, 20000, 100),
      (v_rule_id, 20000, 50000, 300),
      (v_rule_id, 50000, 100000, 800),
      (v_rule_id, 100000, NULL, 1800);

    -- 期間2: 本則（R11.6.1〜）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 150);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '白馬村宿泊税', 'municipal', 'tiered', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, bracket_min, bracket_max, flat_amount) VALUES
      (v_rule_id, 6000, 20000, 150),
      (v_rule_id, 20000, 50000, 350),
      (v_rule_id, 50000, 100000, 850),
      (v_rule_id, 100000, NULL, 1850);

  -- ══════════════════════════════════════════════════════════════
  -- 軽井沢町: 県税flat + 町税tiered（確定ブラケット）
  --   3年間: 町税100/150/600 → 4年目以降: 150/200/650
  -- ══════════════════════════════════════════════════════════════
  WHEN 'karuizawa' THEN
    -- 期間1: 経過措置（R8.6.1〜R11.5.31）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2026-06-01', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 100);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '軽井沢町宿泊税', 'municipal', 'tiered', '2026-06-01', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, bracket_min, bracket_max, flat_amount) VALUES
      (v_rule_id, 6000, 10000, 100),
      (v_rule_id, 10000, 100000, 150),
      (v_rule_id, 100000, NULL, 600);

    -- 期間2: 本則（R11.6.1〜）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 150);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '軽井沢町宿泊税', 'municipal', 'tiered', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, bracket_min, bracket_max, flat_amount) VALUES
      (v_rule_id, 6000, 10000, 150),
      (v_rule_id, 10000, 100000, 200),
      (v_rule_id, 100000, NULL, 650);

  -- ══════════════════════════════════════════════════════════════
  -- 松本市: 県税flat + 市税flat
  --   3年間: 県税100+市税100 → 4年目以降: 県税150+市税150
  -- ══════════════════════════════════════════════════════════════
  WHEN 'matsumoto' THEN
    -- 期間1: 経過措置
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2026-06-01', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 100);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '松本市宿泊税', 'municipal', 'flat', '2026-06-01', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 100);

    -- 期間2: 本則
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 150);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '松本市宿泊税', 'municipal', 'flat', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 150);

  -- ══════════════════════════════════════════════════════════════
  -- 阿智村: 県税flat + 村税flat（別課税）
  --   3年間: 県税100+村税200 → 4年目以降: 県税150+村税200
  -- ══════════════════════════════════════════════════════════════
  WHEN 'achi' THEN
    -- 期間1: 経過措置
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2026-06-01', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 100);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '阿智村宿泊税', 'municipal', 'flat', '2026-06-01', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 200);

    -- 期間2: 本則
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 150);

    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '阿智村宿泊税', 'municipal', 'flat', '2029-06-01', 6000, true, 2)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 200);

  -- ══════════════════════════════════════════════════════════════
  -- その他長野県: 県税flatのみ
  --   3年間: 200円 → 4年目以降: 300円
  -- ══════════════════════════════════════════════════════════════
  WHEN 'nagano_other' THEN
    -- 期間1: 経過措置
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2026-06-01', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 200);

    -- 期間2: 本則
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '長野県宿泊税', 'prefecture', 'flat', '2029-06-01', 6000, true, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, flat_amount) VALUES (v_rule_id, 300);

  -- ══════════════════════════════════════════════════════════════
  -- 東京都: tiered 100-200（変更なし）
  -- ══════════════════════════════════════════════════════════════
  WHEN 'tokyo' THEN
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, sort_order)
    VALUES (p_inn_id, '東京都宿泊税', 'municipal', 'tiered', '2002-10-01', 10000, false, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, bracket_min, bracket_max, flat_amount) VALUES
      (v_rule_id, 10000, 15000, 100),
      (v_rule_id, 15000, NULL, 200);

  -- ══════════════════════════════════════════════════════════════
  -- 倶知安町: percentage 2%→3%、端数100円未満切捨
  --   〜R8.3.31: 2% → R8.4.1〜: 3%
  -- ══════════════════════════════════════════════════════════════
  WHEN 'kutchan' THEN
    -- 期間1: 2%（〜2026-03-31）
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, effective_to, threshold, exempt_school_trips, rounding_unit, sort_order)
    VALUES (p_inn_id, '倶知安町宿泊税', 'municipal', 'percentage', '2019-11-01', '2026-04-01', 0, false, 100, 1)
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, rate_percent) VALUES (v_rule_id, 2.00);

    -- 期間2: 3%（2026-04-01〜）— 北海道宿泊税との関係は電話確認後に修正
    INSERT INTO tax_rules (inn_id, tax_name, tax_type, calc_method, effective_from, threshold, exempt_school_trips, rounding_unit, sort_order, notes)
    VALUES (p_inn_id, '倶知安町宿泊税', 'municipal', 'percentage', '2026-04-01', 0, false, 100, 1,
            '3%のうち北海道宿泊税分を含む。道税との分離計算は電話確認後に設計（KU1）')
    RETURNING id INTO v_rule_id;
    INSERT INTO tax_rule_rates (tax_rule_id, rate_percent) VALUES (v_rule_id, 3.00);

  ELSE
    RAISE EXCEPTION 'Unknown municipality: %', p_municipality;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
