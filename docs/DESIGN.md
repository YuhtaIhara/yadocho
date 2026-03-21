# yadocho UI/UX 実装ガイド

対象: yadocho v0.2.0〜
スタック: React + Supabase（既存）
ペルソナ: 60代女性。スマホはLINEと電話が中心。最小フォント15px、最小タッチターゲット48px

---

## 1. デザイントークン（CSS変数）

以下を `:root` またはグローバルCSSに定義する。全コンポーネントはこの変数だけを参照し、ハードコードしない。

```css
:root {
  /* ── 背景 ── */
  --color-bg:          #FAF6F0;  /* メイン背景（和紙） */
  --color-bg-card:     #F5EDE3;  /* カード背景（生成） */
  --color-bg-secondary:#F0EDE8;  /* セカンダリ背景 */

  /* ── テキスト ── */
  --color-text:        #2D2926;  /* 見出し・重要 (vs bg 14:1) */
  --color-text-body:   #5C5552;  /* 本文 (vs bg 7:1) */
  --color-text-sub:    #9B9490;  /* 補助 (vs bg 3.5:1, AA Large) */

  /* ── アクセント ── */
  --color-primary:     #C4694A;  /* プライマリボタン・FAB */
  --color-primary-hover:#A85638;
  --color-secondary:   #D4856A;  /* セカンダリアクション */

  /* ── ステータス ── */
  --color-checkin:     #5B9A6E;  /* チェックイン・成功 */
  --color-booked:      #E8A65D;  /* 予約済み・注意 */
  --color-staying:     #8B7EB8;  /* 滞在中 */
  --color-error:       #D47B7B;  /* キャンセル・エラー */

  /* ── タイポグラフィ ── */
  --font-heading:      'Noto Serif JP', serif;
  --font-body:         'Noto Sans JP', sans-serif;

  --text-title:    24px;  /* ページタイトル. line-height: 1.3. font: heading Medium */
  --text-section:  18px;  /* セクション見出し. line-height: 1.4. font: body Medium */
  --text-body:     18px;  /* 本文. line-height: 1.6. font: body Regular */
  --text-sub:      15px;  /* 補助・最小. line-height: 1.5. font: body Regular */
  --text-amount:   28px;  /* 金額（大）. line-height: 1.2. font: body Medium */
  --text-button:   17px;  /* ボタンラベル. font: body Medium */

  /* ── スペーシング（8px基準） ── */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:  12px;
  --space-lg:  16px;
  --space-xl:  20px;
  --space-2xl: 24px;
  --space-3xl: 32px;

  /* ── タッチターゲット ── */
  --touch-min:   48px;
  --touch-rec:   56px;
  --touch-fab:   64px;
  --touch-list:  60px;

  /* ── 角丸 ── */
  --radius-sm:   8px;
  --radius-md:  14px;
  --radius-lg:  16px;
  --radius-full: 9999px;

  /* ── 影（ネオモーフィズム軽め） ── */
  --shadow-card:
    6px 6px 12px rgba(180, 170, 158, 0.25),
    -4px -4px 10px rgba(255, 255, 255, 0.7);
  --shadow-button: 0 4px 12px rgba(196, 105, 74, 0.3);

  /* ── アニメーション ── */
  --duration-fast:   120ms;
  --duration-normal: 250ms;
  --duration-slow:   400ms;
  --easing-out:      cubic-bezier(0.0, 0.0, 0.2, 1);
  --easing-in-out:   cubic-bezier(0.4, 0.0, 0.2, 1);

  /* ── レスポンシブ（参照用。メディアクエリで使う） ── */
  /* モバイル: <768px / タブレット: 768-1199px / PC: >=1200px */
  --content-max-width: 960px;
  --sidebar-width: 72px;
  --page-margin: 20px;
}
```

