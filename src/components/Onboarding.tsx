'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

const ONBOARDED_KEY = 'unhookd_onboarded'

const SLIDES = [
  {
    emoji: null,
    title: "You're not alone in this.",
    body: "Unhookd is a private taper companion for people reducing or quitting kratom. It tracks your doses, supports you through cravings, and helps you understand how your body is responding — one day at a time.",
    accent: 'var(--primary)',
  },
  {
    emoji: '🔒',
    title: 'Your data belongs to you.',
    body: 'Everything you log stays on your device. No account, no tracking, no one can see your data — not even us.\n\nOptional cloud backup is available if you want to sync across devices, but it\'s off by default.',
    accent: 'var(--success)',
  },
  {
    emoji: null,
    title: 'How it works.',
    body: null,
    accent: 'var(--primary)',
    features: [
      { icon: '📋', title: 'Set a plan', detail: 'Tell the app your starting dose and goal — it calculates your daily target automatically.' },
      { icon: '📍', title: 'Log daily', detail: 'Takes 5 seconds. The app tracks your progress, streak, and patterns over time.' },
      { icon: '🌊', title: 'Use SOS when it\'s hard', detail: 'Guided breathing and craving support when you need it most.' },
    ],
  },
  {
    emoji: null,
    title: 'This is genuinely hard.',
    body: "Kratom withdrawal is real. There will be rough days. The app won't judge you for logging an over-target day, missing a day, or needing to hold your dose for a week.\n\nHonesty with yourself is the whole point.",
    accent: '#e8a87c',
  },
]

export function Onboarding() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      setVisible(true)
    }
  }, [])

  function complete() {
    localStorage.setItem(ONBOARDED_KEY, 'true')
    setVisible(false)
  }

  function goToPlan() {
    complete()
    router.push('/plan')
  }

  function skip() {
    complete()
  }

  function next() {
    if (slide < SLIDES.length - 1) {
      setDirection(1)
      setSlide(s => s + 1)
    }
  }

  function prev() {
    if (slide > 0) {
      setDirection(-1)
      setSlide(s => s - 1)
    }
  }

  const current = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Skip */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
            <button
              onClick={skip}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 14,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px 4px',
              }}
            >
              Skip
            </button>
          </div>

          {/* Slide content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 32px', overflow: 'hidden' }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={slide}
                custom={direction}
                initial={{ x: direction * 48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction * -48, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {current.emoji && (
                  <div style={{ fontSize: 56, marginBottom: 24, lineHeight: 1 }}>
                    {current.emoji}
                  </div>
                )}

                {!current.emoji && slide === 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 18,
                        backgroundColor: 'rgba(232,168,124,0.15)',
                        border: '1.5px solid rgba(232,168,124,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 32,
                      }}
                    >
                      🔗
                    </div>
                  </div>
                )}

                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {current.title}
                </h1>

                {current.body && (
                  <p
                    style={{
                      fontSize: 16,
                      color: 'var(--text-secondary)',
                      margin: 0,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {current.body}
                  </p>
                )}

                {current.features && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {current.features.map((f) => (
                      <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            flexShrink: 0,
                          }}
                        >
                          {f.icon}
                        </div>
                        <div>
                          <p style={{ margin: '0 0 3px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {f.title}
                          </p>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {f.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom controls */}
          <div style={{ padding: '0 24px calc(env(safe-area-inset-bottom) + 32px)' }}>
            {/* Dot indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > slide ? 1 : -1); setSlide(i) }}
                  style={{
                    width: i === slide ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === slide ? 'var(--primary)' : 'var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'width 0.2s, background-color 0.2s',
                  }}
                />
              ))}
            </div>

            {isLast ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={goToPlan}
                  style={{
                    width: '100%',
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
                  Set up my plan →
                </button>
                <button
                  onClick={skip}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Explore first
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                {slide > 0 && (
                  <button
                    onClick={prev}
                    style={{
                      height: 56,
                      width: 56,
                      borderRadius: 16,
                      backgroundColor: 'var(--surface)',
                      color: 'var(--text-secondary)',
                      fontSize: 20,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ←
                  </button>
                )}
                <button
                  onClick={next}
                  style={{
                    flex: 1,
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
                  Next →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
