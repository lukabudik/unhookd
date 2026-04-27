'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { X } from 'lucide-react'
import { PhaseInfo } from '@/lib/phases'
import { getTodayKey } from '@/lib/utils'

const DISMISS_KEY = 'unhookd_phase_dismissed'

function PhaseIcon({ name, color }: { name: string; color: string }) {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[name]
  if (!Icon) return null
  return <Icon size={22} color={color} strokeWidth={1.75} />
}

export function PhaseGuidanceCard({ phaseInfo }: { phaseInfo: PhaseInfo }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const { date, phase } = JSON.parse(raw)
        if (date === getTodayKey() && phase === phaseInfo.phase) return
      }
    } catch {
      /* ignore */
    }
    setVisible(true)
  }, [phaseInfo.phase])

  function dismiss() {
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ date: getTodayKey(), phase: phaseInfo.phase })
    )
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          style={{ overflow: 'hidden' }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 18,
              padding: '14px 16px',
              border: `1px solid ${phaseInfo.color}35`,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 1 }}>
              <PhaseIcon name={phaseInfo.icon} color={phaseInfo.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: '0 0 3px 0',
                  fontSize: 13,
                  fontWeight: 700,
                  color: phaseInfo.color,
                }}
              >
                {phaseInfo.title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                }}
              >
                {phaseInfo.body}
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
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
