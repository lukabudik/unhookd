'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useNotifications } from '@/hooks/useNotifications'
import { formatGrams, getDaysSincePlanStart, getDailyTargetForDate } from '@/lib/utils'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  RotateCcw,
} from 'lucide-react'
import { getOrCreateRecoveryCode, setRecoveryCode, normalize, isValidCode } from '@/lib/recovery'
import pkg from '../../../package.json'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '0 0 10px 4px',
        }}
      >
        {title}
      </p>
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 18,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  onClick,
  href,
  danger,
  children,
  noBorder,
}: {
  label: string
  value?: string
  onClick?: () => void
  href?: string
  danger?: boolean
  children?: React.ReactNode
  noBorder?: boolean
}) {
  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: noBorder ? 'none' : '1px solid var(--border)',
        cursor: onClick || href ? 'pointer' : 'default',
        gap: 12,
      }}
      onClick={onClick}
    >
      <span
        style={{
          fontSize: 15,
          color: danger ? '#e05a5a' : 'var(--text-primary)',
          fontWeight: 500,
          flex: 1,
        }}
      >
        {label}
      </span>
      {children ?? (
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {value}
          {(onClick || href) && (
            <ChevronRight size={14} strokeWidth={2} style={{ marginLeft: 4, opacity: 0.4 }} />
          )}
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </Link>
    )
  }
  return inner
}

