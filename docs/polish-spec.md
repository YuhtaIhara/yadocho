# yadocho UI磨き仕様書 — Code向け

v0.2.1 → v0.2.2（磨き適用）
作成: Cowork / 2026-03-22
ソース: DESIGN.mdデザイントークン + Cowork HTMLモックアップ + Google Stitch出力のレイアウトアイデア

---

## 方針

機能追加なし。CSS/レイアウトの微調整のみ。義母テスト前の見た目品質向上。
変更は3画面に集中: カレンダー / 予約詳細 / 売上日報（月次レポート）

## 共通: 全画面適用

### 1. カードシャドウの統一
現状のカードシャドウがページによってバラつきがある。全カードに統一:
```css
box-shadow: 6px 6px 12px rgba(180,170,158,0.25),
            -4px -4px 10px rgba(255,255,255,0.7);
border: 1px solid rgba(255,255,255,0.5);
```

### 2. カード間スペーシング
カード間を `12px` に統一（現状バラつきあり）

---

## 画面1: /calendar — カレンダー

### 1-1. 予約バーにグラデーション+シャドウ
**現状**: フラット塗り `#E8A65D`
**変更**:
```css
/* scheduled（予約済み）バー */
background: linear-gradient(135deg, #E8A65D 0%, #E09B4E 100%);
box-shadow: 0 2px 6px rgba(232,166,93,0.35),
            inset 0 1px 0 rgba(255,255,255,0.2);

/* checked_in（チェックイン済）バー */
background: linear-gradient(135deg, #5B9A6E 0%, #4F8A60 100%);
box-shadow: 0 2px 6px rgba(91,154,110,0.35),
            inset 0 1px 0 rgba(255,255,255,0.2);
```
バー内テキストに `text-shadow: 0 1px 2px rgba(0,0,0,0.15)` を追加。

### 1-2. セグメントコントロールのネオモーフィズム化
**現状**: プレーンな背景切替
**変更**: 外枠にインセットシャドウ、アクティブタブに浮き上がりシャドウ
```css
/* 外枠 */
.segment-control {
  box-shadow: inset 2px 2px 4px rgba(180,170,158,0.2),
              inset -2px -2px 4px rgba(255,255,255,0.5);
}
/* アクティブタブ */
.segment-item[data-selected="true"] {
  box-shadow: 2px 2px 6px rgba(180,170,158,0.2),
              -2px -2px 4px rgba(255,255,255,0.7);
}
```

### 1-3. 空セルの+アフォーダンス
**現状**: 空セルは完全に空白
**変更**: `+` テキストを `opacity: 0.3` で表示。ホバー/フォーカスで `opacity: 0.6` + 薄い背景色
```css
.empty-cell::after {
  content: '+';
  color: var(--color-text-sub);
  opacity: 0.3;
  font-size: 16px;
  transition: opacity 200ms;
}
.empty-cell:hover::after { opacity: 0.6; }
.empty-cell:hover { background: rgba(232,166,93,0.08); border-radius: 8px; }
```

### 1-4. 日別予約リスト: カード横並びレイアウト（Stitchアイデア）
**現状**: チェックイン/チェックアウト/滞在中が縦積み
**変更**: セクション内のReservationCardを横スクロール可能なフレックスレイアウトに
```css
.day-section-cards {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 4px;
}
.day-section-cards > .reservation-card {
  min-width: 260px;
  flex-shrink: 0;
  scroll-snap-align: start;
}
```
※予約が1件のセクションは従来通りfull-width。2件以上で横スクロール発動。

---

## 画面2: /reservations/:id — 予約詳細

### 2-1. カード左ボーダーにステータスカラー
**変更**: 各カードの `border-left` にステータス色を追加
```css
.detail-card {
  border-left: 4px solid var(--status-color);
}
/* scheduled → --color-booked (#E8A65D) */
/* checked_in → --color-checkin (#5B9A6E) */
/* settled → --color-text-sub (#9B9490) */
```
ゲスト情報カードのみ適用（宿泊情報・食事・料金カードは左ボーダーなし）。

### 2-2. ゲスト名の強調
**現状**: ゲスト名が他テキストと同格に見える
**変更**: `font-size: 24px`, `font-family: var(--font-heading)`, `font-weight: 500`, `line-height: 1.3`

