# Stitch磨きプロンプト集

yadocho v0.2.1 の主要3画面を Google Stitch に通すためのプロンプト。
各画面のスクリーンショットと一緒に貼り付けて使う。

---

## 使い方
1. stitch.withgoogle.com を開く
2. 「Try now」→ ワークスペースに入る
3. 左下のプロンプト入力欄にテキストを貼る
4. スクリーンショットも添付（画像アップロード）
5. 「Design」ボタンで生成
6. 出力が出たらスクリーンショットを撮ってCoworkに共有

---

## 画面1: カレンダー（週表示）

### スクリーンショット
yadocho.com/calendar のスクリーンショットを添付

### プロンプト

```
Redesign this Japanese ryokan (traditional inn) reservation calendar for mobile (390×844px).

KEEP these exact elements:
- Top: "今日" button + month navigation + "休み" toggle
- Segment control: 週 / 2週 / 月
- Room-by-day grid with reservation bars showing guest names
- Bottom: date navigation + reservation list for selected day
- Bottom tab bar: カレンダー / 食事 / 新規予約(FAB) / 請求 / その他

DESIGN DIRECTION — warm Japanese washi-paper aesthetic:
- Background: #FAF6F0 (warm off-white, like washi paper)
- Cards: #F5EDE3 with soft neumorphic shadows (light highlight + soft drop shadow)
- Primary accent: #C4694A (terracotta/rust)
- Reservation bars: #E8A65D (amber) with 8px border-radius, subtle shadow
- Text: #2D2926 for headings (Noto Serif JP), #5C5552 for body (Noto Sans JP)
- All corners rounded (min 8px radius)
- No pure white (#FFFFFF) backgrounds anywhere
- Minimum font size 15px (except bar labels which can be 13px)
- Touch targets minimum 48px

POLISH FOCUS:
- Make reservation bars feel more tactile — subtle gradient or inner shadow
- Add visual breathing room between grid rows
- Make the segment control feel premium (neumorphic inset style)
- Day headers should have subtle weekend coloring (Sat=blue tint, Sun=red tint like current)
- The FAB (+) button should have a warm terracotta shadow glow
- Empty cells should have a subtle "+" affordance on hover/focus
- Today's date should have a clear but not aggressive highlight

Output as mobile-first HTML + Tailwind CSS.
```

---

## 画面2: 予約詳細

### スクリーンショット
yadocho.com/reservations/[any-id] のスクリーンショットを添付（上部＋スクロールした下部の2枚）

### プロンプト

```
Redesign this Japanese ryokan reservation detail page for mobile (390×844px).

CURRENT STRUCTURE (keep all elements):
- Header: ← 予約詳細 + edit icon + status badge (予約済み/チェックイン済/精算済)
- Guest card: Reservation number (No. 260319-002), guest name (様), phone number (tap-to-call)
- Stay card: Room number, guest count (大人2名), date range with nights, arrival time, notes
- Meal card: Dinner/breakfast selections
- Pricing card: Line items (accommodation × people × nights, meals, tax) + total
- Action buttons: チェックインする (primary), 請求書を作成 (secondary), ゲスト詳細を見る (secondary)
- Bottom tab bar

DESIGN DIRECTION — warm Japanese washi-paper aesthetic:
- Background: #FAF6F0
- Cards: #F5EDE3 with neumorphic shadow (6px 6px 12px rgba(180,170,158,0.25), -4px -4px 10px rgba(255,255,255,0.7))
- Card corners: 16px radius
- Status badge colors: 予約済み=#E8A65D, チェックイン済=#5B9A6E, 精算済=#9B9490
- Primary button: #C4694A, full-width, 14px radius, shadow glow
- Typography: headings in Noto Serif JP 500, body in Noto Sans JP 400
- Minimum font 15px, amount text 28px bold
- Touch targets 48px+

POLISH FOCUS:
- Cards should feel like they float above the background (refined shadows)
- Guest name should be the most prominent element (24px Noto Serif JP)
- Phone number should look tappable (underline or icon affordance)
- Pricing section: right-align amounts, use subtle dividers between line items
- Total amount: make it visually dominant (28px, slightly bolder)
- Status badge: pill shape with subtle background tint matching the status color
- Action buttons should have clear visual hierarchy: primary (filled) > secondary (outlined) > tertiary (text-only)
- Add subtle left border to cards (4px, using status color) to create visual flow
- Spacing between cards: 12-16px, consistent rhythm

Output as mobile-first HTML + Tailwind CSS.
```

---

## 画面3: 売上日報（月次レポート）

### スクリーンショット
yadocho.com/report のスクリーンショットを添付（上部＋スクロールした下部の2枚）

### プロンプト

```
Redesign this Japanese ryokan monthly revenue report for mobile (390×844px).

CURRENT STRUCTURE (keep all elements):
- Header: ← 月次レポート + print icon
- Month navigation: < 2026年3月 >
- KPI row (3 cards): 予約数(8), ゲスト数(13), 延べ泊数(12)
- Guest breakdown card: 大人 11名 / 子供 2名
- Revenue breakdown card: 宿泊売上 ¥181,500 / 食事売上 ¥46,300 / その他売上 ¥1,000 / 合計 ¥228,800
- Navigation cards: 売上日報 (daily detail) / 税申告書を出力
- Print button (primary, full-width)
- Bottom tab bar

DESIGN DIRECTION — warm Japanese washi-paper aesthetic:
- Background: #FAF6F0
- Cards: #F5EDE3 with neumorphic shadow
- KPI numbers: #C4694A (terracotta), 28px font, Noto Sans JP Medium
- KPI labels: #9B9490, 15px
- Revenue amounts: right-aligned, #2D2926, 18px Noto Sans JP Medium
- Total: emphasized with slightly larger size or weight

POLISH FOCUS:
- KPI cards should feel like dashboard widgets — clean, scannable at a glance
- Add subtle color coding to KPI numbers (use terracotta #C4694A for emphasis)
- Revenue breakdown: use subtle alternating row backgrounds or hairline dividers
- Total row should stand out (bolder weight, maybe a top border separator)
- 売上日報 and 税申告書 links should look like tappable cards with right-arrow affordance
- Month navigation should feel swipeable (subtle arrow styling)
- Print button: full-width terracotta with icon
- Add visual grouping: KPIs at top → details in middle → actions at bottom
- Consider adding a mini bar chart or sparkline for daily revenue trend (optional enhancement)

Output as mobile-first HTML + Tailwind CSS.
```

---

## 共通メモ

- Stitch出力はHTML+Tailwindが基本。Figma出力も可能だが、HTML→Codeに渡す方が早い
- 出力に満足いかなければ「Make it more warm and organic」「Less flat, more depth」等で微調整
- 色味が崩れたら「Use exactly these colors: bg=#FAF6F0, card=#F5EDE3, primary=#C4694A, text=#2D2926」で矯正