export default function SettingsPage() {
  const router = useRouter()
  const { taperPlan } = useAppStore()
  const { permission, reminderTime, setReminderTime, requestPermission } = useNotifications()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [notifStatus, setNotifStatus] = useState<string>('')
  const [recoveryCode, setLocalCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [restoreInput, setRestoreInput] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    setReminderEnabled(!!reminderTime)
    if (permission === 'granted') setNotifStatus('Enabled')
    else if (permission === 'denied') setNotifStatus('Blocked by browser')
    else if (permission === 'unsupported') setNotifStatus('Not supported')
    else setNotifStatus('Not enabled')
    setLocalCode(getOrCreateRecoveryCode())
  }, [permission, reminderTime])

  function copyCode() {
    navigator.clipboard.writeText(recoveryCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRestoreInput(val: string) {
    setRestoreInput(normalize(val))
    setRestoreError('')
  }

  function handleRestore() {
    const code = normalize(restoreInput)
    if (!isValidCode(code)) {
      setRestoreError('Invalid code. Format should be XXXX-XXXX-XXXX.')
      return
    }
    if (code === recoveryCode) {
      setRestoreError("That's already your current code.")
      return
    }
    setRestoring(true)
    // Clear all local app data so Firestore is the clean source of truth
    // after the new recovery code takes effect on reload.
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('unhookd_') && k !== 'unhookd_recovery_code') keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    setRecoveryCode(code)
    window.location.href = '/'
  }

  async function handleToggleReminder() {
    if (reminderEnabled) {
      setReminderTime(null)
      setReminderEnabled(false)
      return
    }
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }
    setReminderTime('09:00')
    setReminderEnabled(true)
  }

  function exportData() {
    if (typeof window === 'undefined') return
    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      appVersion: pkg.version,
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('unhookd_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key)!)
        } catch {
          data[key] = localStorage.getItem(key)
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `unhookd-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 2500)
  }

  function resetAllData() {
    if (typeof window === 'undefined') return
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('unhookd_')) keys.push(key)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    setShowResetConfirm(false)
    window.location.href = '/'
  }

  const daysSince = taperPlan ? getDaysSincePlanStart(taperPlan.startDate) : 0
  const todayTarget = taperPlan ? getDailyTargetForDate(taperPlan, new Date()) : null

  return (
    <>
      {/* Reset confirmation modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 100,
                backdropFilter: 'blur(4px)',
              }}
              onClick={() => setShowResetConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'var(--surface)',
                borderRadius: '24px 24px 0 0',
                padding: '28px 24px 40px',
                zIndex: 101,
                maxWidth: 430,
                margin: '0 auto',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                  <AlertTriangle size={40} color="#e05a5a" strokeWidth={1.75} />
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px 0',
                  }}
                >
                  Reset all data?
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  This will permanently delete your taper plan, all dose history, milestones, and
                  settings. This cannot be undone.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={resetAllData}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 14,
                    backgroundColor: '#e05a5a',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Yes, delete everything
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: 14,
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 15,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Export success toast */}
      <AnimatePresence>
        {exportDone && (
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              position: 'fixed',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              backgroundColor: 'var(--success)',
              color: '#1a1612',
              borderRadius: 14,
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: 'nowrap',
              boxShadow: '0 8px 32px rgba(127,176,105,0.35)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} strokeWidth={2.5} />
              Data exported successfully
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-container" style={{ paddingTop: 16, paddingBottom: 32 }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <button
              onClick={() => router.back()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="Go back"
            >
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Settings
            </h1>
          </div>

          {/* Reminders section */}
          <Section title="Reminders">
            <Row label="Notifications" value={notifStatus} noBorder={permission !== 'granted'} />
            {permission === 'default' && (
              <div style={{ padding: '0 16px 14px' }}>
                <button
                  onClick={handleToggleReminder}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 12,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--bg)',
                    fontWeight: 600,
                    fontSize: 14,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Enable notifications
                </button>
              </div>
            )}
            {permission === 'granted' && (
              <div
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: reminderEnabled ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                  Daily reminder
                </span>
                <button
                  onClick={handleToggleReminder}
                  aria-label={reminderEnabled ? 'Disable reminder' : 'Enable reminder'}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: reminderEnabled ? 'var(--primary)' : 'var(--border)',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: reminderEnabled ? 22 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    }}
                  />
                </button>
              </div>
            )}
            {permission === 'denied' && (
              <div style={{ padding: '0 16px 14px' }}>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Notifications are blocked. To enable them, go to your browser or phone settings
                  and allow notifications for this site.
                </p>
              </div>
            )}
          </Section>

          {/* Your Plan section */}
          <Section title="Your Taper Plan">
            {taperPlan ? (
              <>
                <Row
                  label="Starting dose"
                  value={formatGrams(taperPlan.startAmount)}
                  noBorder={false}
                />
                <Row
                  label="Today's target"
                  value={todayTarget !== null ? formatGrams(todayTarget) : '—'}
                  noBorder={false}
                />
                <Row
                  label="Goal dose"
                  value={
                    taperPlan.targetAmount === 0
                      ? 'Zero (quit)'
                      : formatGrams(taperPlan.targetAmount)
                  }
                  noBorder={false}
                />
                <Row
                  label="Timeline"
                  value={(() => {
                    const d =
                      taperPlan.daysToTarget !== undefined
                        ? taperPlan.daysToTarget
                        : taperPlan.weeksToTarget * 7
                    if (d === 0) return 'Cold turkey'
                    if (d % 7 === 0) return `${d / 7} weeks`
                    return `${d} days`
                  })()}
                  noBorder={false}
                />
                <Row label="Day in journey" value={`Day ${daysSince + 1}`} noBorder={false} />
                <Row
                  label="Started"
                  value={format(new Date(taperPlan.startDate), 'MMM d, yyyy')}
                  noBorder={false}
                />
                <Row label="Edit plan" href="/plan" noBorder />
              </>
            ) : (
              <Row label="No plan set up yet" href="/plan" noBorder />
            )}
          </Section>

          {/* Recovery code section */}
          <Section title="Device recovery">
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <KeyRound size={16} color="var(--primary)" strokeWidth={1.75} />
                <p
                  style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  Your recovery code
                </p>
              </div>
              <p
                style={{
                  margin: '0 0 14px 0',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                This is the only way to access your data on a new device. Write it down somewhere
                safe — we can&apos;t recover it for you.
              </p>

              {/* Code display */}
              <div
                style={{
                  backgroundColor: 'var(--bg)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {recoveryCode || '···· ···· ····'}
                </span>
                <button
                  onClick={copyCode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 10,
                    flexShrink: 0,
                    backgroundColor: copied ? 'rgba(127,176,105,0.12)' : 'var(--surface)',
                    border: `1px solid ${copied ? 'rgba(127,176,105,0.3)' : 'var(--border)'}`,
                    color: copied ? 'var(--success)' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={13} strokeWidth={2.5} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} strokeWidth={2} /> Copy
                    </>
                  )}
                </button>
              </div>

              {/* Restore toggle */}
              <button
                onClick={() => {
                  setShowRestore(!showRestore)
                  setRestoreInput('')
                  setRestoreError('')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 13,
                  color: showRestore ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: showRestore ? 600 : 400,
                }}
              >
                <RotateCcw size={13} strokeWidth={2} />
                Restore from another device
              </button>

              <AnimatePresence>
                {showRestore && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      <input
                        type="text"
                        placeholder="XXXX-XXXX-XXXX"
                        value={restoreInput}
                        onChange={(e) => handleRestoreInput(e.target.value)}
                        maxLength={14}
                        style={{
                          width: '100%',
                          height: 46,
                          padding: '0 14px',
                          borderRadius: 12,
                          fontSize: 16,
                          fontFamily: 'monospace',
                          letterSpacing: '0.08em',
                          boxSizing: 'border-box',
                          backgroundColor: 'var(--bg)',
                          color: 'var(--text-primary)',
                          border: `1px solid ${restoreError ? 'var(--danger)' : 'var(--border)'}`,
                        }}
                      />
                      {restoreError && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>
                          {restoreError}
                        </p>
                      )}
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                        }}
                      >
                        This replaces your current data with the data from the entered code. Your
                        current data will no longer be accessible.
                      </p>
                      <button
                        onClick={handleRestore}
                        disabled={restoreInput.length < 14 || restoring}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          fontWeight: 600,
                          fontSize: 14,
                          border: 'none',
                          cursor: restoreInput.length >= 14 && !restoring ? 'pointer' : 'default',
                          backgroundColor:
                            restoreInput.length >= 14 ? 'var(--primary)' : 'var(--surface)',
                          color: restoreInput.length >= 14 ? 'var(--bg)' : 'var(--text-secondary)',
                          opacity: restoring ? 0.7 : 1,
                        }}
                      >
                        {restoring ? 'Restoring…' : 'Restore my data'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Section>

          {/* Data section */}
          <Section title="Data">
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
              }}
              onClick={exportData}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>
                  Export my data
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    JSON <ChevronRight size={13} strokeWidth={2} style={{ opacity: 0.4 }} />
                  </span>
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0 0',
                  lineHeight: 1.4,
                }}
              >
                Download all your dose history, plan, and settings
              </p>
            </div>
            <div
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
              }}
              onClick={() => setShowResetConfirm(true)}
            >
              <span style={{ fontSize: 15, color: '#e05a5a', fontWeight: 500 }}>
                Reset all data
              </span>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0 0',
                  lineHeight: 1.4,
                }}
              >
                Delete your plan, history, and all settings
              </p>
            </div>
          </Section>

          {/* About section */}
          <Section title="About">
            <Row label="App" value="Unhookd" noBorder={false} />
            <Row label="Version" value={pkg.version} noBorder={false} />
            <Row label="Purpose" value="Gentle taper tracking" noBorder={false} />
            <Row label="Install on home screen" href="/install" noBorder={false} />
            <Row label="Privacy & Disclaimer" href="/privacy" noBorder />
          </Section>

          <p
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: '4px 0 0 0',
              fontStyle: 'italic',
            }}
          >
            Your logs are stored on this device. Anonymous usage data — no name, email, or
            identifying information — is shared to help understand what supports kratom recovery.
          </p>
        </motion.div>
      </div>
    </>
  )
}
