import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <p className="text-6xl font-bold text-primary/20">404</p>
      <h1 className="text-xl font-bold mt-4">ページが見つかりません</h1>
      <p className="text-sm text-text-2 mt-2 text-center">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/calendar"
        className="mt-6 px-6 py-3 bg-primary text-white rounded-2xl text-sm font-semibold active:scale-[0.97] transition-transform"
      >
        カレンダーに戻る
      </Link>
    </div>
  )
}
