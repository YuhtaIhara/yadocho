-- 予約と部屋の多対多リレーション
-- 1予約 = 1グループ。部屋は N 個押さえられる。

-- ── junction table ──
CREATE TABLE reservation_rooms (
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id        uuid NOT NULL REFERENCES rooms(id),
  PRIMARY KEY (reservation_id, room_id)
);

CREATE INDEX idx_rr_room ON reservation_rooms(room_id);

-- ── RLS ──
ALTER TABLE reservation_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_via_reservation" ON reservation_rooms
  FOR ALL USING (
    reservation_id IN (
      SELECT id FROM reservations
      WHERE inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ── データ移行 ──
INSERT INTO reservation_rooms (reservation_id, room_id)
SELECT id, room_id FROM reservations WHERE room_id IS NOT NULL;

-- ── 旧カラム削除 ──
ALTER TABLE reservations DROP COLUMN room_id;
ALTER TABLE reservations DROP COLUMN group_id;
