-- checked_in ステータスを復活: scheduled → checked_in → settled のライフサイクル
-- UX設計合意: 予約詳細画面のボタンで遷移。カレンダーバーは紫(#8B7EB8)で表示

ALTER TABLE reservations DROP CONSTRAINT valid_status;
ALTER TABLE reservations ADD CONSTRAINT valid_status CHECK (status IN ('scheduled', 'checked_in', 'settled', 'cancelled'));