### Google Fonts 読み込み

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&family=Noto+Serif+JP:wght@500&display=swap" rel="stylesheet">
```

---

## 2. 禁止事項

Claude Codeは以下を**絶対にやらない**:

| # | 禁止 | 理由 |
|---|------|------|
| 1 | `font-size` に 13px 以下を使う（14px は本文で許容） | 60代が読めない。例外: BottomNavタブラベル(13px)、カレンダー曜日ヘッダー(13px)、カレンダーバー内ゲスト名(13px) — いずれもスペース制約上の最小値 |
| 2 | `<input type="date">` を使う | React state同期バグ+OS依存UI。独自DatePickerを使う |
| 3 | アイコンだけのボタン（テキストラベルなし） | 高齢者はアイコンの意味を推測できない |
| 4 | スワイプでしか到達できない機能 | 必ずボタン代替を併設 |
| 5 | `#FFFFFF` を背景に使う | 冷たく目が疲れる。`--color-bg` を使う |
| 6 | `font-weight: 700` (Bold) | コントラストが強すぎる。400か500のみ |
| 7 | タッチターゲット 48px 未満 | 指が太い高齢者の誤タップ防止 |
| 8 | プレースホルダーのみのラベル | 入力中に消えて何を入力するか忘れる。常時表示ラベル必須 |
| 9 | 角丸なしの要素 | 最低 `--radius-sm` (8px) をつける |
| 10 | 税額計算を省略する | 現行の致命的バグ。請求書・概算・レポートすべてに宿泊税を含める |

---

## 3. コンポーネント仕様

### 3-A. BottomTabBar

```
ファイル: components/BottomTabBar.tsx
高さ: 64px（env(safe-area-inset-bottom)を加算）
背景: var(--color-bg) + border-top: 1px solid rgba(0,0,0,0.06)
```

タブ5つ:

| index | icon | label | route |
|-------|------|-------|-------|
| 0 | CalendarDays | カレンダー | /calendar |
| 1 | UtensilsCrossed | 食事 | /meals |
| 2 | Plus（FAB） | 新規予約 | /reservations/new |
| 3 | Receipt | 精算 | /billing |
| 4 | Menu | メニュー | /menu |

- active: `color: var(--color-primary)` / inactive: `color: var(--color-text-sub)`
- 各タブの最小タッチ領域: `var(--touch-rec)` × 64px
- 中央FAB: `width/height: var(--touch-fab)`, `background: var(--color-primary)`, `border-radius: var(--radius-full)`, 底辺から12px浮かせる
- アイコンサイズ: 24px。ラベルは12pxではなく **13px**（禁止事項#1の例外）
- **PC (>=1200px)**: BottomTabBarを非表示にし、代わりに `<Sidebar>` を左端に表示。幅 `var(--sidebar-width)`。アイコン＋ラベル縦並び

### 3-B. Card

```
ファイル: components/Card.tsx
Props: { children, variant?: 'default' | 'status', statusColor?: string }
```

```css
.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.card[data-variant="status"] {
  border-left: 4px solid var(--status-color, var(--color-booked));
}
```

### 3-C. ReservationCard

```
ファイル: components/ReservationCard.tsx
Props: {
  guestName: string
  roomNumber: string
  guestCount: { adult: number, child: number }
  nights: number
  phone: string
  status: 'checkin' | 'staying' | 'checkout'
}
```

レイアウト:
```
┌────────────────────────────────┐
│                           [202]│  ← 丸バッジ(32px), bg: var(--color-primary), color: white
│ テスト太郎 様                  │  ← var(--text-section), font-weight: 500
│ 大人1名 · 1泊                  │  ← var(--text-sub), color: var(--color-text-sub)
│ 📞 090-9999-8888               │  ← <a href="tel:090...">。タップで電話発信
└────────────────────────────────┘
```

- min-height: 80px
- 左端ボーダー色: checkin → `var(--color-checkin)`, staying → `var(--color-staying)`, checkout → `var(--color-booked)`
- カード全体が `<Link to={/reservations/:id}>` でタップ可能

### 3-D. ButtonPrimary / ButtonSecondary / ButtonDanger

```
ファイル: components/Button.tsx
Props: { children, variant: 'primary' | 'secondary' | 'danger', onClick, disabled?, fullWidth? }
```

