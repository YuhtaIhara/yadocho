-- 監査で検出されたデータ整合性の修正

-- 1. FK CASCADE 追加: reservations.guest_id
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_guest_id_fkey;
ALTER TABLE reservations ADD CONSTRAINT reservations_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

-- 2. FK CASCADE 追加: reservation_rooms.room_id
ALTER TABLE reservation_rooms DROP CONSTRAINT IF EXISTS reservation_rooms_room_id_fkey;
ALTER TABLE reservation_rooms ADD CONSTRAINT reservation_rooms_room_id_fkey
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- 3. 孤立インデックス削除 (group_id は migration 002 で DROP 済み)
DROP INDEX IF EXISTS idx_res_group;

-- 4. パフォーマンス: 不足インデックス追加
CREATE INDEX IF NOT EXISTS idx_rooms_inn ON rooms(inn_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_reservation ON invoice_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_meal_days_reservation ON meal_days(reservation_id);

-- 5. 予約の免税理由フィールド追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS tax_exempt_reason text;
