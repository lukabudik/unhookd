'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { X, AlertTriangle } from 'lucide-react'
import { Supplement } from '@/lib/phases'

function SupplementIcon({ name }: { name: string }) {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[name]
  if (!Icon) return null
  return <Icon size={18} color="var(--primary)" strokeWidth={1.75} />
}

export function SymptomSuggestionsCard({ supplements }: { supplements: Supplement[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  if (supplements.length === 0 || dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 18,
        padding: '16px',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LucideIcons.Pill size={16} color="var(--text-secondary)" strokeWidth={1.75} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Supports for your recent symptoms
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            opacity: 0.6,
            display: 'flex',
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {supplements.map((s) => {
          const isExpanded = expandedId === s.id
          return (
            <div
              key={s.id}
              onClick={() => setExpandedId(isExpanded ? null : s.id)}
              style={{
                backgroundColor: 'var(--bg)',
                borderRadius: 12,
                padding: '10px 12px',
                border: `1px solid ${isExpanded ? 'rgba(232,168,124,0.3)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SupplementIcon name={s.icon} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {s.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                      {s.dose} · {s.timing}
                    </p>
                  </div>
                </div>
                <LucideIcons.ChevronDown
                  size={14}
                  color="var(--text-secondary)"
                  strokeWidth={2}
                  style={{
                    flexShrink: 0,
                    opacity: 0.5,
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p
                      style={{
                        margin: '10px 0 0 0',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.65,
                      }}
                    >
                      {s.why}
                    </p>
                    {s.caution && (
                      <p
                        style={{
                          margin: '6px 0 0 0',
                          fontSize: 11,
                          color: '#e8a87c',
                          lineHeight: 1.5,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={11} strokeWidth={2} color="#e8a87c" />
                          {s.caution}
                        </span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <p
        style={{
          margin: '12px 0 0 0',
          fontSize: 11,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        Based on your recent check-ins. Not medical advice — talk to your doctor, especially about
        prescription options like clonidine (sweating/anxiety) or hydroxyzine (sleep/anxiety) which
        are effective and underused.
      </p>
    </motion.div>
  )
}
