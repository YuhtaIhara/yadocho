-- 価格の非負制約（セキュリティ監査で検出）
ALTER TABLE reservations ADD CONSTRAINT valid_prices CHECK (adult_price >= 0 AND child_price >= 0);

-- 検索結果のページネーション用（将来）
-- CREATE INDEX idx_reservations_checkin ON reservations (inn_id, checkin DESC);
