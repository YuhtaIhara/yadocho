-- ステータスを3つに簡素化: scheduled / settled / cancelled
-- checked_in, checked_out → scheduled に戻す（精算済みは invoice_items.locked で判定）

UPDATE reservations SET status = 'scheduled' WHERE status IN ('checked_in', 'checked_out');

ALTER TABLE reservations DROP CONSTRAINT valid_status;
ALTER TABLE reservations ADD CONSTRAINT valid_status CHECK (status IN ('scheduled', 'settled', 'cancelled'));
