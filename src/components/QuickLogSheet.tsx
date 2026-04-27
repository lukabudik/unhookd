'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { IntakeEntry } from '@/lib/store'
import { getPresets } from '@/lib/utils'

type Mood = 'rough' | 'okay' | 'good'

interface QuickLogSheetProps {
  isOpen: boolean
  dailyTarget: number
  todayTotal?: number
  onLog: (entry: Omit<IntakeEntry, 'id'>) => Promise<void> | void
  onSuccess: () => void
  onDismiss: () => void
}

const MOODS: { value: Mood; emoji: string }[] = [
  { value: 'rough', emoji: '😣' },
  { value: 'okay', emoji: '😐' },
  { value: 'good', emoji: '🙂' },
]


const HALT_OPTIONS = [
  { key: 'H', label: 'Hungry', emoji: '🍽️' },
  { key: 'A', label: 'Anxious', emoji: '😰' },
  { key: 'L', label: 'Lonely', emoji: '💭' },
  { key: 'T', label: 'Tired', emoji: '😴' },
]

export function QuickLogSheet({ isOpen, dailyTarget, todayTotal = 0, onLog, onSuccess, onDismiss }: QuickLogSheetProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const [isLogging, setIsLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showHalt, setShowHalt] = useState(false)
  const [haltSelected, setHaltSelected] = useState<string[]>([])

  const presets = getPresets(dailyTarget)

  function handleClose() {
    setSelected(null)
    setMood(null)
    setIsLogging(false)
    setShowSuccess(false)
    setShowHalt(false)
    setHaltSelected([])
    onDismiss()
  }

  function toggleHalt(key: string) {
    setHaltSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleLog(skipHalt = false) {
    if (!selected || isLogging) return

    // Show HALT check if this would push them over their daily target
    if (!skipHalt && selected + todayTotal > dailyTarget && dailyTarget > 0) {
      setShowHalt(true)
      return
    }

    setIsLogging(true)
    setShowHalt(false)

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 10, 30])
    }

    try {
      await onLog({
        amount: selected,
        timestamp: new Date(),
        mood: mood || undefined,
      })
      setShowSuccess(true)
      setTimeout(() => {
        setSelected(null)
        setMood(null)
        setIsLogging(false)
        setShowSuccess(false)
        onSuccess()
      }, 900)
    } catch {
      setIsLogging(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 400,
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 401,
              backgroundColor: 'var(--surface)',
              borderRadius: '24px 24px 0 0',
              padding: '12px 20px 40px',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                backgroundColor: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />

            <AnimatePresence mode="wait">
              {showHalt ? (
                <motion.div
                  key="halt"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Quick check-in
                    </h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      You&apos;d be going over today&apos;s goal. That&apos;s okay — just take a breath first. What&apos;s going on?
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {HALT_OPTIONS.map(({ key, label, emoji }) => {
                      const isOn = haltSelected.includes(key)
                      return (
                        <button
                          key={key}
                          onClick={() => toggleHalt(key)}
                          style={{
                            height: 56,
                            borderRadius: 14,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            border: `1px solid ${isOn ? 'var(--primary)' : 'var(--border)'}`,
                            backgroundColor: isOn ? 'rgba(232,168,124,0.1)' : 'var(--bg)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <span style={{ fontSize: 20 }}>{emoji}</span>
                          <span style={{ fontSize: 12, color: isOn ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isOn ? 700 : 400 }}>
                            {label}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, fontStyle: 'italic' }}>
                    These feelings are real and temporary. Logging honestly is always the right move.
                  </p>

                  <button
                    onClick={() => handleLog(true)}
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
                    Log {selected}g anyway
                  </button>
                  <button
                    onClick={() => setShowHalt(false)}
                    style={{
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    Go back
                  </button>
                </motion.div>
              ) : showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '28px 0 16px',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(127, 176, 105, 0.15)',
                      border: '2px solid var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    ✓
                  </div>
                  <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: 17, margin: 0 }}>
                    {selected}g logged
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
                    Honesty is strength. Keep going.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        Quick log
                      </h2>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        Target today: {dailyTarget}g
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {MOODS.map(({ value, emoji }) => (
                        <button
                          key={value}
                          onClick={() => setMood(mood === value ? null : value)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor: mood === value ? 'rgba(232,168,124,0.15)' : 'var(--bg)',
                            border: `1px solid ${mood === value ? 'var(--primary)' : 'var(--border)'}`,
                            fontSize: 20,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 10,
                    }}
                  >
                    {presets.map((preset) => {
                      const isSelected = selected === preset
                      return (
                        <motion.button
                          key={preset}
                          onClick={() => setSelected(isSelected ? null : preset)}
                          whileTap={{ scale: 0.94 }}
                          style={{
                            height: 64,
                            borderRadius: 16,
                            backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg)',
                            color: isSelected ? 'var(--bg)' : 'var(--text-primary)',
                            fontWeight: isSelected ? 800 : 500,
                            fontSize: 20,
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                            cursor: 'pointer',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {preset}g
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Log button */}
                  <motion.button
                    onClick={handleLog}
                    disabled={!selected || isLogging}
                    animate={{
                      scale: selected && !isLogging ? 1 : 0.98,
                      opacity: selected ? 1 : 0.45,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    style={{
                      height: 56,
                      borderRadius: 16,
                      backgroundColor: 'var(--primary)',
                      color: 'var(--bg)',
                      fontWeight: 700,
                      fontSize: 17,
                      border: 'none',
                      cursor: selected ? 'pointer' : 'default',
                    }}
                  >
                    {isLogging ? 'Logging...' : selected ? `Log ${selected}g` : 'Select an amount'}
                  </motion.button>

                  {/* More options link */}
                  <Link
                    href="/log"
                    onClick={handleClose}
                    style={{
                      textAlign: 'center',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      paddingBottom: 4,
                    }}
                  >
                    Add note or custom amount →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
