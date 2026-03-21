-- 007: ゲスト情報拡充 + 部屋タイプ追加
-- ゲスト: ふりがな・会社名
ALTER TABLE guests
  ADD COLUMN furigana text,
  ADD COLUMN company  text;

CREATE INDEX idx_guests_furigana ON guests(inn_id, furigana);

-- 部屋: タイプ追加 + capacity修正
ALTER TABLE rooms
  ADD COLUMN room_type text NOT NULL DEFAULT 'japanese';

ALTER TABLE rooms
  ADD CONSTRAINT valid_room_type
  CHECK (room_type IN ('japanese', 'western', 'mixed', 'other'));

-- capacity=0 の既存データを修正
UPDATE rooms SET capacity = 2 WHERE capacity = 0;
