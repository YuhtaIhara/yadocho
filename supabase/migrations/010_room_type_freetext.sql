-- room_type をフリーテキストに変更（和室/洋室/和洋室/禁煙 etc 自由入力）
-- 既存の英語値を日本語に変換

UPDATE rooms SET room_type = CASE room_type
  WHEN 'japanese' THEN '和室'
  WHEN 'western' THEN '洋室'
  WHEN 'mixed' THEN '和洋室'
  WHEN 'other' THEN 'その他'
  ELSE room_type
END;

ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_type_check;
ALTER TABLE rooms ALTER COLUMN room_type SET DEFAULT '和室';
