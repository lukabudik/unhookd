'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface Props {
  isOpen: boolean
  streak: number
  dayNumber: number
  reasons?: string
  emergencyContact?: { name: string; phone: string }
  onResisted: () => void
  onDismiss: () => void
}

const BREATH_PHASES = [
  { text: 'Breathe in...', scale: 1.2, duration: 4000 },
  { text: 'Hold...', scale: 1.2, duration: 2000 },
  { text: 'Breathe out...', scale: 1.0, duration: 4000 },
  { text: '', scale: 1.0, duration: 2000 },
]

export function CravingModal({ isOpen, streak, dayNumber, reasons, emergencyContact, onResisted, onDismiss }: Props) {
  const router = useRouter()
  const [phaseIndex, setPhaseIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idxRef = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    idxRef.current = 0
    setPhaseIndex(0)

    function advance() {
      idxRef.current = (idxRef.current + 1) % BREATH_PHASES.length
      setPhaseIndex(idxRef.current)
      timerRef.current = setTimeout(advance, BREATH_PHASES[idxRef.current].duration)
    }

    timerRef.current = setTimeout(advance, BREATH_PHASES[0].duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isOpen])

  const phase = BREATH_PHASES[phaseIndex]

  function handleLogDose() {
    onDismiss()
    router.push('/log')
  }

  const contextMessage = reasons
    ? reasons
    : streak > 2
    ? `You've stayed on track ${streak} days in a row. One craving won't break you.`
    : dayNumber > 1
    ? `You're on day ${dayNumber} of this journey. Every moment of strength adds up.`
    : "You're just starting. This discomfort means the taper is working."

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 8, 6, 0.9)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 28 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            style={{
              backgroundColor: '#1e1a16',
              borderRadius: 28,
              padding: '32px 24px 24px',
              border: '1px solid rgba(127, 176, 105, 0.18)',
              boxShadow: '0 0 80px rgba(127, 176, 105, 0.07), 0 24px 60px rgba(0,0,0,0.6)',
              maxWidth: 340,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* Header */}
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}
            >
              This will pass.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                margin: '0 0 32px 0',
                lineHeight: 1.6,
              }}
            >
              {contextMessage}
            </motion.p>

            {/* Breathing orb */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: 32,
              }}
            >
              <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 18 }}>
                {/* Outer ring */}
                <motion.div
                  animate={{ scale: phase.scale }}
                  transition={{
                    duration: phase.duration / 1000 * 0.85,
                    ease: phase.scale > 1 ? [0.4, 0, 0.6, 1] : [0.4, 0, 0.6, 1],
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(127, 176, 105, 0.08)',
                    border: '1.5px solid rgba(127, 176, 105, 0.25)',
                  }}
                />
                {/* Inner orb */}
                <motion.div
                  animate={{ scale: phase.scale > 1 ? 0.8 : 1 }}
                  transition={{
                    duration: phase.duration / 1000 * 0.85,
                    ease: [0.4, 0, 0.6, 1],
                  }}
                  style={{
                    position: 'absolute',
                    inset: 22,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 40% 35%, rgba(127, 176, 105, 0.35), rgba(127, 176, 105, 0.12))',
                    border: '1px solid rgba(127, 176, 105, 0.4)',
                  }}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={phaseIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: phase.text ? 1 : 0, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: 'var(--success)',
                    margin: 0,
                    height: 22,
                    letterSpacing: '0.02em',
                  }}
                >
                  {phase.text}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <button
                onClick={onResisted}
                style={{
                  width: '100%',
                  height: 54,
                  borderRadius: 16,
                  backgroundColor: 'var(--success)',
                  color: '#1a1612',
                  fontWeight: 700,
                  fontSize: 16,
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                I rode it out ✓
              </button>
              {emergencyContact?.phone && (
                <a
                  href={`tel:${emergencyContact.phone}`}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(232,168,124,0.1)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: 14,
                    border: '1px solid rgba(232,168,124,0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                  }}
                >
                  📞 Call {emergencyContact.name}
                </a>
              )}
              <button
                onClick={handleLogDose}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: 14,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                I need to log a dose
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
