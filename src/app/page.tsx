'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { TaperProgress } from '@/components/TaperProgress'
import { MilestoneCelebration } from '@/components/MilestoneCelebration'
import { CravingModal } from '@/components/CravingModal'
import { useNotifications } from '@/hooks/useNotifications'
import { useFirestore } from '@/hooks/useFirestore'
import {
  getGreeting,
  getDaysSincePlanStart,
  formatGrams,
  getDailyTargetForDate,
  calculateStreakFromLocal,
  getTodayKey,
  getPresets,
} from '@/lib/utils'
import { checkNewMilestones, markMilestoneCelebrated, Milestone } from '@/lib/milestones'
import { detectPhase } from '@/lib/phases'
import { PhaseGuidanceCard } from '@/components/PhaseGuidanceCard'
import { QuickLogSheet } from '@/components/QuickLogSheet'
import { DailyCheckIn } from '@/components/DailyCheckIn'
import { format } from 'date-fns'
import { Bell, Shield, Waves, Frown, Meh, Smile, Pencil, X } from 'lucide-react'
import Link from 'next/link'

function MoodIcon({ mood }: { mood?: string }) {
  if (mood === 'rough') return <Frown size={16} color="var(--text-secondary)" strokeWidth={1.75} />
  if (mood === 'okay') return <Meh size={16} color="var(--text-secondary)" strokeWidth={1.75} />
  if (mood === 'good') return <Smile size={16} color="var(--success)" strokeWidth={1.75} />
  return null
}