```css
/* primary */
background: var(--color-primary);
color: #FFFFFF;
border-radius: var(--radius-md);
padding: var(--space-lg) 0;
width: 100%;
font-size: var(--text-button);
font-weight: 500;
letter-spacing: 0.04em;
box-shadow: var(--shadow-button);
min-height: var(--touch-rec);
/* active */
transform: scale(0.97);
transition: transform var(--duration-fast) var(--easing-out);

/* secondary */
background: transparent;
color: var(--color-primary);
border: 1.5px solid var(--color-primary);
/* 他はprimaryと同じ */

/* danger */
background: transparent;
color: var(--color-error);
border: none;
font-size: var(--text-sub);
/* テキストリンク風。誤タップ防止のため小さめに */
```

### 3-E. DatePicker（独自実装。`<input type="date">` 禁止）

```
ファイル: components/DatePicker.tsx
Props: {
  mode: 'single' | 'range'
  value: Date | null
  rangeValue?: { start: Date | null, end: Date | null }
  onChange: (date: Date) => void
  onRangeChange?: (range: { start: Date, end: Date }) => void
  availability?: Map<string, 'available' | 'few' | 'full'>  /* YYYY-MM-DD → 空室状態 */
}
```

動作:
- フルスクリーンモーダルで開く
- **縦スクロールで連続した月を表示**（Airbnb方式。月間区切りは月名ヘッダーで）
- 曜日ヘッダー: `日 月 火 水 木 金 土` 固定表示
- 各日付セル: min `44×44px`。タップ可能
- range モード: IN タップ → OUT タップ → 間を自動ハイライト（bg: `var(--color-booked)` 20%透過）
- 今日: 日付数字の下に小さな丸ドット（`var(--color-primary)`、4px）
- 過去日: `opacity: 0.3`, タップ不可
- 空室表示: available=白, few=`var(--color-booked)` 15%透過, full=`var(--color-text-sub)` 15%透過
- 下部に「決定」ボタン（ButtonPrimary）。range モードは start/end 両方選択されるまで disabled

### 3-F. SegmentControl

```
ファイル: components/SegmentControl.tsx
Props: { options: { value: string, label: string }[], selected: string, onChange: (v: string) => void }
```

```css
.segment-control {
  display: inline-flex;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 4px;
}
.segment-item {
  padding: 10px 20px;
  border-radius: calc(var(--radius-md) - 2px);
  font-size: var(--text-sub);
  font-weight: 500;
  color: var(--color-text-sub);
  min-height: var(--touch-min);
  display: flex; align-items: center; justify-content: center;
  transition: all var(--duration-fast) var(--easing-out);
}
.segment-item[data-selected="true"] {
  background: var(--color-bg);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

用途: カレンダーの [週][2週][月] 切替、レポートの期間切替

### 3-G. KpiCard

```
ファイル: components/KpiCard.tsx
Props: {
  label: string       /* "稼働率" "売上" etc */
  value: string       /* "73%" "¥385,000" etc */
  sub?: string        /* "先月比+5%" or "うち新規4" */
  trend?: 'up' | 'down' | 'neutral'
  alert?: boolean     /* trueなら⚠表示 */
  onClick?: () => void
}
```

レイアウト:
- Card コンポーネントをベースにする
- value: `font-size: var(--text-amount)`, `font-weight: 500`, `color: var(--color-text)`
- label: `font-size: var(--text-sub)`, `color: var(--color-text-sub)`, 上に配置
- sub: `font-size: var(--text-sub)`, trend=up → `color: var(--color-checkin)`, trend=down → `color: var(--color-error)`
- alert=true → value の横に `⚠` バッジ（`color: var(--color-booked)`）

### 3-H. MealToggleRow

```
ファイル: components/MealToggleRow.tsx
Props: {
  label: string       /* "朝食" "夕食" */
  enabled: boolean
  count: number
  time: string        /* "07:30" */
  onChange: (enabled: boolean) => void
  onCountChange: (n: number) => void
}
```

- 行全体がタップ可能（トグル領域）
- トグル: 幅52px × 高28px。ON: `var(--color-checkin)`, OFF: `#D1CDC8`
- 行の min-height: `var(--touch-list)`

### 3-I. Toast

```
ファイル: components/Toast.tsx
Props: { message: string, type: 'success' | 'error' }
```

