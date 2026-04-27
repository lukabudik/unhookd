'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IntakeEntry } from '@/lib/store'
import { getPresets } from '@/lib/utils'
import { Frown, Meh, Smile, ChevronDown, ChevronRight, Check, LucideIcon } from 'lucide-react'

type Mood = 'rough' | 'okay' | 'good'

interface DoseLoggerProps {
  onLog: (entry: Omit<IntakeEntry, 'id'>) => Promise<void> | void
  onSuccess?: () => void
  dailyTarget?: number
}

const MOODS: { value: Mood; Icon: LucideIcon; label: string }[] = [
  { value: 'rough', Icon: Frown, label: 'Rough' },
  { value: 'okay', Icon: Meh, label: 'Okay' },
  { value: 'good', Icon: Smile, label: 'Good' },
]

function getNowLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function DoseLogger({ onLog, onSuccess, dailyTarget = 6 }: DoseLoggerProps) {
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [mood, setMood] = useState<Mood | null>(null)
  const [note, setNote] = useState('')
  const [isBackdating, setIsBackdating] = useState(false)
  const [logDateTime, setLogDateTime] = useState(getNowLocal)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const presets = getPresets(dailyTarget)
  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : amount || 0
  const canSubmit = finalAmount > 0

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 10, 30])
    }

    try {
      const timestamp = isBackdating && logDateTime ? new Date(logDateTime) : new Date()
      await onLog({
        amount: finalAmount,
        timestamp,
        mood: mood || undefined,
        note: note.trim() || undefined,
      })
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setAmount(null)
        setCustomAmount('')
        setUseCustom(false)
        setMood(null)
        setNote('')
        setIsBackdating(false)
        setLogDateTime(getNowLocal())
        onSuccess?.()
      }, 1500)
    } catch (err) {
      console.error('Failed to log dose:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
      {showSuccess ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(127, 176, 105, 0.15)',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={36} color="var(--success)" strokeWidth={2.5} />
          </div>
          <p style={{ color: 'var(--success)', fontWeight: 600, fontSize: 18, margin: 0 }}>
            Dose logged
          </p>
          <p
            style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, textAlign: 'center' }}
          >
            Honesty is the first step. You&apos;re doing great.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* Amount section */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Amount
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {presets.map((preset) => {
                const isSelected = !useCustom && amount === preset
                return (
                  <button
                    key={preset}
                    onClick={() => {
                      setAmount(preset)
                      setUseCustom(false)
                    }}
                    style={{
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--surface-elevated)',
                      color: isSelected ? 'var(--bg)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 16,
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    {preset}g
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  setUseCustom(true)
                  setAmount(null)
                }}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: useCustom ? 'rgba(232,168,124,0.1)' : 'var(--surface-elevated)',
                  color: useCustom ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: 15,
                  border: `1px solid ${useCustom ? 'var(--primary)' : 'var(--border)'}`,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
              >
                Custom amount
              </button>
              {useCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{ marginTop: 8 }}
                >
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 0.75"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      height: 52,
                      padding: '0 16px',
                      borderRadius: 12,
                      fontSize: 16,
                      backgroundColor: 'var(--surface-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Mood section */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              How are you feeling?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {MOODS.map(({ value, Icon, label }) => {
                const isSelected = mood === value
                return (
                  <button
                    key={value}
                    onClick={() => setMood(isSelected ? null : value)}
                    style={{
                      height: 60,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? 'rgba(232,168,124,0.15)'
                        : 'var(--surface-elevated)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon
                      size={22}
                      color={isSelected ? 'var(--primary)' : 'var(--text-secondary)'}
                      strokeWidth={1.75}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Note section */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 12,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Note (optional)
            </label>
            <textarea
              placeholder="How are you feeling? What's going on today?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                fontSize: 15,
                lineHeight: 1.5,
                resize: 'none',
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Backdate toggle */}
          <div>
            <button
              onClick={() => setIsBackdating(!isBackdating)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: isBackdating ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 0,
                fontWeight: isBackdating ? 600 : 400,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {isBackdating ? (
                  <ChevronDown size={13} strokeWidth={2} />
                ) : (
                  <ChevronRight size={13} strokeWidth={2} />
                )}
                Log for a different time
              </span>
            </button>
            {isBackdating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: 10 }}
              >
                <input
                  type="datetime-local"
                  value={logDateTime}
                  max={getNowLocal()}
                  onChange={(e) => setLogDateTime(e.target.value)}
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 12px',
                    borderRadius: 12,
                    fontSize: 15,
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: canSubmit ? 'var(--primary)' : 'var(--surface-elevated)',
              color: canSubmit ? 'var(--bg)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: 17,
              border: 'none',
              transition: 'all 0.2s ease',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {isSubmitting ? 'Logging...' : `Log ${finalAmount > 0 ? `${finalAmount}g` : 'dose'}`}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
