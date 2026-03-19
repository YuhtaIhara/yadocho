-- yadocho: 初期スキーマ
-- 小規模旅館・民宿向け宿泊管理

-- ── inns ──
CREATE TABLE inns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  address         text,
  phone           text,
  representative  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── user_profiles ──
CREATE TABLE user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  inn_id      uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'owner',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'staff'))
);

-- ── rooms ──
CREATE TABLE rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id      uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  capacity    int NOT NULL DEFAULT 2,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── guests ──
CREATE TABLE guests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id      uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  email       text,
  address     text,
  allergy     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_guests_phone ON guests(inn_id, phone);
CREATE INDEX idx_guests_name ON guests(inn_id, name);

-- ── pricing_config ──
CREATE TABLE pricing_config (
  inn_id                uuid PRIMARY KEY REFERENCES inns(id) ON DELETE CASCADE,
  adult_price           int NOT NULL DEFAULT 8500,
  child_price           int NOT NULL DEFAULT 5000,
  breakfast_price       int NOT NULL DEFAULT 800,
  lunch_price           int NOT NULL DEFAULT 0,
  dinner_price          int NOT NULL DEFAULT 2000,
  child_breakfast_price int NOT NULL DEFAULT 500,
  child_lunch_price     int NOT NULL DEFAULT 0,
  child_dinner_price    int NOT NULL DEFAULT 1500,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── reservations ──
CREATE TABLE reservations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id          uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  room_id         uuid NOT NULL REFERENCES rooms(id),
  guest_id        uuid NOT NULL REFERENCES guests(id),
  group_id        uuid,
  checkin         date NOT NULL,
  checkout        date NOT NULL,
  adults          int NOT NULL DEFAULT 1,
  children        int NOT NULL DEFAULT 0,
  adult_price     int NOT NULL,
  child_price     int NOT NULL DEFAULT 0,
  checkin_time    time,
  status          text NOT NULL DEFAULT 'scheduled',
  tax_exempt      boolean NOT NULL DEFAULT false,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (checkout > checkin),
  CONSTRAINT valid_status CHECK (status IN ('scheduled','checked_in','checked_out','cancelled'))
);
CREATE INDEX idx_res_calendar ON reservations(inn_id, checkin, checkout);
CREATE INDEX idx_res_guest ON reservations(guest_id);
CREATE INDEX idx_res_group ON reservations(group_id) WHERE group_id IS NOT NULL;

-- ── meal_days ──
CREATE TABLE meal_days (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id      uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  date                date NOT NULL,
  dinner_adults       int NOT NULL DEFAULT 0,
  dinner_children     int NOT NULL DEFAULT 0,
  dinner_time         time,
  breakfast_adults    int NOT NULL DEFAULT 0,
  breakfast_children  int NOT NULL DEFAULT 0,
  breakfast_time      time,
  lunch_adults        int NOT NULL DEFAULT 0,
  lunch_children      int NOT NULL DEFAULT 0,
  lunch_time          time,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reservation_id, date)
);

-- ── invoice_items ──
CREATE TABLE invoice_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  category        text NOT NULL DEFAULT 'extra',
  name            text NOT NULL,
  unit_price      int NOT NULL,
  quantity        int NOT NULL DEFAULT 1,
  sort_order      int NOT NULL DEFAULT 0,
  locked          boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN ('stay', 'meal', 'tax', 'extra'))
);

-- ── invoice_presets ──
CREATE TABLE invoice_presets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id      uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  name        text NOT NULL,
  price       int NOT NULL DEFAULT 0,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── blocked_dates ──
CREATE TABLE blocked_dates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id      uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  date        date NOT NULL,
  room_id     uuid REFERENCES rooms(id) ON DELETE CASCADE,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocked ON blocked_dates(inn_id, date);

-- ── tax_periods ──
CREATE TABLE tax_periods (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_id          uuid NOT NULL REFERENCES inns(id) ON DELETE CASCADE,
  rate_percent    numeric(4,2) NOT NULL,
  threshold       int NOT NULL DEFAULT 6000,
  effective_from  date NOT NULL,
  effective_to    date,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ──
ALTER TABLE inns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_periods ENABLE ROW LEVEL SECURITY;

-- user_profiles: 自分のプロフィールのみ
CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- inns: 所属する宿のみ
CREATE POLICY "tenant_inns" ON inns
  FOR ALL USING (
    id IN (SELECT inn_id FROM user_profiles WHERE id = auth.uid())
  );

-- tenant tables: inn_id で制御
CREATE POLICY "tenant_rooms" ON rooms
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_guests" ON guests
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_pricing" ON pricing_config
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_reservations" ON reservations
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_presets" ON invoice_presets
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_blocked" ON blocked_dates
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_tax" ON tax_periods
  FOR ALL USING (inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid()));

-- reservation-dependent tables
CREATE POLICY "tenant_meals" ON meal_days
  FOR ALL USING (
    reservation_id IN (
      SELECT id FROM reservations
      WHERE inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "tenant_invoice_items" ON invoice_items
  FOR ALL USING (
    reservation_id IN (
      SELECT id FROM reservations
      WHERE inn_id = (SELECT inn_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ── updated_at trigger ──
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inns_updated BEFORE UPDATE ON inns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_guests_updated BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pricing_updated BEFORE UPDATE ON pricing_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_meal_days_updated BEFORE UPDATE ON meal_days
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- シードデータ（いちかわ荘）
-- =============================================================================

INSERT INTO inns (id, name, address, phone, representative)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'いちかわ荘',
  '長野県下高井郡野沢温泉村',
  '0269-85-XXXX',
  '市川'
);

INSERT INTO rooms (inn_id, name, capacity, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', '201', 3, 1),
  ('00000000-0000-0000-0000-000000000001', '202', 3, 2),
  ('00000000-0000-0000-0000-000000000001', '203', 4, 3),
  ('00000000-0000-0000-0000-000000000001', '205', 3, 4),
  ('00000000-0000-0000-0000-000000000001', '206', 2, 5),
  ('00000000-0000-0000-0000-000000000001', '207', 2, 6),
  ('00000000-0000-0000-0000-000000000001', '208', 2, 7);

INSERT INTO pricing_config (inn_id)
VALUES ('00000000-0000-0000-0000-000000000001');

INSERT INTO tax_periods (inn_id, rate_percent, threshold, effective_from)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  3.50,
  6000,
  '2026-06-01'
);
