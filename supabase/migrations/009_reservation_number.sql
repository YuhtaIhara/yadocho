-- 予約番号: YYMMDD-NNN 形式（例: 260321-001）
-- 作成日ベースで当日の連番を自動付与

ALTER TABLE reservations ADD COLUMN reservation_number text;

-- Unique constraint (inn scoped)
CREATE UNIQUE INDEX idx_reservation_number ON reservations (inn_id, reservation_number) WHERE reservation_number IS NOT NULL;

-- Auto-generate function
CREATE OR REPLACE FUNCTION generate_reservation_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix text;
  seq int;
  new_number text;
BEGIN
  -- YYMMDD from created_at (JST)
  prefix := to_char(NEW.created_at AT TIME ZONE 'Asia/Tokyo', 'YYMMDD');

  -- Count existing reservations for this inn on same day
  SELECT COUNT(*) + 1 INTO seq
  FROM reservations
  WHERE inn_id = NEW.inn_id
    AND reservation_number LIKE prefix || '-%';

  new_number := prefix || '-' || lpad(seq::text, 3, '0');
  NEW.reservation_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservation_number
  BEFORE INSERT ON reservations
  FOR EACH ROW
  WHEN (NEW.reservation_number IS NULL)
  EXECUTE FUNCTION generate_reservation_number();

-- Backfill existing reservations
UPDATE reservations SET reservation_number =
  to_char(created_at AT TIME ZONE 'Asia/Tokyo', 'YYMMDD') || '-' ||
  lpad(
    (ROW_NUMBER() OVER (PARTITION BY inn_id, to_char(created_at AT TIME ZONE 'Asia/Tokyo', 'YYMMDD') ORDER BY created_at))::text,
    3, '0'
  )
WHERE reservation_number IS NULL;
