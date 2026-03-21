'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signIn } from '@/lib/auth'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { session, error: err } = await signIn(email, password)
      if (err || !session) {
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }
      router.push('/calendar')
    } catch {
      setError('ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-medium tracking-tight text-primary">yadocho</h1>
          <p className="text-base text-text-2 mt-2">宿泊管理アプリ</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-card border border-border/40 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="メールアドレス"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@example.com"
              autoComplete="email"
            />
            <Input
              label="パスワード"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <p className="text-sm text-danger text-center bg-danger-soft rounded-xl py-2.5 px-4">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'ログイン中…' : 'ログイン'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-text-3 mt-8">yadocho v0.1.0</p>
      </div>
    </div>
  )
}