export default function HomePage() {
  const { todayIntakes, taperPlan, getTodayTotal, setTodayIntakes } = useAppStore()
  const { addIntake, updateIntake } = useFirestore()
  const { permission, requestPermission } = useNotifications()
  const [showNotifBanner, setShowNotifBanner] = useState(false)
  const [notifDismissed, setNotifDismissed] = useState(false)
  const [streak, setStreak] = useState(0)
  const [pendingMilestones, setPendingMilestones] = useState<Milestone[]>([])
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null)
  const [showCravingModal, setShowCravingModal] = useState(false)
  const [showQuickLog, setShowQuickLog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<import('@/lib/store').IntakeEntry | null>(null)
  const [todayResistances, setTodayResistances] = useState(0)
  const [showResistanceToast, setShowResistanceToast] = useState(false)
  const [dosesExpanded, setDosesExpanded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = localStorage.getItem('unhookd_notif_dismissed_week')
    const weekKey = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}`
    if (dismissed !== weekKey && permission === 'default' && taperPlan) {
      setShowNotifBanner(true)
    }
    const todayKey = getTodayKey()
    const saved = localStorage.getItem(`unhookd_resistances_${todayKey}`)
    if (saved) setTodayResistances(parseInt(saved, 10) || 0)
  }, [permission, taperPlan])

  useEffect(() => {
    if (!taperPlan) {
      setStreak(0)
      return
    }
    const newStreak = calculateStreakFromLocal(taperPlan)
    setStreak(newStreak)
    const milestones = checkNewMilestones(taperPlan, newStreak)
    if (milestones.length > 0) {
      setPendingMilestones(milestones)
      setCurrentMilestone(milestones[0])
    }
  }, [taperPlan, todayIntakes])

  function dismissMilestone() {
    if (!currentMilestone) return
    markMilestoneCelebrated(currentMilestone.id)
    const remaining = pendingMilestones.filter((m) => m.id !== currentMilestone.id)
    setPendingMilestones(remaining)
    setCurrentMilestone(remaining[0] ?? null)
  }

  function dismissBanner() {
    const weekKey = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}`
    localStorage.setItem('unhookd_notif_dismissed_week', weekKey)
    setNotifDismissed(true)
    setShowNotifBanner(false)
  }

  async function enableNotifications() {
    await requestPermission()
    dismissBanner()
  }

  function handleResisted() {
    const todayKey = getTodayKey()
    const newCount = todayResistances + 1
    setTodayResistances(newCount)
    localStorage.setItem(`unhookd_resistances_${todayKey}`, String(newCount))
    setShowCravingModal(false)
    setShowResistanceToast(true)
    setTimeout(() => setShowResistanceToast(false), 3000)
  }

  function deleteIntake(id: string) {
    const updated = todayIntakes.filter((e) => e.id !== id)
    setTodayIntakes(updated)
    const todayKey = getTodayKey()
    localStorage.setItem(`unhookd_intakes_${todayKey}`, JSON.stringify(updated))
  }

  const todayTotal = getTodayTotal()
  const dailyTarget = taperPlan ? getDailyTargetForDate(taperPlan, new Date()) : 10
  const dayNumber = taperPlan ? getDaysSincePlanStart(taperPlan.startDate) + 1 : 1
  const greeting = getGreeting()

  const totalPlanDays = taperPlan
    ? taperPlan.daysToTarget !== undefined
      ? taperPlan.daysToTarget
      : taperPlan.weeksToTarget * 7
    : 0
  // Only show week number for plans >= 14 days; short/cold-turkey plans show day count instead
  const weekNumber =
    taperPlan && totalPlanDays >= 14
      ? Math.min(
          Math.ceil(getDaysSincePlanStart(taperPlan.startDate) / 7) + 1,
          Math.ceil(totalPlanDays / 7)
        )
      : null

  const phaseInfo = taperPlan ? detectPhase(taperPlan) : null
  const isPostZero = !!phaseInfo?.isPostZero
  const daysClean = phaseInfo?.daysPostZero ?? 0

  const lastDoseEntry =
    todayIntakes.length > 0
      ? [...todayIntakes].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
      : null

  // Weekly context for TaperProgress
  const weeklyContext = (() => {
    if (!taperPlan || isPostZero) return undefined
    const journeyDays = getDaysSincePlanStart(taperPlan.startDate)
    if (journeyDays < 1) return undefined
    const totalDays =
      taperPlan.daysToTarget !== undefined ? taperPlan.daysToTarget : taperPlan.weeksToTarget * 7
    const reduction = taperPlan.startAmount - taperPlan.targetAmount
    // Expected cumulative dose by today vs actual
    const expectedCumulative =
      taperPlan.startAmount * journeyDays -
      ((reduction / totalDays) * journeyDays * journeyDays) / 2
    // Just compare today's dose vs target
    if (todayTotal === 0) return undefined
    const diff = dailyTarget - todayTotal
    if (diff > 0.4) return `${formatGrams(diff)} under target today`
    if (diff < -0.4) return `${formatGrams(Math.abs(diff))} over target`
    return 'Right on target'
  })()

  function timeSince(ts: Date): string {
    const diffM = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (diffM < 60) return `${diffM}m ago`
    const h = Math.floor(diffM / 60)
    const m = diffM % 60
    return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`
  }

  const sortedIntakes = [...todayIntakes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  const DOSES_PREVIEW_COUNT = 3
  const visibleIntakes = dosesExpanded ? sortedIntakes : sortedIntakes.slice(0, DOSES_PREVIEW_COUNT)
  const hiddenCount = sortedIntakes.length - DOSES_PREVIEW_COUNT

  return (
    <>
      <MilestoneCelebration milestone={currentMilestone} onDismiss={dismissMilestone} />
      <QuickLogSheet
        isOpen={showQuickLog}
        dailyTarget={dailyTarget}
        todayTotal={todayTotal}
        lastDoseAt={lastDoseEntry ? new Date(lastDoseEntry.timestamp) : null}
        onLog={addIntake}
        onSuccess={() => setShowQuickLog(false)}
        onDismiss={() => setShowQuickLog(false)}
      />
      <EditDoseSheet
        entry={editingEntry}
        dailyTarget={dailyTarget}
        onSave={async (id, updates) => {
          await updateIntake(id, updates)
          setEditingEntry(null)
        }}
        onDismiss={() => setEditingEntry(null)}
      />
      <CravingModal
        isOpen={showCravingModal}
        streak={streak}
        dayNumber={dayNumber}
        reasons={taperPlan?.reasons}
        emergencyContact={taperPlan?.emergencyContact}
        onResisted={handleResisted}
        onDismiss={() => setShowCravingModal(false)}
      />

      {/* Resistance toast */}
      <AnimatePresence>
        {showResistanceToast && (
          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              position: 'fixed',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 300,
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} strokeWidth={2} />
              That took strength. Well done.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* Compact header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  margin: 0,
                  letterSpacing: '0.02em',
                }}
              >
                {greeting}
              </p>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '2px 0 0 0',
                  lineHeight: 1.2,
                }}
              >
                {taperPlan && totalPlanDays === 0
                  ? `Day ${dayNumber} — cold turkey`
                  : taperPlan && weekNumber
                    ? `Day ${dayNumber} · Week ${weekNumber} of ${Math.ceil(totalPlanDays / 7)}`
                    : taperPlan
                      ? `Day ${dayNumber} of ${totalPlanDays}`
                      : 'Welcome to Unhookd'}
              </h1>
            </div>
            {todayResistances > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: 'rgba(127,176,105,0.1)',
                  border: '1px solid rgba(127,176,105,0.2)',
                  borderRadius: 20,
                  padding: '4px 10px',
                }}
              >
                <Shield size={13} color="var(--success)" strokeWidth={2} />
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
                  {todayResistances} resisted
                </span>
              </div>
            )}
          </div>

          {/* Notification banner — at most once per week */}
          <AnimatePresence>
            {showNotifBanner && !notifDismissed && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.25 }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(232,168,124,0.08)',
                    border: '1px solid rgba(232,168,124,0.25)',
                    borderRadius: 16,
                    padding: '14px 16px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  <Bell
                    size={22}
                    color="var(--primary)"
                    strokeWidth={1.75}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 4px 0',
                      }}
                    >
                      Enable reminders?
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        margin: '0 0 12px 0',
                        lineHeight: 1.4,
                      }}
                    >
                      Get a gentle daily nudge to log your dose and stay on track.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={enableNotifications}
                        style={{
                          flex: 1,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: 'var(--primary)',
                          color: 'var(--bg)',
                          fontWeight: 600,
                          fontSize: 13,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Enable
                      </button>
                      <button
                        onClick={dismissBanner}
                        style={{
                          height: 36,
                          padding: '0 14px',
                          borderRadius: 10,
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary)',
                          fontWeight: 500,
                          fontSize: 13,
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                        }}
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Setup prompt if no plan */}
          {!taperPlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: 16,
                  margin: '0 0 8px 0',
                }}
              >
                Set up your taper plan
              </p>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 14,
                  margin: '0 0 16px 0',
                  lineHeight: 1.5,
                }}
              >
                Tell us where you&apos;re starting and where you want to be.
              </p>
              <Link
                href="/plan"
                style={{
                  display: 'block',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--bg)',
                  textAlign: 'center',
                  padding: '14px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                }}
              >
                Create my plan →
              </Link>
            </motion.div>
          )}

          {/* Progress ring OR post-zero display */}
          {isPostZero ? (
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 24,
                padding: '28px 20px',
                border: '1px solid rgba(127, 176, 105, 0.3)',
                background:
                  'linear-gradient(135deg, rgba(127,176,105,0.08) 0%, var(--surface) 100%)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: 'var(--success)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {daysClean}
              </div>
              <div style={{ fontSize: 16, color: 'var(--success)', fontWeight: 600, marginTop: 6 }}>
                {daysClean === 1 ? 'day clean' : 'days clean'}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 10,
                  lineHeight: 1.5,
                }}
              >
                {daysClean <= 10
                  ? 'The hardest part of the physical transition is nearly behind you.'
                  : daysClean <= 45
                    ? 'Your body has passed the acute phase. The brain is still recalibrating — keep going.'
                    : 'Every week now brings real neurological recovery. The fog continues to lift.'}
              </div>
            </div>
          ) : taperPlan ? (
            <TaperProgress
              current={todayTotal}
              target={dailyTarget}
              weeklyContext={weeklyContext}
            />
          ) : null}

          {/* Primary CTA — Log dose */}
          {taperPlan && !isPostZero && (
            <motion.button
              onClick={() => setShowQuickLog(true)}
              whileTap={{ scale: 0.97 }}
              style={{
                height: 58,
                borderRadius: 18,
                backgroundColor: 'var(--primary)',
                color: 'var(--bg)',
                fontWeight: 700,
                fontSize: 17,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.01em',
                boxShadow: '0 4px 16px rgba(232,168,124,0.25)',
              }}
            >
              {lastDoseEntry
                ? `+ Log dose  ·  last ${timeSince(new Date(lastDoseEntry.timestamp))}`
                : '+ Log first dose today'}
            </motion.button>
          )}

          {/* Over-target compassion state */}
          {taperPlan && todayTotal > dailyTarget && todayIntakes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                backgroundColor: 'rgba(224, 90, 90, 0.07)',
                border: '1px solid rgba(224, 90, 90, 0.2)',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <Waves
                size={20}
                color="#e05a5a"
                strokeWidth={1.75}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <p style={{ margin: '0 0 2px 0', fontSize: 14, fontWeight: 600, color: '#e05a5a' }}>
                  Over today&apos;s goal — that&apos;s okay.
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  One hard day doesn&apos;t erase your progress. Tomorrow is a fresh start. If this
                  keeps happening, consider{' '}
                  <Link
                    href="/plan"
                    style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    holding your dose
                  </Link>{' '}
                  for a week.
                </p>
              </div>
            </motion.div>
          )}

          {/* Today's doses */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}
              >
                Today&apos;s doses
                {todayIntakes.length > 0 && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: 'var(--text-secondary)',
                      marginLeft: 8,
                    }}
                  >
                    {formatGrams(todayTotal)} total
                  </span>
                )}
              </h2>
              {!taperPlan && (
                <button
                  onClick={() => setShowQuickLog(true)}
                  style={{
                    fontSize: 13,
                    color: 'var(--primary)',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  + Add
                </button>
              )}
            </div>

            {todayIntakes.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 16,
                  padding: '20px 16px',
                  border: '1px solid var(--border)',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                  Nothing logged yet today
                </p>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visibleIntakes.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                        transition={{ delay: i * 0.04 }}
                        style={{
                          backgroundColor: 'var(--surface)',
                          borderRadius: 14,
                          padding: '12px 14px',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)' }}
                            >
                              {formatGrams(entry.amount)}
                            </span>
                            <MoodIcon mood={entry.mood} />
                          </div>
                          {entry.note && (
                            <p
                              style={{
                                margin: '4px 0 0 0',
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {entry.note}
                            </p>
                          )}
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {format(new Date(entry.timestamp), 'h:mm a')}
                          </span>
                          <button
                            onClick={() => setEditingEntry(entry)}
                            aria-label="Edit dose"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              flexShrink: 0,
                            }}
                          >
                            <Pencil size={13} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => deleteIntake(entry.id)}
                            aria-label="Delete dose"
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              flexShrink: 0,
                            }}
                          >
                            <X size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>

                {/* Show more / less toggle */}
                {sortedIntakes.length > DOSES_PREVIEW_COUNT && (
                  <button
                    onClick={() => setDosesExpanded(!dosesExpanded)}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {dosesExpanded
                      ? 'Show less'
                      : `Show ${hiddenCount} more dose${hiddenCount !== 1 ? 's' : ''}`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Daily check-in */}
          {taperPlan && <DailyCheckIn />}

          {/* Phase guidance card — below check-in, less intrusive */}
          {phaseInfo && <PhaseGuidanceCard phaseInfo={phaseInfo} />}

          {/* Craving SOS — subtle */}
          {taperPlan && (
            <button
              onClick={() => setShowCravingModal(true)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 16,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Waves size={18} color="var(--text-secondary)" strokeWidth={1.75} />
              <span>Feeling a craving? Breathe through it →</span>
            </button>
          )}
        </motion.div>
      </div>
    </>
  )
}

// ─── Edit dose bottom sheet ────────────────────────────────────────────────

type Mood = 'rough' | 'okay' | 'good'

const EDIT_MOODS: { value: Mood; Icon: typeof Frown }[] = [
  { value: 'rough', Icon: Frown },
  { value: 'okay', Icon: Meh },
  { value: 'good', Icon: Smile },
]

function EditDoseSheet({
  entry,
  dailyTarget,
  onSave,
  onDismiss,
}: {
  entry: import('@/lib/store').IntakeEntry | null
  dailyTarget: number
  onSave: (
    id: string,
    updates: Partial<Omit<import('@/lib/store').IntakeEntry, 'id'>>
  ) => Promise<void>
  onDismiss: () => void
}) {
  const [amount, setAmount] = useState<number | null>(entry?.amount ?? null)
  const [useCustom, setUseCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [mood, setMood] = useState<Mood | null>((entry?.mood as Mood) ?? null)
  const [note, setNote] = useState(entry?.note ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setAmount(entry.amount)
      setUseCustom(false)
      setCustomAmount('')
      setMood((entry.mood as Mood) ?? null)
      setNote(entry.note ?? '')
    }
  }, [entry])

  const presets = getPresets(dailyTarget)
  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : amount || 0

  async function handleSave() {
    if (!entry || finalAmount <= 0 || saving) return
    setSaving(true)
    await onSave(entry.id, {
      amount: finalAmount,
      mood: mood || undefined,
      note: note.trim() || undefined,
    })
    setSaving(false)
  }

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            key="edit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 400,
              backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            key="edit-sheet"
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
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                backgroundColor: 'var(--border)',
                borderRadius: 2,
                margin: '0 auto 20px',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h2
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
              >
                Edit dose
              </h2>
              <button
                onClick={onDismiss}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 8px 0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Amount
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                {presets.map((p) => {
                  const sel = !useCustom && amount === p
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        setAmount(p)
                        setUseCustom(false)
                      }}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: sel ? 700 : 500,
                        cursor: 'pointer',
                        backgroundColor: sel ? 'var(--primary)' : 'var(--bg)',
                        color: sel ? 'var(--bg)' : 'var(--text-primary)',
                        border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                        transition: 'all 0.12s',
                      }}
                    >
                      {p}g
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => {
                  setUseCustom(true)
                  setAmount(null)
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
              {useCustom && (
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
                    height: 44,
                    padding: '0 12px',
                    borderRadius: 12,
                    fontSize: 15,
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--primary)',
                    outline: 'none',
                  }}
                />
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 8px 0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Mood
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {EDIT_MOODS.map(({ value, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMood(mood === value ? null : value)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: mood === value ? 'rgba(232,168,124,0.15)' : 'var(--bg)',
                      border: `1px solid ${mood === value ? 'var(--primary)' : 'var(--border)'}`,
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

            <div style={{ marginBottom: 20 }}>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 8px 0',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Note
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Optional note"
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

            <button
              onClick={handleSave}
              disabled={finalAmount <= 0 || saving}
              style={{
                width: '100%',
                height: 52,
                borderRadius: 16,
                fontWeight: 700,
                fontSize: 16,
                border: 'none',
                cursor: finalAmount > 0 ? 'pointer' : 'default',
                backgroundColor: finalAmount > 0 ? 'var(--primary)' : 'var(--surface-elevated)',
                color: finalAmount > 0 ? 'var(--bg)' : 'var(--text-secondary)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