- 上から降りてくるアニメ（`translateY(-100%) → 0`, `var(--duration-normal)`, `var(--easing-out)`）
- 2秒後に `opacity: 0` でフェードアウト
- success: 左に ✓ アイコン, `border-left: 4px solid var(--color-checkin)`
- error: 左に ✕ アイコン, `border-left: 4px solid var(--color-error)`

---

## 4. 画面別実装仕様

### 4-A. /menu — メニュー（ダッシュボード）画面

```
ファイル: pages/MenuPage.tsx
BottomTabBar の index=4
```

構成:
1. **挨拶ヘッダー**: 時間帯で切替（6-11時「おはようございます」/ 11-17時「こんにちは」/ 17時-「おつかれさまです」）+ 宿名（settings.property_name）
2. **今日の概要 KPI 3枚横並び**: チェックイン数 / 滞在中数 / チェックアウト数。タップでカレンダー画面へ遷移
3. **機能メニュー 2列グリッド**: 各セル min 80×80px

```tsx
const menuItems = [
  { icon: ClipboardList, label: '予約一覧', route: '/reservations' },
  { icon: Users,         label: '顧客管理', route: '/guests' },
  { icon: Settings,      label: '設定',     route: '/settings' },
  { icon: BarChart3,     label: 'レポート', route: '/report' },
]
```

KPIデータ取得: 当日の reservations から status でフィルタしてカウント

### 4-B. /calendar — カレンダー画面

```
ファイル: pages/CalendarPage.tsx
BottomTabBar の index=0
```

画面上部に `<SegmentControl options={[{value:'week',label:'週'},{value:'day',label:'日'},{value:'month',label:'月'}]} />`

**① week ビュー（デフォルト）**
- 上部: 曜日ヘッダー（日-土）+ 日付行（横スクロール。`scroll-snap-type: x mandatory`）
- 中部: 部屋×日のグリッド（タイムラインビュー）
  - 行: 各部屋。高さ 44px
  - 列: 7日分
  - 予約バー: `background: var(--color-booked)`, 角丸 `var(--radius-sm)`, 中にゲスト名（14px、バー内のみ14px許容）。タップで予約詳細へ
- 下部: 選択日のチェックイン/滞在中/チェックアウトを `<ReservationCard>` リストで表示

**② day ビュー**
- 日付ナビ: `◀ 3/21（土） 今日 ▶`。◀▶はボタン、左右スワイプでも移動可
- チェックイン/チェックアウト/滞在中をセクション分けしてReservationCardリスト

**③ month ビュー**
- 月カレンダーグリッド（7列×5-6行）
- 各日セルに予約数の小さな数字 or ドット
- 稼働率を背景色の濃淡で表現: 0%=白、50%=`var(--color-booked)` 10%透過、100%=`var(--color-booked)` 30%透過
- 日セルタップ → day ビューに切替

### 4-C. /reservations/new — 新規予約

```
ファイル: pages/ReservationNewPage.tsx
FABボタンから遷移
```

フォーム上から順に:

1. **電話番号**（`<input type="tel">`）: 3桁入力でSupabase guestsテーブルを前方一致検索 → リピーター候補をドロップダウン表示。選択で名前・住所を自動入力
2. **ゲスト名**（テキスト）
3. **人数**（大人 / 子ども。+ - ステッパー。min-height: `var(--touch-rec)`）
4. **日程**（タップで `<DatePicker mode="range">` モーダルを開く）
5. **部屋選択**（空室のみチップ表示。タップで選択。将来: 部屋タイプ名+料金表示）
6. **料金プラン選択**（あれば。pricing_plansテーブルから取得）
7. **食事**（`<MealToggleRow>` ×3: 朝食/昼食/夕食）
8. **料金プレビュー**（自動計算。リアルタイム更新）:
   - 宿泊料 × 人数 × 泊数
   - 食事料 × 人数 × 泊数
   - **宿泊税**（★必須。settingsの税率設定から計算。`effective_from` 以降の日付で課税）
   - 合計
9. **登録ボタン**（`<ButtonPrimary>予約を登録する</ButtonPrimary>`）
10. 成功 → `<Toast type="success">` + カレンダー画面へ戻る

### 4-D. /reservations/:id — 予約詳細

