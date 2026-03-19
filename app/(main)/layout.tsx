import BottomNav from '@/components/layout/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="max-w-xl mx-auto pb-24 min-h-screen">
        {children}
      </main>
      <BottomNav />
    </>
  )
}
