'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/layout/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (!data.session) {
        routerRef.current.replace('/login')
      } else {
        setReady(true)
      }
    }).catch(() => {
      if (mounted) routerRef.current.replace('/login')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) routerRef.current.replace('/login')
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-2">読み込み中…</p>
      </div>
    )
  }

  return (
    <>
      <main className="max-w-xl mx-auto pb-24 min-h-screen animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </>
  )
}