```
ファイル: pages/ReservationDetailPage.tsx
```

- ヘッダー: `← 予約詳細` + 編集ボタン（右上）
- ゲスト情報カード（名前、電話、アレルギー）
- 宿泊情報カード（日程、部屋、人数）
- 食事情報カード（MealToggleRowの表示版）
- 料金カード（プレビューと同じ構成。宿泊税含む）
- アクションボタン群: チェックイン/チェックアウト（ステータスに応じて表示切替）、請求書を見る、電話する

### 4-E. /billing/:id — 請求書

```
ファイル: pages/BillingPage.tsx
```

- 上部: 追加費目の入力（`[ビール ¥500] [お茶 ¥200] [+]` チップ形式）
- 中部: 請求書プレビュー（印刷レイアウト）
  - タイトル: `ご 請 求 書`（`var(--font-heading)`, `var(--text-title)`）
  - 宿名・住所
  - ゲスト名 + 日程 + 部屋
  - 明細テーブル（宿泊料/食事/追加費目）
  - **小計 → 宿泊税（県）→ 宿泊税（村）→ 合計** ★税の行は省略禁止
- 下部: 印刷ボタン + 精算するボタン
- 印刷: `window.print()` + `@media print` CSS で請求書部分のみ表示

### 4-F. /meals — 食事ボード

```
ファイル: pages/MealsPage.tsx
BottomTabBar の index=1
```

- 日付ナビ: `◀ 3/21（土） 今日 ▶`
- 夕食セクション/朝食セクション（reservationsから食事フラグがONのものを自動集計）
- 各行: 部屋番号 + ゲスト名 + 大人数 + 子供数
- **アレルギー警告**: ゲストにallergy_tagsがあれば赤色バッジ `⚠ そばアレルギー` で表示
- 印刷ボタン（厨房向け。`@media print` で最適化）

### 4-G. /report — レポート

```
ファイル: pages/ReportPage.tsx
```

- SegmentControl: [日報][月報]
- KpiCard 2×2グリッド: 稼働率 / 売上 / 予約件数 / 宿泊税合計
- **宿泊税が¥0の場合**: KpiCardに `alert={true}` を渡して⚠表示
- 日報: 日別売上リスト
- 月報: Rechartsで棒グラフ（日別売上推移）

### 4-H. /guests — 顧客管理

```
ファイル: pages/GuestsPage.tsx
```

- 検索バー（名前 or 電話番号）
- リスト: 名前 / 電話 / 来館回数 / 最終来館日 / アレルギー
- タップ → ゲスト詳細（来館履歴一覧）

---

## 5. レスポンシブ対応

```css
/* モバイル (default) */
/* カード1列、BottomTabBar表示 */

/* タブレット */
@media (min-width: 768px) {
  /* カード2列グリッド grid-template-columns: 1fr 1fr */
  /* BottomTabBar表示のまま */
}

/* PC */
@media (min-width: 1200px) {
  /* BottomTabBar → 非表示 */
  /* Sidebar（左端72px）を表示 */
  /* メインコンテンツ: margin-left: var(--sidebar-width); max-width: var(--content-max-width); margin-inline: auto */
  /* カレンダーのタイムラインは横幅を活かして14日表示に */
}
```

---

## 6. アニメーション仕様

CSS/Framer Motion で実装。すべて `prefers-reduced-motion: reduce` 時は無効化する。

| トリガー | 効果 | duration | easing |
|---------|------|----------|--------|
| 画面遷移 | スライドイン（右→左） | `--duration-normal` | `--easing-out` |
| カード展開 | アコーディオン（height: 0 → auto） | 200ms | `--easing-in-out` |
| ボタンタップ | `scale(0.97)` | `--duration-fast` | `--easing-out` |
| FABタップ | `rotate(45deg)` + ripple | 200ms | — |
| ローディング | スケルトンスクリーン（bg: `var(--color-bg-card)` のパルス） | 1.5s loop | — |
| 予約登録成功 | Toast上から降下 + 2秒後フェードアウト | `--duration-normal` | `--easing-out` |
| 精算完了 | カードbg → `var(--color-checkin)` 10%透過 → 元に戻す | 500ms | — |
| エラー | `translateX(3px)` 3回振動 + `border-color: var(--color-error)` | 300ms | — |

