import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { BottomNav } from '@/components/BottomNav'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Unhookd',
  description: 'Your personal taper companion — calm, steady, one day at a time.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Unhookd',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#1a1612',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
      >
        <Providers>
          <main className="flex-1 pb-safe">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  )
}
