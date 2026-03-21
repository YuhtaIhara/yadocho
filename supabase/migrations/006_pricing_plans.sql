-- ══════════════════════════════════════════════════════════════
-- 006: 料金プラン複数化 + 予約ごとの食事単価スナップショット
--
-- 目的:
--   1. pricing_config (1宿1行) → pricing_plans (1宿N行) に拡張
--   2. reservations に食事単価を保存し、設定変更で過去の請求書が変わらないようにする
-- ══════════════════════════════════════════════════════════════

-- ── pricing_plans テーブル ──
CREATE TABLE pricing_plans (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id                uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  adult_price           int NOT NULL DEFAULT 8500,
  child_price           int NOT NULL DEFAULT 5000,
  dinner_price          int NOT NULL DEFAULT 2000,
  child_dinner_price    int NOT NULL DEFAULT 1500,
  breakfast_price       int NOT NULL DEFAULT 800,
  child_breakfast_price int NOT NULL DEFAULT 500,
  lunch_price           int NOT NULL DEFAULT 0,
  child_lunch_price     int NOT NULL DEFAULT 0,
  is_default            boolean NOT NULL DEFAULT false,
  sort_order            int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_plans_inn ON pricing_plans(inn_id);

-- RLS
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_plans_select" ON pricing_plans FOR SELECT
  USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "pricing_plans_insert" ON pricing_plans FOR INSERT
  WITH CHECK (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "pricing_plans_update" ON pricing_plans FOR UPDATE
  USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "pricing_plans_delete" ON pricing_plans FOR DELETE
  USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

-- ── データ移行: pricing_config → pricing_plans「通常」プラン ──
INSERT INTO pricing_plans (
  inn_id, name, adult_price, child_price,
  dinner_price, child_dinner_price, breakfast_price, child_breakfast_price,
  lunch_price, child_lunch_price, is_default
)
SELECT
  inn_id, '通常', adult_price, child_price,
  dinner_price, child_dinner_price, breakfast_price, child_breakfast_price,
  lunch_price, child_lunch_price, true
FROM pricing_config;

-- ── reservations に食事単価スナップショット列を追加 ──
ALTER TABLE reservations
  ADD COLUMN pricing_plan_id       uuid REFERENCES pricing_plans(id) ON DELETE SET NULL,
  ADD COLUMN dinner_price          int NOT NULL DEFAULT 2000,
  ADD COLUMN child_dinner_price    int NOT NULL DEFAULT 1500,
  ADD COLUMN breakfast_price       int NOT NULL DEFAULT 800,
  ADD COLUMN child_breakfast_price int NOT NULL DEFAULT 500,
  ADD COLUMN lunch_price           int NOT NULL DEFAULT 0,
  ADD COLUMN child_lunch_price     int NOT NULL DEFAULT 0;

-- ── 既存予約に食事単価をバックフィル ──
-- 各予約の inn_id を使って pricing_config から食事単価を取得
UPDATE reservations r
SET
  dinner_price          = pc.dinner_price,
  child_dinner_price    = pc.child_dinner_price,
  breakfast_price       = pc.breakfast_price,
  child_breakfast_price = pc.child_breakfast_price,
  lunch_price           = pc.lunch_price,
  child_lunch_price     = pc.child_lunch_price,
  pricing_plan_id       = pp.id
FROM pricing_config pc, pricing_plans pp
WHERE r.inn_id = pc.inn_id
  AND pp.inn_id = pc.inn_id
  AND pp.is_default = true;
