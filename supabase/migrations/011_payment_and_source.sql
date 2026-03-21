-- 入金管理 + 予約ソース + 変更履歴

-- 支払方法（精算時に記録）
ALTER TABLE reservations ADD COLUMN payment_method text;  -- 'cash' | 'card' | 'transfer' | 'other'
ALTER TABLE reservations ADD COLUMN payment_note text;    -- 支払メモ（分割払いの詳細等）

-- 予約ソース
ALTER TABLE reservations ADD COLUMN source text DEFAULT 'phone';  -- 'phone' | 'web' | 'booking_com' | 'jalan' | 'airbnb' | 'walk_in' | 'other'

-- 予約変更履歴テーブル
CREATE TABLE reservation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  changed_by text,           -- ユーザー名（将来のマルチユーザー対応用）
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,  -- 変更されたフィールド名
  old_value text,
  new_value text
);

CREATE INDEX idx_reservation_history ON reservation_history (reservation_id, changed_at DESC);
