'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <p className="text-6xl font-medium text-danger/20">!</p>
      <h1 className="text-xl font-medium mt-4">エラーが発生しました</h1>
      <p className="text-sm text-text-2 mt-2 text-center">
        問題が解決しない場合は、管理者にお問い合わせください。
      </p>
      <button
        onClick={reset}
        className="mt-6 px-6 py-3 bg-primary text-white rounded-2xl text-sm font-semibold active:scale-[0.97] transition-transform"
      >
        もう一度試す
      </button>
    </div>
  )
}
