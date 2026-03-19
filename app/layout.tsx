import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: '宿帳 — 宿泊管理',
  description: '小規模旅館・民宿向け 宿泊管理アプリ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={noto.variable}>
      <body className={noto.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
