'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop' | 'installed' | null

type DeferredPrompt = Event & {
  prompt: () => void
  userChoice: Promise<{ outcome: string }>
}

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  if (isStandalone) return 'installed'
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua)
  if (isIOS && isSafari) return 'ios-safari'
  if (isIOS) return 'ios-other'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function Step({ n, children, delay }: { n: number; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'rgba(232,168,124,0.15)',
          border: '1.5px solid rgba(232,168,124,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 800,
          color: 'var(--primary)',
          marginTop: 1,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6, paddingTop: 3 }}>
        {children}
      </div>
    </motion.div>
  )
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        backgroundColor: 'rgba(232,168,124,0.12)',
        border: '1px solid rgba(232,168,124,0.25)',
        borderRadius: 6,
        padding: '1px 6px',
        fontWeight: 600,
        color: 'var(--primary)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// Safari share button SVG (matches the actual iOS icon)
function SafariShareIcon() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 7,
        backgroundColor: 'rgba(232,168,124,0.15)',
        border: '1px solid rgba(232,168,124,0.3)',
        verticalAlign: 'middle',
        margin: '0 3px',
        flexShrink: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L12 15" stroke="#e8a87c" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d="M8 6L12 2L16 6"
          stroke="#e8a87c"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 13V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V13"
          stroke="#e8a87c"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPrompt | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setPlatform(detectPlatform())

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as DeferredPrompt)
    }
    window.addEventListener('beforeinstallprompt', handler)

    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function handleInstallAndroid() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://unhookd.health'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=e8a87c&bgcolor=1a1612&data=${encodeURIComponent(APP_URL)}&margin=16`

  if (installed || platform === 'installed') {
    return (
      <div
        className="page-container"
        style={{
          paddingTop: 60,
          paddingBottom: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 16,
        }}
      >
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <CheckCircle2 size={64} color="var(--success)" strokeWidth={1.5} />
        </motion.div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0' }}>
          You&apos;re all set.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Unhookd is installed on your home screen.
          <br />
          Open it like any other app.
        </p>
        <Link
          href="/"
          style={{
            marginTop: 8,
            display: 'inline-block',
            padding: '14px 32px',
            borderRadius: 14,
            backgroundColor: 'var(--primary)',
            color: 'var(--bg)',
            fontWeight: 700,
            fontSize: 16,
            textDecoration: 'none',
          }}
        >
          Open Unhookd →
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt="Unhookd"
            width={72}
            height={72}
            style={{ borderRadius: 18, marginBottom: 16 }}
          />
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 8px 0',
              lineHeight: 1.2,
            }}
          >
            Add Unhookd to your home screen
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Works like a native app. No App Store needed.
          </p>
        </div>

        {/* ── iOS Safari ── */}
        {platform === 'ios-safari' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Step n={1} delay={0.05}>
              Tap the <SafariShareIcon /> share button at the{' '}
              <strong style={{ color: 'var(--text-primary)' }}>bottom</strong> of your Safari
              browser.
            </Step>
            <Step n={2} delay={0.12}>
              Scroll down in the share sheet and tap <Highlight>Add to Home Screen</Highlight>.
            </Step>
            <Step n={3} delay={0.19}>
              Tap <Highlight>Add</Highlight> in the top-right corner.
            </Step>
            <Step n={4} delay={0.26}>
              Find Unhookd on your home screen and open it like any app.
            </Step>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{
                backgroundColor: 'rgba(232,168,124,0.07)',
                border: '1px solid rgba(232,168,124,0.2)',
                borderRadius: 14,
                padding: '12px 16px',
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              💡 The share button looks like a box with an arrow pointing up (
              <SafariShareIcon />
              ). It&apos;s in the toolbar at the bottom of Safari.
            </motion.div>
          </div>
        )}

        {/* ── iOS but not Safari (Chrome, Firefox etc.) ── */}
        {platform === 'ios-other' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                backgroundColor: 'rgba(224,92,92,0.07)',
                border: '1px solid rgba(224,92,92,0.2)',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <p
                style={{
                  margin: '0 0 6px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#e05c5c',
                }}
              >
                Switch to Safari first
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                On iPhone and iPad, apps can only be added to your home screen from Safari. Copy the
                link below, open Safari, and paste it.
              </p>
            </div>
            <Step n={1} delay={0.05}>
              Copy this address: <Highlight>{APP_URL}</Highlight>
            </Step>
            <Step n={2} delay={0.1}>
              Open <Highlight>Safari</Highlight> and paste it in the address bar.
            </Step>
            <Step n={3} delay={0.15}>
              Tap the <SafariShareIcon /> share button, then{' '}
              <Highlight>Add to Home Screen</Highlight>.
            </Step>
          </div>
        )}

        {/* ── Android ── */}
        {platform === 'android' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {deferredPrompt ? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Tap below to install Unhookd directly — no app store, no waiting.
                </p>
                <button
                  onClick={handleInstallAndroid}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--bg)',
                    fontWeight: 700,
                    fontSize: 17,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Install Unhookd
                </button>
              </>
            ) : (
              <>
                <Step n={1} delay={0.05}>
                  Tap the <Highlight>⋮</Highlight> menu in the top-right corner of Chrome.
                </Step>
                <Step n={2} delay={0.12}>
                  Tap <Highlight>Add to Home screen</Highlight>.
                </Step>
                <Step n={3} delay={0.19}>
                  Tap <Highlight>Add</Highlight> to confirm.
                </Step>
                <Step n={4} delay={0.26}>
                  Open Unhookd from your home screen like any other app.
                </Step>
              </>
            )}
          </div>
        )}

        {/* ── Desktop ── */}
        {platform === 'desktop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 18,
                padding: 20,
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 14,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Scan with your phone to install
              </p>
              {/* QR code */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt="QR code to install Unhookd"
                width={160}
                height={160}
                style={{ borderRadius: 12, display: 'block' }}
              />
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{APP_URL}</p>
            </div>

            <div>
              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Or install on this computer
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Step n={1} delay={0.05}>
                  Look for the <Highlight>⊕</Highlight> or <Highlight>↓</Highlight> install icon in
                  the right side of your browser&apos;s address bar.
                </Step>
                <Step n={2} delay={0.1}>
                  Click it and select <Highlight>Install</Highlight>.
                </Step>
                <Step n={3} delay={0.15}>
                  Unhookd opens in its own window, separate from the browser.
                </Step>
              </div>
            </div>

            {deferredPrompt && (
              <button
                onClick={handleInstallAndroid}
                style={{
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: 'var(--primary)',
                  color: 'var(--bg)',
                  fontWeight: 700,
                  fontSize: 16,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Install on this computer
              </button>
            )}
          </div>
        )}

        {/* Loading state while detecting */}
        {platform === null && (
          <div
            style={{
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: 14,
            }}
          >
            Detecting your device…
          </div>
        )}

        {/* Footer */}
        {platform !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Unhookd is a PWA — it installs like a native app but runs entirely from the web. No App
            Store account needed.
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
