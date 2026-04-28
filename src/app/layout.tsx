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
  description:
    'A private taper companion for reducing kratom. Guided plan, daily tracking, craving support, and phase-aware guidance — no account, no email, free forever.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Unhookd',
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
  openGraph: {
    title: 'Unhookd — Kratom Taper Companion',
    description:
      'Guided taper plan, daily dose tracking, craving SOS, and phase-aware guidance from taper through PAWS. 100% private — no account, no email, free forever.',
    url: 'https://unhookd.health',
    siteName: 'Unhookd',
    images: [{ url: 'https://unhookd.health/og-image.png', width: 1200, height: 628 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unhookd — Kratom Taper Companion',
    description:
      'Guided taper plan, daily tracking, craving SOS, and PAWS guidance. 100% private — no account, no email, free forever.',
    images: ['https://unhookd.health/og-image.png'],
  },
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
    <html lang="en" className={`${geistSans.variable} h-full`} suppressHydrationWarning>
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
