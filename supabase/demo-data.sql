-- yadocho デモデータ（義母テスト + 4/15デモ用）
-- inn_id: 00000000-0000-0000-0000-000000000001 に投入
-- 実行前に既存のデモデータがないことを確認

DO $$
DECLARE
  v_inn_id uuid := '00000000-0000-0000-0000-000000000001';
  v_room1 uuid;
  v_room2 uuid;
  v_guest1 uuid;
  v_guest2 uuid;
  v_guest3 uuid;
  v_guest4 uuid;
  v_guest5 uuid;
  v_res1 uuid;
  v_res2 uuid;
  v_res3 uuid;
  v_res4 uuid;
  v_res5 uuid;
BEGIN
  -- 部屋を取得（既存の部屋を使う。なければ作成）
  SELECT id INTO v_room1 FROM rooms WHERE inn_id = v_inn_id ORDER BY sort_order LIMIT 1;
  IF v_room1 IS NULL THEN
    INSERT INTO rooms (inn_id, name, capacity, sort_order) VALUES (v_inn_id, '松の間', 4, 1) RETURNING id INTO v_room1;
    INSERT INTO rooms (inn_id, name, capacity, sort_order) VALUES (v_inn_id, '竹の間', 3, 2) RETURNING id INTO v_room2;
  ELSE
    SELECT id INTO v_room2 FROM rooms WHERE inn_id = v_inn_id AND id != v_room1 ORDER BY sort_order LIMIT 1;
    IF v_room2 IS NULL THEN v_room2 := v_room1; END IF;
  END IF;

  -- ゲスト5人
  INSERT INTO guests (inn_id, name, phone, address)
  VALUES (v_inn_id, '田中太郎', '090-1234-5678', '東京都新宿区')
  RETURNING id INTO v_guest1;

  INSERT INTO guests (inn_id, name, phone, address)
  VALUES (v_inn_id, '鈴木花子', '080-2345-6789', '長野県長野市')
  RETURNING id INTO v_guest2;

  INSERT INTO guests (inn_id, name, phone, address)
  VALUES (v_inn_id, '佐藤一郎', '070-3456-7890', '大阪府大阪市')
  RETURNING id INTO v_guest3;

  INSERT INTO guests (inn_id, name, phone, address, notes)
  VALUES (v_inn_id, '高橋美咲', '090-4567-8901', '埼玉県さいたま市', 'リピーター。日本酒好き')
  RETURNING id INTO v_guest4;

  INSERT INTO guests (inn_id, name, phone, address, allergy)
  VALUES (v_inn_id, '山本修学旅行団', '026-555-0001', '長野市立東中学校', 'そば')
  RETURNING id INTO v_guest5;

  -- 予約1: 田中太郎 6/5-6/7（2泊）大人2名 ¥8,500/人泊 → 課税対象
  -- 県税: 100×2×2 = 400円, 村税合計: floor(8500×0.035)=297→村税197×2×2 = 788円... いや違う
  -- 正: 合計 = floor(8500*0.035)*2*2 = 297*4 = 1,188 ... 実際はinclusive_percentageで1人1泊ごと計算
  INSERT INTO reservations (inn_id, guest_id, checkin, checkout, adults, children, adult_price, child_price, status)
  VALUES (v_inn_id, v_guest1, '2026-06-05', '2026-06-07', 2, 0, 8500, 0, 'scheduled')
  RETURNING id INTO v_res1;
  INSERT INTO reservation_rooms (reservation_id, room_id) VALUES (v_res1, v_room1);
  -- 食事データ
  INSERT INTO meal_days (reservation_id, date, dinner_adults, breakfast_adults)
  VALUES (v_res1, '2026-06-05', 2, 0), (v_res1, '2026-06-06', 2, 2);

  -- 予約2: 鈴木花子 6/10-6/11（1泊）大人1名 ¥7,000/人泊 → 課税対象
  INSERT INTO reservations (inn_id, guest_id, checkin, checkout, adults, children, adult_price, child_price, status)
  VALUES (v_inn_id, v_guest2, '2026-06-10', '2026-06-11', 1, 0, 7000, 0, 'scheduled')
  RETURNING id INTO v_res2;
  INSERT INTO reservation_rooms (reservation_id, room_id) VALUES (v_res2, v_room2);
  INSERT INTO meal_days (reservation_id, date, dinner_adults, breakfast_adults)
  VALUES (v_res2, '2026-06-10', 1, 1);

  -- 予約3: 佐藤一郎 6/15-6/17（2泊）大人2名 子供1名 ¥10,000/人泊 子供¥5,000 → 大人は課税、子供は免税点未満
  INSERT INTO reservations (inn_id, guest_id, checkin, checkout, adults, children, adult_price, child_price, status)
  VALUES (v_inn_id, v_guest3, '2026-06-15', '2026-06-17', 2, 1, 10000, 5000, 'scheduled')
  RETURNING id INTO v_res3;
  INSERT INTO reservation_rooms (reservation_id, room_id) VALUES (v_res3, v_room1);
  INSERT INTO meal_days (reservation_id, date, dinner_adults, dinner_children, breakfast_adults, breakfast_children)
  VALUES (v_res3, '2026-06-15', 2, 1, 0, 0), (v_res3, '2026-06-16', 2, 1, 2, 1);

  -- 予約4: 高橋美咲 6/20-6/21（1泊）大人1名 ¥5,500/人泊 → 免税点未満（6000円未満）
  INSERT INTO reservations (inn_id, guest_id, checkin, checkout, adults, children, adult_price, child_price, status)
  VALUES (v_inn_id, v_guest4, '2026-06-20', '2026-06-21', 1, 0, 5500, 0, 'scheduled')
  RETURNING id INTO v_res4;
  INSERT INTO reservation_rooms (reservation_id, room_id) VALUES (v_res4, v_room2);

  -- 予約5: 修学旅行 6/25-6/26（1泊）大人0名 → tax_exempt = true（教育活動等）
  -- 実際には引率教員として大人2名分で登録（修学旅行は人数管理が実態と異なるが、デモ用）
  INSERT INTO reservations (inn_id, guest_id, checkin, checkout, adults, children, adult_price, child_price, status, tax_exempt, tax_exempt_reason)
  VALUES (v_inn_id, v_guest5, '2026-06-25', '2026-06-26', 2, 0, 8000, 0, 'scheduled', true, '修学旅行')
  RETURNING id INTO v_res5;
  INSERT INTO reservation_rooms (reservation_id, room_id) VALUES (v_res5, v_room1);
  INSERT INTO reservation_rooms (reservation_id, room_id) VALUES (v_res5, v_room2);

  RAISE NOTICE 'デモデータ投入完了: ゲスト5名、予約5件（うち課税3件、免税点未満1件、修学旅行免除1件）';
END $$;