---

## 7. アクセシビリティ必須チェック

実装完了後、以下を全画面で確認する:

- [ ] テキスト 15px 以上（例外: BottomNavタブラベル13px / カレンダー曜日ヘッダー13px / カレンダーバー内ゲスト名13px）
- [ ] タッチターゲット 48×48px 以上
- [ ] コントラスト比 WCAG AA (4.5:1) 以上
- [ ] アイコンにテキストラベル併記
- [ ] スワイプ操作にボタン代替あり
- [ ] エラーは色+テキストの両方で表示
- [ ] ローディング中はスケルトンスクリーン（真っ白にしない）
- [ ] フォームは常時表示ラベル（placeholder のみ禁止）
- [ ] 戻るボタン: 全画面で左上に統一
- [ ] 電話番号は `<a href="tel:...">` でタップ発信

---

## 8. 実装順序

### Phase 1: v0.2.0（基盤修正）

1. CSS変数（セクション1）をグローバルに適用
2. Google Fonts（Noto Serif JP + Noto Sans JP）読み込み
3. Button / Card / Toast / SegmentControl コンポーネント作成
4. BottomTabBar のラベル追加 + タッチターゲット拡大
5. `<input type="date">` → `<DatePicker>` 置換
6. **宿泊税バグ修正**: 請求書・予約概算・レポートすべてに税額を反映

### Phase 2: v0.3.0（カレンダー革命）

1. CalendarPage に SegmentControl 追加（週/日/月）
2. 週間タイムラインビュー実装（部屋×日グリッド）
3. 月間ビュー実装（稼働率ヒートマップ）
4. 食事ボードの予約連動自動集計

### Phase 3: v0.4.0（業務機能）

1. 料金の柔軟化（部屋タイプ別 or 曜日別）
2. 請求書の `@media print` 最適化
3. PCレスポンシブ（Sidebar + 2列レイアウト）
4. ゲスト情報の項目追加（メール/ふりがな）
5. MenuPage（ダッシュボード）実装

### Phase 4: v0.5.0（分析・帳票）

1. ReportPage（KpiCard + Recharts）
2. 料理帳票（厨房向け印刷）
3. 稼働率レポート
4. CSVエクスポート

---

## 9. 推奨ライブラリ

| 用途 | ライブラリ | 理由 |
|------|----------|------|
| アニメーション | framer-motion | 宣言的、React向き |
| フォーム | react-hook-form | state同期が堅牢 |
| 日付操作 | date-fns + date-fns/locale/ja | 軽量、tree-shakable |
| チャート | recharts | React native、シンプル |
| アイコン | lucide-react | 軽量、tree-shakable |

タイムラインはまず自作（CSS Grid + scroll-snap）で試す。複雑になったら Planby 検討。

---

## 付録A: 視覚調査エビデンス（2026-03-21）

本ガイドの設計判断は以下の実アプリ/作品をChromeで目視確認した結果に基づく。

| ソース | 確認した内容 | 設計への影響 |
|--------|------------|------------|
| yadocho.com 現行 | 全画面 | タイムライン追加済。税バグ残存 |
| Staysee (ihara.staysee.jp) | PC全画面 | 機能網羅のベンチマーク |
| [Horeca Innity](https://dribbble.com/shots/25891057) (44.8kビュー) | PMSダッシュボード | KPIカード3要素パターン採用 |
| [高齢者向けアプリ](https://dribbble.com/shots/26015382) (Khine Zaw) | シニアUI | 大型アイコングリッド+暖色背景の根拠 |
| Airbnbホストアプリ (公式) | カレンダーUI | 連続スクロール型DatePicker採用 |
| [MediGlobe](https://dribbble.com/shots/27126436) | 予約管理UI | 曜日横スクロール+挨拶ヘッダー採用 |
| [Property Booking](https://dribbble.com/shots/26490827) (Zorg IT) | 日付範囲選択UI | INタップ→OUTタップの範囲選択パターン |
| 和風カフェアプリ (Dribbble) | ベージュ基調UI | カラーパレット方針の妥当性確認 |
