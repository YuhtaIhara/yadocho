'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils/cn'

const sections = [
  {
    title: 'はじめに',
    items: [
      { q: 'ログイン方法', a: 'ブラウザ（インターネットを見るアプリ）で yadocho.com を開き、メールアドレスとパスワードを入力して「ログイン」をタップ（指で軽く触れる）します。' },
      { q: 'ホーム画面に追加するには', a: '宿帳を開いた状態で、ブラウザのメニューから「ホーム画面に追加」を選んで「追加」をタップすると、次からはホーム画面のアイコンをタップするだけで開けます。' },
    ],
  },
  {
    title: '基本の流れ',
    items: [
      { q: '', a: '①予約を受けたら → 画面下の「＋」ボタンから新規予約を登録\n②当日の確認 → カレンダーで今日のチェックイン・チェックアウトを確認\n③食事の準備 → 食事ボードで今日の食事人数と内容を確認\n④お帰りの際 → 請求画面から請求書を作って精算' },
    ],
  },
  {
    title: 'カレンダー',
    items: [
      { q: '見かた', a: '色のついたバーが予約です。日付をタップするとその日のチェックイン・チェックアウトが下に表示されます。' },
      { q: '月を切り替える', a: '「2026年3月」のような月の表示をタップすると月の選択画面が出ます。' },
      { q: '休業日を設定する', a: '右上の「休業設定」をタップして休業モードの ON/OFF（入/切）を切り替えます。' },
    ],
  },
  {
    title: '予約を作成する',
    items: [
      { q: '入力する項目', a: '電話番号（必須）→ 以前泊まったことがあるお客様なら名前や住所が自動で入ります。日程・部屋・人数・食事・宿泊税を設定して「予約を登録」をタップ。' },
      { q: 'メモを残す', a: '「メモ」欄に備考や連絡事項を書いておけます。お客様の到着手段や特別なリクエストなど。' },
      { q: '非課税にするには', a: '予約作成画面の「宿泊税」セクションで「非課税にする」にチェック（□をタップして✓を入れる）。理由（修学旅行など）も入力できます。' },
    ],
  },
  {
    title: '食事ボード',
    items: [
      { q: '見かた', a: '今日の食事人数が朝食・昼食・夕食ごとに表示されます。「＜」「＞」で日付を切り替えられます。' },
      { q: '献立を入力する', a: '画面上の「今日の献立を入力...」にその日のメニューを書いておけます。' },
      { q: '印刷する', a: '右上のプリンターマークをタップすると、食事一覧を印刷できます。' },
    ],
  },
  {
    title: '請求・精算',
    items: [
      { q: '請求書を見る', a: 'チェックアウト日の予約が「未精算」として表示されます。「請求書を見る」をタップ。' },
      { q: '追加費目を足す', a: '請求書の上にあるボタン（ビール・お茶など）をタップするか、品目名と単価を入力して「追加」。' },
      { q: '精算する', a: '金額を確認したら「精算する」をタップして完了です。' },
    ],
  },
  {
    title: 'ゲスト管理',
    items: [
      { q: 'ゲストを探す', a: '検索バーに名前や電話番号を入力するとすぐに絞り込めます。' },
      { q: '情報を編集する', a: 'ゲスト名をタップ → 右上の鉛筆マークをタップすると、名前・住所・アレルギー・メモを編集できます。' },
      { q: 'ゲストを削除する', a: 'ゲスト詳細の下にある「ゲストを削除」をタップ。宿泊履歴がある場合は関連する予約も一緒に削除されますのでご注意ください。' },
    ],
  },
  {
    title: '設定',
    items: [
      { q: '宿の情報', a: '宿名・代表者名・住所・電話番号を変更して「保存」をタップ。' },
      { q: '部屋管理', a: '部屋の追加・削除ができます。' },
      { q: '料金設定', a: '宿泊料（大人・子供）と食事料金を設定します。' },
      { q: '追加費目', a: '請求書で使えるプリセット（よく使う追加料金の登録）を管理します。' },
      { q: '宿泊税', a: '税率と免税点を期間ごとに設定できます。' },
    ],
  },
  {
    title: 'よくある操作',
    items: [
      { q: '予約をキャンセルするには', a: 'カレンダーで予約をタップ → 予約詳細の下の方で「キャンセルにする」をタップ。' },
      { q: '予約を削除するには', a: '予約詳細の一番下にある「削除」をタップ。' },
      { q: '食事の内容を変えるには', a: '予約詳細の「食事」欄にある鉛筆マークをタップすると、人数や時間を変更できます。' },
      { q: '料金を変更するには', a: 'その他 → 設定 → 料金設定で変更。変更後に作成した予約から新しい料金が適用されます。' },
    ],
  },
  {
    title: '困ったときは',
    items: [
      { q: '画面が動かない', a: '画面を下に引っ張って離すとページが更新されます。それでもダメならブラウザのタブを閉じて開き直してください。' },
      { q: 'ログインできない', a: 'メールアドレスとパスワードを確認してください。パスワードを忘れた場合は管理者までお問い合わせください。' },
      { q: '間違って操作した', a: '予約の削除は取り消せません。もう一度新規予約を作成してください。困ったことがあれば管理者にお問い合わせください。' },
    ],
  },
]

export default function GuideView() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['はじめに', '基本の流れ']))

  function toggleSection(title: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  return (
    <div>
      <PageHeader title="使い方ガイド" />

      <div className="px-4 py-4 pb-32 flex flex-col gap-2">
        {sections.map(section => {
          const isOpen = openSections.has(section.title)
          return (
            <div key={section.title} className="bg-surface rounded-2xl border border-border/40 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between p-4 active:bg-primary-soft/50 transition-colors"
              >
                <span className="text-sm font-bold flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-primary" />
                  {section.title}
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    'text-text-3 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 flex flex-col gap-3 animate-fade-in">
                  {section.items.map((item, i) => (
                    <div key={i} className="bg-background rounded-xl p-3">
                      {item.q && <p className="text-sm font-semibold mb-1">{item.q}</p>}
                      <p className="text-sm text-text-2 whitespace-pre-line leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <p className="text-center text-xs text-text-3 mt-4">yadocho v0.1.0</p>
      </div>
    </div>
  )
}
