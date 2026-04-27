'use client'

import { useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { Milestone } from '@/lib/milestones'

interface Props {
  milestone: Milestone | null
  onDismiss: () => void
}

function Particles({ color }: { color: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * 360
        const distance = 80 + Math.random() * 60
        const x = Math.cos((angle * Math.PI) / 180) * distance
        const y = Math.sin((angle * Math.PI) / 180) * distance
        const size = 4 + Math.random() * 6
        const delay = Math.random() * 0.3
        return { x, y, size, delay, angle }
      }),
    []
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      }}
    >
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
          transition={{ delay: p.delay, duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: color,
            transform: 'translate(-50%, -50%)',
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  )
}

export function MilestoneCelebration({ milestone, onDismiss }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (milestone) {
      const t = setTimeout(() => btnRef.current?.focus(), 400)
      return () => clearTimeout(t)
    }
  }, [milestone])

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 8, 6, 0.75)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backdropFilter: 'blur(4px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e1a16',
              borderRadius: 28,
              padding: '36px 28px 28px',
              border: `1px solid ${milestone.accentColor}35`,
              boxShadow: `0 0 60px ${milestone.accentColor}18, 0 20px 60px rgba(0,0,0,0.5)`,
              maxWidth: 320,
              width: '100%',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle glow background */}
            <div
              style={{
                position: 'absolute',
                top: -60,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${milestone.accentColor}15 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />

            {/* Icon with burst particles */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: [0, 1.25, 1], rotate: [-15, 5, 0] }}
                transition={{ delay: 0.15, duration: 0.6, times: [0, 0.6, 1] }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 24,
                  backgroundColor: `${milestone.accentColor}18`,
                  border: `2px solid ${milestone.accentColor}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(() => {
                  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[
                    milestone.icon
                  ]
                  return Icon ? (
                    <Icon size={40} color={milestone.accentColor} strokeWidth={1.5} />
                  ) : null
                })()}
              </motion.div>
              <Particles color={milestone.accentColor} />
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: milestone.accentColor,
                margin: '0 0 10px 0',
                lineHeight: 1.25,
              }}
            >
              {milestone.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              style={{
                fontSize: 15,
                color: 'var(--text-secondary)',
                margin: '0 0 28px 0',
                lineHeight: 1.65,
              }}
            >
              {milestone.message}
            </motion.p>

            <motion.button
              ref={btnRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={onDismiss}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                backgroundColor: milestone.accentColor,
                color: '#1a1612',
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Keep going →
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
