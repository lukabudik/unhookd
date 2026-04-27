'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAppStore, TaperPlan } from '@/lib/store'
import { useFirestore } from '@/hooks/useFirestore'
import { useNotifications } from '@/hooks/useNotifications'
import { formatGrams, getDailyTargetForDate, getTodayKey, dateToKey } from '@/lib/utils'

export default function PlanPage() {
  const router = useRouter()
  const { taperPlan } = useAppStore()
  const { updatePlan } = useFirestore()
  const { permission, reminderTime, setReminderTime, requestPermission } = useNotifications()

  const [startAmount, setStartAmount] = useState(taperPlan?.startAmount ?? 8)
  const [targetAmount, setTargetAmount] = useState(taperPlan?.targetAmount ?? 0)
  const [weeksToTarget, setWeeksToTarget] = useState(taperPlan?.weeksToTarget ?? 12)
  const [reasons, setReasons] = useState(taperPlan?.reasons ?? '')
  const [contactName, setContactName] = useState(taperPlan?.emergencyContact?.name ?? '')
  const [contactPhone, setContactPhone] = useState(taperPlan?.emergencyContact?.phone ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(!!reminderTime)
  const [localReminderTime, setLocalReminderTime] = useState(reminderTime || '09:00')

  useEffect(() => {
    if (reminderTime) {
      setReminderEnabled(true)
      setLocalReminderTime(reminderTime)
    }
  }, [reminderTime])

  async function handleToggleReminder() {
    if (!reminderEnabled) {
      if (permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) return
      }
      setReminderEnabled(true)
      setReminderTime(localReminderTime)
    } else {
      setReminderEnabled(false)
      setReminderTime(null)
    }
  }

  function handleReminderTimeChange(time: string) {
    setLocalReminderTime(time)
    if (reminderEnabled) setReminderTime(time)
  }

  useEffect(() => {
    if (taperPlan) {
      setStartAmount(taperPlan.startAmount)
      setTargetAmount(taperPlan.targetAmount)
      setWeeksToTarget(taperPlan.weeksToTarget)
      setReasons(taperPlan.reasons ?? '')
      setContactName(taperPlan.emergencyContact?.name ?? '')
      setContactPhone(taperPlan.emergencyContact?.phone ?? '')
    }
  }, [taperPlan])

  // Build weekly schedule preview
  const weeklySchedule = (() => {
    const steps = []
    const totalDays = weeksToTarget * 7
    const reduction = startAmount - targetAmount

    for (let week = 0; week <= Math.min(weeksToTarget, 12); week++) {
      const day = week * 7
      const dailyTarget = week === weeksToTarget
        ? targetAmount
        : Math.max(targetAmount, startAmount - (reduction / totalDays) * day)
      steps.push({
        week,
        target: Math.round(dailyTarget * 2) / 2,
        label: week === 0 ? 'Start' : week === weeksToTarget ? 'Goal' : `Week ${week}`,
      })
    }
    return steps
  })()

  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)

    const plan: TaperPlan = {
      startAmount,
      targetAmount,
      startDate: taperPlan?.startDate ?? getTodayKey(),
      weeksToTarget,
      currentDailyTarget: 0,
      reasons: reasons.trim() || undefined,
      emergencyContact: contactName.trim()
        ? { name: contactName.trim(), phone: contactPhone.trim() }
        : undefined,
    }

    try {
      await updatePlan(plan)
      setSaved(true)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err) {
      console.error('Failed to save plan:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleHold() {
    if (!taperPlan || isHolding) return
    setIsHolding(true)
    const today = new Date()
    const holdEnd = new Date(today)
    holdEnd.setDate(holdEnd.getDate() + 6) // 7 days inclusive of today
    await updatePlan({
      ...taperPlan,
      holdStartDate: getTodayKey(),
      holdUntil: dateToKey(holdEnd),
    })
    setIsHolding(false)
  }

  async function handleResumeHold() {
    if (!taperPlan || isHolding) return
    setIsHolding(true)
    const { holdUntil: _u, holdStartDate: _s, ...rest } = taperPlan
    await updatePlan(rest)
    setIsHolding(false)
  }

  const holdIsActive = !!(taperPlan?.holdUntil && new Date(taperPlan.holdUntil) >= new Date(getTodayKey()))

  const weeklyReduction = weeksToTarget > 0
    ? (startAmount - targetAmount) / weeksToTarget
    : 0

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 24px',
              gap: 16,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: 'rgba(232,168,124,0.15)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Plan saved!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>
              Your taper schedule is set. Take it one day at a time.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            {/* Header */}
            <div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '0 0 6px 0',
                }}
              >
                {taperPlan ? 'Update your plan' : 'Create your plan'}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                A realistic taper is kinder to your body and more likely to succeed. Go at your pace.
              </p>
            </div>

            {/* Dose calculator */}
            <DoseCalculator onApply={(daily) => { setStartAmount(daily); setTargetAmount(0) }} />

            {/* Starting amount */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
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
                Current daily amount
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={startAmount}
                  onChange={(e) => setStartAmount(parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    accentColor: 'var(--primary)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    borderRadius: 0,
                  }}
                />
                <div
                  style={{
                    minWidth: 60,
                    textAlign: 'right',
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  {formatGrams(startAmount)}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                How much you typically take per day right now
              </p>
            </div>

            {/* Target amount */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
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
                Goal amount
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min={0}
                  max={Math.max(startAmount - 0.5, 1)}
                  step={0.5}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(parseFloat(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    accentColor: 'var(--success)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    borderRadius: 0,
                  }}
                />
                <div
                  style={{
                    minWidth: 60,
                    textAlign: 'right',
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--success)',
                  }}
                >
                  {targetAmount === 0 ? 'Zero' : formatGrams(targetAmount)}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                {targetAmount === 0
                  ? 'Fully quit — a powerful goal. Take it at your pace.'
                  : `Reduce to ${formatGrams(targetAmount)}/day long-term`}
              </p>
            </div>

            {/* Timeline */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
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
                Timeline
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <input
                  type="range"
                  min={2}
                  max={52}
                  step={1}
                  value={weeksToTarget}
                  onChange={(e) => setWeeksToTarget(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    accentColor: 'var(--primary)',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    borderRadius: 0,
                  }}
                />
                <div
                  style={{
                    minWidth: 80,
                    textAlign: 'right',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {weeksToTarget}w
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                Reducing by ~{formatGrams(Math.round(weeklyReduction * 10) / 10)} per week — slow and steady wins
              </p>
            </div>

            {/* Weekly schedule preview */}
            <div>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  margin: '0 0 12px 0',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Your schedule
              </h3>
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 20,
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                {weeklySchedule.slice(0, 8).map((step, i) => (
                  <div
                    key={step.week}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < Math.min(weeklySchedule.length - 1, 7) ? '1px solid var(--border)' : 'none',
                      backgroundColor: step.week === 0 ? 'rgba(232,168,124,0.05)' : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        color: step.week === 0 ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: step.week === 0 ? 600 : 400,
                      }}
                    >
                      {step.label}
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: step.week === weeksToTarget ? 'var(--success)' : 'var(--text-primary)',
                      }}
                    >
                      {formatGrams(step.target)}/day
                    </span>
                  </div>
                ))}
                {weeklySchedule.length > 8 && (
                  <div
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ...and {weeklySchedule.length - 8} more weeks until {formatGrams(targetAmount)}/day
                  </div>
                )}
              </div>
            </div>

            {/* Reminders */}
            {permission !== 'unsupported' && (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 20,
                  padding: 20,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: reminderEnabled ? 16 : 0 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                      Daily reminder
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      {permission === 'denied'
                        ? 'Notifications blocked — enable in browser settings'
                        : 'Get a gentle nudge to log your dose'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleReminder}
                    disabled={permission === 'denied'}
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: reminderEnabled ? 'var(--primary)' : 'var(--border)',
                      border: 'none',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                      opacity: permission === 'denied' ? 0.4 : 1,
                      cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: reminderEnabled ? 23 : 3,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                </div>

                {reminderEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                      Remind me at
                    </label>
                    <input
                      type="time"
                      value={localReminderTime}
                      onChange={(e) => handleReminderTimeChange(e.target.value)}
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 12px',
                        borderRadius: 12,
                        fontSize: 16,
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }}
                    />
                  </motion.div>
                )}
              </div>
            )}

            {/* Reasons — shown in craving modal */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Why are you doing this?
              </label>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                Written to you, for when it gets hard. Shown inside the craving SOS.
              </p>
              <textarea
                value={reasons}
                onChange={(e) => setReasons(e.target.value.slice(0, 280))}
                placeholder={'e.g. "I want to be present for my kids. I\'m tired of planning my day around dosing. I want my mornings back."'}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  resize: 'none',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0 0', textAlign: 'right' }}>
                {280 - reasons.length} chars left
              </p>
            </div>

            {/* Emergency contact */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                My person (optional)
              </label>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Someone to call when it gets really hard. Shown as a call button inside the craving SOS.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={{
                    flex: 1,
                    height: 46,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{
                    flex: 1.4,
                    height: 46,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Hold mode */}
            {taperPlan && (
              <div
                style={{
                  backgroundColor: holdIsActive ? 'rgba(232,168,124,0.08)' : 'var(--surface)',
                  borderRadius: 20,
                  padding: 20,
                  border: `1px solid ${holdIsActive ? 'rgba(232,168,124,0.3)' : 'var(--border)'}`,
                }}
              >
                {holdIsActive ? (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)', margin: '0 0 4px 0' }}>
                      Hold active until {new Date(taperPlan.holdUntil!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                      Your taper is paused at {formatGrams(getDailyTargetForDate(taperPlan, new Date()))} until then. Rest and recover.
                    </p>
                    <button
                      onClick={handleResumeHold}
                      disabled={isHolding}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: 12,
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 14,
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      {isHolding ? 'Updating...' : 'Resume taper now'}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      Need a breather?
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                      Hold at your current dose for 7 days, then resume the taper automatically. No shame in taking a rest.
                    </p>
                    <button
                      onClick={handleHold}
                      disabled={isHolding}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: 12,
                        backgroundColor: 'rgba(232,168,124,0.1)',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        fontSize: 14,
                        border: '1px solid rgba(232,168,124,0.3)',
                        cursor: 'pointer',
                      }}
                    >
                      {isHolding ? 'Setting hold...' : 'Hold for 7 days'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving || startAmount <= targetAmount}
              style={{
                height: 56,
                borderRadius: 16,
                backgroundColor: 'var(--primary)',
                color: 'var(--bg)',
                fontWeight: 700,
                fontSize: 17,
                border: 'none',
                transition: 'all 0.2s ease',
                opacity: isSaving ? 0.7 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : taperPlan ? 'Update plan' : 'Start my journey'}
            </button>

            {startAmount <= targetAmount && (
              <p
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--danger)',
                  margin: '-16px 0 0 0',
                }}
              >
                Goal amount must be less than starting amount
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Dose calculator ──────────────────────────────────────────────────────

function DoseCalculator({ onApply }: { onApply: (dailyLimit: number) => void }) {
  const [open, setOpen] = useState(false)
  const [grams, setGrams] = useState('')
  const [days, setDays] = useState('')

  const gramsNum = parseFloat(grams)
  const daysNum = parseInt(days)
  const dailyLimit = gramsNum > 0 && daysNum > 0 ? Math.round((gramsNum / daysNum) * 10) / 10 : null

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Calculate from what I have</p>
          <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Know your grams remaining? Work backwards to a daily limit.
          </p>
        </div>
        <span style={{ fontSize: 18, color: 'var(--text-secondary)', opacity: 0.6, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grams remaining</p>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 50"
                    value={grams}
                    onChange={e => setGrams(e.target.value)}
                    style={{
                      width: '100%',
                      height: 46,
                      padding: '0 12px',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days to taper</p>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 30"
                    value={days}
                    onChange={e => setDays(e.target.value)}
                    style={{
                      width: '100%',
                      height: 46,
                      padding: '0 12px',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: 15,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {dailyLimit !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    backgroundColor: 'rgba(232,168,124,0.08)',
                    border: '1px solid rgba(232,168,124,0.25)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Recommended daily limit</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 26, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                      {dailyLimit}g / day
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                      Tapering to zero over {daysNum} days ({Math.round(daysNum / 7)} weeks)
                    </p>
                  </div>
                  <button
                    onClick={() => { onApply(dailyLimit); setOpen(false) }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 12,
                      backgroundColor: 'var(--primary)',
                      color: 'var(--bg)',
                      fontWeight: 700,
                      fontSize: 14,
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Use this
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
