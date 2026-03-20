-- 献立テーブル（日付ごとのメニューメモ）
CREATE TABLE IF NOT EXISTS kondate (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id      uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  date        date NOT NULL,
  content     text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(inn_id, date)
);

CREATE INDEX IF NOT EXISTS idx_kondate_inn_date ON kondate(inn_id, date);

ALTER TABLE kondate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_kondate" ON kondate
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE TRIGGER trg_kondate_updated BEFORE UPDATE ON kondate
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
