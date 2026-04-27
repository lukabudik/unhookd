'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IntakeEntry } from '@/lib/store'
import { getPresets } from '@/lib/utils'
import { Frown, Meh, Smile, ChevronDown, ChevronUp, Check, LucideIcon } from 'lucide-react'

type Mood = 'rough' | 'okay' | 'good'

interface QuickLogSheetProps {
  isOpen: boolean
  dailyTarget: number
  todayTotal?: number
  lastDoseAt?: Date | null
  onLog: (entry: Omit<IntakeEntry, 'id'>) => Promise<void> | void
  onSuccess: () => void
  onDismiss: () => void
}

const MOODS: { value: Mood; Icon: LucideIcon }[] = [
  { value: 'rough', Icon: Frown },
  { value: 'okay', Icon: Meh },
  { value: 'good', Icon: Smile },
]

export function QuickLogSheet({
  isOpen,
  dailyTarget,
  todayTotal = 0,
  lastDoseAt,
  onLog,
  onSuccess,
  onDismiss,
}: QuickLogSheetProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [note, setNote] = useState('')
  const [showExtras, setShowExtras] = useState(false)
  const [backdateEnabled, setBackdateEnabled] = useState(false)
  const [backdateValue, setBackdateValue] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const presets = getPresets(dailyTarget)
  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : selected || 0

  const lastDoseMinsAgo = lastDoseAt
    ? Math.floor((Date.now() - new Date(lastDoseAt).getTime()) / 60000)
    : null

  const wouldExceed = finalAmount > 0 && dailyTarget > 0 && todayTotal + finalAmount > dailyTarget

  function handleClose() {
    setSelected(null)
    setUseCustom(false)
    setCustomAmount('')
    setMood(null)
    setNote('')
    setShowExtras(false)
    setBackdateEnabled(false)
    setBackdateValue('')
    setIsLogging(false)
    setShowSuccess(false)
    onDismiss()
  }

  async function handleLog() {
    if (!finalAmount || finalAmount <= 0 || isLogging) return

    setIsLogging(true)

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([30, 10, 30])
    }

    let timestamp = new Date()
    if (backdateEnabled && backdateValue) {
      const parsed = new Date(backdateValue)
      if (!isNaN(parsed.getTime())) timestamp = parsed
    }

    try {
      await onLog({
        amount: finalAmount,
        timestamp,
        mood: mood || undefined,
        note: note.trim() || undefined,
      })
      setShowSuccess(true)
      setTimeout(() => {
        setSelected(null)
        setUseCustom(false)
        setCustomAmount('')
        setMood(null)
        setNote('')
        setShowExtras(false)
        setBackdateEnabled(false)
        setBackdateValue('')
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
              maxHeight: '92vh',
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
              {showSuccess ? (
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
                    }}
                  >
                    <Check size={28} color="var(--success)" strokeWidth={2.5} />
                  </div>
                  <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: 17, margin: 0 }}>
                    {finalAmount}g logged
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
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  {/* Title row with mood picker */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                        }}
                      >
                        Log a dose
                      </h2>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          margin: '2px 0 0 0',
                        }}
                      >
                        Target: {dailyTarget}g today
                        {lastDoseMinsAgo !== null && (
                          <span style={{ marginLeft: 8, color: 'var(--primary)' }}>
                            · last{' '}
                            {lastDoseMinsAgo < 60
                              ? `${lastDoseMinsAgo}m`
                              : `${Math.floor(lastDoseMinsAgo / 60)}h ${lastDoseMinsAgo % 60}m`}{' '}
                            ago
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {MOODS.map(({ value, Icon }) => (
                        <button
                          key={value}
                          onClick={() => setMood(mood === value ? null : value)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            backgroundColor:
                              mood === value ? 'rgba(232,168,124,0.15)' : 'var(--bg)',
                            border: `1px solid ${mood === value ? 'var(--primary)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon
                            size={20}
                            color={mood === value ? 'var(--primary)' : 'var(--text-secondary)'}
                            strokeWidth={1.75}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {presets.map((preset) => {
                      const isSelected = !useCustom && selected === preset
                      return (
                        <motion.button
                          key={preset}
                          onClick={() => {
                            setSelected(isSelected ? null : preset)
                            setUseCustom(false)
                          }}
                          whileTap={{ scale: 0.94 }}
                          style={{
                            height: 64,
                            borderRadius: 16,
                            backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg)',
                            color: isSelected ? 'var(--bg)' : 'var(--text-primary)',
                            fontWeight: isSelected ? 800 : 500,
                            fontSize: 20,
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                            transition:
                              'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                            cursor: 'pointer',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {preset}g
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Custom amount */}
                  <div>
                    <button
                      onClick={() => {
                        setUseCustom(!useCustom)
                        if (!useCustom) setSelected(null)
                      }}
                      style={{
                        width: '100%',
                        height: 44,
                        borderRadius: 12,
                        fontSize: 14,
                        cursor: 'pointer',
                        backgroundColor: useCustom ? 'rgba(232,168,124,0.1)' : 'var(--bg)',
                        color: useCustom ? 'var(--primary)' : 'var(--text-secondary)',
                        border: `1px solid ${useCustom ? 'var(--primary)' : 'var(--border)'}`,
                        fontWeight: useCustom ? 600 : 400,
                      }}
                    >
                      Custom amount
                    </button>
                    <AnimatePresence>
                      {useCustom && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="e.g. 2.5"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            autoFocus
                            style={{
                              marginTop: 8,
                              width: '100%',
                              height: 48,
                              padding: '0 14px',
                              borderRadius: 12,
                              fontSize: 16,
                              boxSizing: 'border-box',
                              backgroundColor: 'var(--bg)',
                              color: 'var(--text-primary)',
                              border: '1.5px solid var(--primary)',
                              outline: 'none',
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Over-target gentle notice (non-blocking) */}
                  <AnimatePresence>
                    {wouldExceed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          style={{
                            backgroundColor: 'rgba(232,168,124,0.08)',
                            border: '1px solid rgba(232,168,124,0.25)',
                            borderRadius: 12,
                            padding: '10px 14px',
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                          }}
                        >
                          This would put you over today&apos;s goal. Logging anyway is always the
                          honest choice — no shame in it.
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Log button */}
                  <motion.button
                    onClick={handleLog}
                    disabled={!finalAmount || finalAmount <= 0 || isLogging}
                    animate={{
                      scale: finalAmount > 0 && !isLogging ? 1 : 0.98,
                      opacity: finalAmount > 0 ? 1 : 0.45,
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
                      cursor: finalAmount > 0 ? 'pointer' : 'default',
                    }}
                  >
                    {isLogging
                      ? 'Logging...'
                      : finalAmount > 0
                        ? `Log ${finalAmount}g`
                        : 'Select an amount'}
                  </motion.button>

                  {/* Expandable extras: note + backdate */}
                  <div>
                    <button
                      onClick={() => setShowExtras(!showExtras)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 13,
                        color: showExtras ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: showExtras ? 600 : 400,
                        padding: 0,
                        margin: '0 auto',
                      }}
                    >
                      {showExtras ? (
                        <ChevronUp size={14} strokeWidth={2} />
                      ) : (
                        <ChevronDown size={14} strokeWidth={2} />
                      )}
                      {showExtras ? 'Hide extras' : 'Add note or backdate'}
                    </button>

                    <AnimatePresence>
                      {showExtras && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div
                            style={{
                              paddingTop: 14,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 12,
                            }}
                          >
                            {/* Note */}
                            <div>
                              <p
                                style={{
                                  margin: '0 0 6px 0',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'var(--text-secondary)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                }}
                              >
                                Note
                              </p>
                              <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="How are you feeling? (optional)"
                                rows={2}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: 12,
                                  fontSize: 14,
                                  resize: 'none',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                  backgroundColor: 'var(--bg)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border)',
                                  fontFamily: 'inherit',
                                  lineHeight: 1.5,
                                }}
                              />
                            </div>

                            {/* Backdate */}
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: 6,
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  Log for a different time
                                </p>
                                <button
                                  onClick={() => setBackdateEnabled(!backdateEnabled)}
                                  style={{
                                    width: 40,
                                    height: 22,
                                    borderRadius: 11,
                                    backgroundColor: backdateEnabled
                                      ? 'var(--primary)'
                                      : 'var(--border)',
                                    border: 'none',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'background-color 0.2s ease',
                                  }}
                                >
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: 2,
                                      left: backdateEnabled ? 20 : 2,
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      backgroundColor: 'white',
                                      transition: 'left 0.2s ease',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    }}
                                  />
                                </button>
                              </div>
                              <AnimatePresence>
                                {backdateEnabled && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <input
                                      type="datetime-local"
                                      value={backdateValue}
                                      onChange={(e) => setBackdateValue(e.target.value)}
                                      style={{
                                        width: '100%',
                                        height: 44,
                                        padding: '0 12px',
                                        borderRadius: 12,
                                        fontSize: 14,
                                        boxSizing: 'border-box',
                                        backgroundColor: 'var(--bg)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border)',
                                        fontFamily: 'inherit',
                                      }}
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
