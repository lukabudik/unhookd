'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Smartphone, X } from 'lucide-react'

const DISMISSED_KEY = 'unhookd_install_dismissed'
const DISMISS_DAYS = 14

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<
    (Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null
  >(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already running as installed PWA — don't show
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Check dismissal cooldown
    const dismissed = localStorage.getItem(DISMISSED_KEY)
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return
    }

    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as { MSStream?: unknown }).MSStream
    const safari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua)

    if (ios && safari) {
      setIsIOS(true)
      setShow(true)
      return
    }

    // Android / desktop Chrome — listen for native install event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(
        e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }
      )
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  async function installAndroid() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
            left: 12,
            right: 12,
            zIndex: 500,
            backgroundColor: 'var(--surface)',
            borderRadius: 20,
            border: '1px solid var(--border)',
            padding: '14px 16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            maxWidth: 400,
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {/* App icon */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Smartphone size={22} color="var(--bg)" strokeWidth={1.75} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: '0 0 2px 0',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Add Unhookd to your home screen
              </p>

              {isIOS ? (
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Tap{' '}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      verticalAlign: 'middle',
                    }}
                  >
                    <ShareIcon />
                  </span>{' '}
                  at the bottom of Safari, then{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>"Add to Home Screen"</strong> for
                  the full app experience.
                </p>
              ) : (
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Install for the full app experience — works offline, feels native.
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {!isIOS && (
                  <button
                    onClick={installAndroid}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'var(--primary)',
                      color: 'var(--bg)',
                      fontWeight: 600,
                      fontSize: 13,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Install app
                  </button>
                )}
                <button
                  onClick={dismiss}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 10,
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    flex: isIOS ? 1 : undefined,
                  }}
                >
                  {isIOS ? 'Got it' : 'Not now'}
                </button>
              </div>
            </div>

            <button
              onClick={dismiss}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                lineHeight: 1,
                opacity: 0.6,
                display: 'flex',
              }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline', verticalAlign: 'middle' }}
    >
      <path d="M12 2L12 15" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M8 6L12 2L16 6"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