### 2-3. 電話番号のタップアフォーダンス
**現状**: テキストリンク色のみ
**変更**: 破線下線を追加
```css
.phone-link {
  border-bottom: 1px dashed rgba(196,105,74,0.3);
  transition: border-color 200ms;
}
.phone-link:hover { border-bottom-color: var(--color-primary); }
```

### 2-4. 合計金額の視覚的強調
**現状**: 他の金額と同じフォントサイズ
**変更**: `font-size: 28px`, `font-weight: 500` + 上に区切り線
```css
.price-total {
  border-top: 2px solid rgba(0,0,0,0.08);
  padding-top: 12px;
  margin-top: 4px;
}
.price-total .amount {
  font-size: 28px;
  font-weight: 500;
}
```

### 2-5. アクションボタンのレイアウト変更（Stitchアイデア）
**現状**: 全ボタン縦積み
**変更**:
- 「チェックインする」（primary）→ full-width、単独行
- 「請求書を作成」「ゲスト詳細を見る」（secondary）→ **横並び2カラム**
- 「キャンセルにする」（danger text）→ **新規追加**、full-width、テキストのみ

```tsx
<ButtonPrimary fullWidth>チェックインする</ButtonPrimary>
<div style={{ display: 'flex', gap: '10px' }}>
  <ButtonSecondary style={{ flex: 1 }}>請求書を作成</ButtonSecondary>
  <ButtonSecondary style={{ flex: 1 }}>ゲスト詳細を見る</ButtonSecondary>
</div>
<ButtonDanger>キャンセルにする</ButtonDanger>
```
※キャンセルボタンは `status === 'scheduled'` の時のみ表示。

---

## 画面3: /report — 月次レポート

### 3-1. KPI数値をテラコッタ色に
**現状**: KPI数値がデフォルトテキスト色
**変更**: `color: var(--color-primary)` (#C4694A)

### 3-2. ゲスト内訳+売上内訳の2カラム化（Stitchアイデア）
**現状**: 縦に2カード
**変更**: 横並び2カラム
```css
.report-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
```
※各カード内のデータ行はそのまま。カード幅が狭くなるのでフォントサイズはそのまま（15-16px）で収まる。

### 3-3. 日別売上ミニバーチャート追加
**位置**: KPI行と内訳セクションの間
**仕様**:
- 高さ80pxのシンプルな縦棒チャート
- 月の日数分のバー（21日なら21本）
- バーの色: `var(--color-primary)` グラデーション
- 今日のバーはハイライト: `var(--color-booked)`
- ラベル: 5日おきに日付数字（1, 5, 10, 15, 20, 25...）
- Rechartsの `<BarChart>` で実装可
- データ: reservationsテーブルからGROUP BY date集計

### 3-4. リンクカード（売上日報/税申告書）のアフォーダンス強化
**現状**: テキストのみのカード
**変更**: 左にアイコン背景ボックス + 右に `>` 矢印
```tsx
<div className="link-card">
  <div className="link-card-icon">
    <FileText size={20} />
  </div>
  <div className="link-card-text">
    <div className="link-card-title">売上日報</div>
    <div className="link-card-sub">日別の予約売上明細を確認</div>
  </div>
  <ChevronRight size={18} />
</div>
```
```css
.link-card-icon {
  width: 36px; height: 36px;
  background: rgba(196,105,74,0.08);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-primary);
}
```

---

## 実装優先順

1. **共通**（カードシャドウ統一）— 全ページに影響、最初にやる
2. **カレンダー 1-1, 1-2**（バーグラデーション、セグメント）— 第一印象
3. **予約詳細 2-1〜2-5**（左ボーダー、ゲスト名、合計強調、ボタン配置）
4. **売上日報 3-1, 3-2, 3-4**（KPI色、2カラム、リンクカード）
5. **カレンダー 1-3, 1-4**（空セル、横スクロール）— nice to have
6. **売上日報 3-3**（ミニチャート）— nice to have、Recharts依存

## 注意

- DESIGN.mdのデザイントークンは変更しない。CSS変数の値はそのまま
- 禁止事項テーブルに抵触しないこと（特に13px以下フォント、48px未満タッチターゲット）
- background: #FFFFFF は使わない
- font-weight: 700 は使わない
