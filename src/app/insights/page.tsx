'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { getPastDates, dateToKey, getDailyTargetForDate, formatGrams } from '@/lib/utils'
import { IntakeEntry } from '@/lib/store'
import { Shield, Sunrise, Sun, Sunset, Moon, Smile, Meh, Frown, LucideIcon } from 'lucide-react'

interface DaySnapshot {
  date: Date
  intakes: IntakeEntry[]
  total: number
}

type SymptomLevel = 'fine' | 'mild' | 'bad'
interface SymptomData {
  sleep?: SymptomLevel
  anxiety?: SymptomLevel
  restlessness?: SymptomLevel
  gi?: SymptomLevel
}
interface DaySymptoms {
  date: Date
  symptoms: SymptomData
}

function loadSymptomData(days: number): DaySymptoms[] {
  if (typeof window === 'undefined') return []
  return getPastDates(days).map((date) => {
    const key = dateToKey(date)
    const raw = localStorage.getItem(`unhookd_checkin_${key}`)
    if (!raw) return { date, symptoms: {} }
    try {
      const parsed = JSON.parse(raw)
      return { date, symptoms: (parsed.symptoms ?? {}) as SymptomData }
    } catch {
      return { date, symptoms: {} }
    }
  })
}

function loadResistanceData(days: number): { date: Date; count: number }[] {
  if (typeof window === 'undefined') return []
  return getPastDates(days).map((date) => {
    const key = dateToKey(date)
    const raw = localStorage.getItem(`unhookd_resistances_${key}`)
    return { date, count: raw ? parseInt(raw, 10) || 0 : 0 }
  })
}

function loadDaySnapshots(days: number): DaySnapshot[] {
  if (typeof window === 'undefined') return []
  return getPastDates(days).map((date) => {
    const key = dateToKey(date)
    try {
      const raw = localStorage.getItem(`unhookd_intakes_${key}`)
      if (!raw) return { date, intakes: [], total: 0 }
      const parsed = JSON.parse(raw) as Array<IntakeEntry & { timestamp: string }>
      const intakes = parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
      const total = intakes.reduce((sum, e) => sum + e.amount, 0)
      return { date, intakes, total }
    } catch {
      return { date, intakes: [], total: 0 }
    }
  })
}

function getTimeSlot(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night'
type Mood = 'rough' | 'okay' | 'good'

interface InsightData {
  thisWeekAvg: number
  lastWeekAvg: number
  moodCounts: Record<Mood, number>
  totalMoodEntries: number
  timing: Record<TimeSlot, number>
  totalTimingEntries: number
  daysLogged: number
  totalReduction: number
  avgVsTarget: number // negative = under, positive = over
  snapshots14: DaySnapshot[]
  totalResistances14: number
  resistanceByDay14: { date: Date; count: number }[]
  symptomData14: DaySymptoms[]
  movementDays14: number
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.3 }}
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 16,
        padding: '16px',
        border: '1px solid var(--border)',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: accent ?? 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.3 }}
        >
          {sub}
        </div>
      )}
    </motion.div>
  )
}

function MoodBar({
  label,
  MoodIcon,
  count,
  total,
  color,
}: {
  label: string
  MoodIcon: LucideIcon
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flexShrink: 0,
          width: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MoodIcon size={18} color={color} strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {pct}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            backgroundColor: 'var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
            style={{ height: '100%', backgroundColor: color, borderRadius: 4 }}
          />
        </div>
      </div>
      <span
        style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 20, textAlign: 'right' }}
      >
        {count}
      </span>
    </div>
  )
}

function TimingBubble({
  label,
  Icon,
  count,
  max,
}: {
  label: string
  Icon: LucideIcon
  count: number
  max: number
}) {
  const pct = max > 0 ? count / max : 0
  const size = 48 + pct * 32
  const iconSize = Math.round(18 + pct * 8)
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'backOut', delay: 0.5 }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: count > 0 ? 'rgba(232,168,124,0.15)' : 'var(--surface)',
          border: `1.5px solid ${count > 0 ? 'rgba(232,168,124,0.4)' : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          size={iconSize}
          color={count > 0 ? 'var(--primary)' : 'var(--text-secondary)'}
          strokeWidth={1.75}
        />
      </motion.div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{count}</div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</div>
      </div>
    </div>
  )
}

function ResistanceBarChart({ data }: { data: { date: Date; count: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1)
  const totalDaysWithResistances = data.filter((d) => d.count > 0).length
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
        {data.map((day, i) => {
          const barH = day.count > 0 ? Math.max(4, (day.count / maxVal) * 56) : 3
          const isToday = i === data.length - 1
          const color = day.count > 0 ? 'var(--success)' : 'var(--border)'
          return (
            <div
              key={dateToKey(day.date)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ delay: 0.4 + i * 0.03, duration: 0.4, ease: 'easeOut' }}
                style={{
                  width: '100%',
                  backgroundColor: color,
                  borderRadius: 3,
                  opacity: isToday ? 1 : 0.75,
                  border: isToday && day.count > 0 ? `1.5px solid var(--success)` : 'none',
                  position: 'relative',
                }}
              />
              {day.count > 0 && (
                <div style={{ fontSize: 9, color: 'var(--text-secondary)', lineHeight: 1 }}>
                  {day.count}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginTop: 10,
          margin: '10px 0 0 0',
        }}
      >
        {totalDaysWithResistances === 0
          ? 'Use the craving SOS button next time you feel an urge.'
          : `You resisted on ${totalDaysWithResistances} of the last 14 days — that willpower is real.`}
      </p>
    </div>
  )
}

export default function InsightsPage() {
  const { taperPlan } = useAppStore()
  const [data, setData] = useState<InsightData | null>(null)

  useEffect(() => {
    const snapshots28 = loadDaySnapshots(28)
    const snapshots14 = snapshots28.slice(14) // last 14 days
    const thisWeekSnaps = snapshots28.slice(21) // last 7 days
    const lastWeekSnaps = snapshots28.slice(14, 21) // prev 7 days

    // Weekly averages (only counting logged days)
    const thisWeekLogged = thisWeekSnaps.filter((d) => d.total > 0)
    const lastWeekLogged = lastWeekSnaps.filter((d) => d.total > 0)
    const thisWeekAvg =
      thisWeekLogged.length > 0
        ? thisWeekLogged.reduce((s, d) => s + d.total, 0) / thisWeekLogged.length
        : 0
    const lastWeekAvg =
      lastWeekLogged.length > 0
        ? lastWeekLogged.reduce((s, d) => s + d.total, 0) / lastWeekLogged.length
        : 0

    // Mood breakdown (last 14 days)
    const moodCounts: Record<Mood, number> = { rough: 0, okay: 0, good: 0 }
    let totalMoodEntries = 0
    for (const snap of snapshots14) {
      for (const intake of snap.intakes) {
        if (intake.mood) {
          moodCounts[intake.mood]++
          totalMoodEntries++
        }
      }
    }

    // Dose timing (last 14 days, all intakes)
    const timing: Record<TimeSlot, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    let totalTimingEntries = 0
    for (const snap of snapshots14) {
      for (const intake of snap.intakes) {
        const slot = getTimeSlot(new Date(intake.timestamp))
        timing[slot]++
        totalTimingEntries++
      }
    }

    // Days logged (last 14)
    const daysLogged = snapshots14.filter((d) => d.total > 0).length

    // Total reduction vs. starting without tapering (last 14 days)
    let totalReduction = 0
    if (taperPlan) {
      for (const snap of snapshots14) {
        if (snap.total > 0) {
          totalReduction += taperPlan.startAmount - snap.total
        }
      }
    }

    // Avg vs target (last 7 logged days)
    let avgVsTarget = 0
    if (taperPlan && thisWeekLogged.length > 0) {
      const diffs = thisWeekLogged.map((snap) => {
        const target = getDailyTargetForDate(taperPlan, snap.date)
        return snap.total - target
      })
      avgVsTarget = diffs.reduce((s, d) => s + d, 0) / diffs.length
    }

    // Craving resistance (last 14 days)
    const resistanceByDay14 = loadResistanceData(14)
    const totalResistances14 = resistanceByDay14.reduce((s, d) => s + d.count, 0)

    // Symptom data (last 14 days)
    const symptomData14 = loadSymptomData(14)

    // Movement days (last 14 days)
    const movementDays14 = getPastDates(14).filter((date) => {
      const key = dateToKey(date)
      const raw =
        typeof window !== 'undefined' ? localStorage.getItem(`unhookd_checkin_${key}`) : null
      if (!raw) return false
      try {
        return JSON.parse(raw)?.moved === true
      } catch {
        return false
      }
    }).length

    setData({
      thisWeekAvg,
      lastWeekAvg,
      moodCounts,
      totalMoodEntries,
      timing,
      totalTimingEntries,
      daysLogged,
      totalReduction,
      avgVsTarget,
      snapshots14,
      totalResistances14,
      resistanceByDay14,
      symptomData14,
      movementDays14,
    })
  }, [taperPlan])

  if (!data) {
    return (
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: 60 }}>
          Loading insights...
        </div>
      </div>
    )
  }

  const weekDelta = data.lastWeekAvg > 0 ? data.thisWeekAvg - data.lastWeekAvg : null
  const weekDeltaPct =
    weekDelta !== null && data.lastWeekAvg > 0
      ? Math.abs(Math.round((weekDelta / data.lastWeekAvg) * 100))
      : null

  const maxTiming = Math.max(...Object.values(data.timing))

  const onTrackDays = data.snapshots14.filter((snap) => {
    if (snap.total === 0) return false
    if (!taperPlan) return true
    const target = getDailyTargetForDate(taperPlan, snap.date)
    return snap.total <= target
  }).length

  // Build 3 plain-language insight cards
  const insightCards = (() => {
    const cards: { icon: string; headline: string; body: string }[] = []

    // Trend insight
    if (weekDelta !== null && weekDeltaPct !== null) {
      if (weekDelta < -0.2) {
        cards.push({
          icon: '↓',
          headline: `Down ${weekDeltaPct}% this week`,
          body: `Your average this week is ${formatGrams(Math.round(data.thisWeekAvg * 10) / 10)} vs ${formatGrams(Math.round(data.lastWeekAvg * 10) / 10)} last week. The taper is working.`,
        })
      } else if (weekDelta > 0.2) {
        cards.push({
          icon: '↑',
          headline: `Up ${weekDeltaPct}% this week`,
          body: `This week's average is a bit higher than last week. Consider whether a hold week would help.`,
        })
      } else {
        cards.push({
          icon: '→',
          headline: 'Holding steady',
          body: 'This week looks similar to last week — consistency is progress too.',
        })
      }
    }

    // Timing insight
    if (data.totalTimingEntries > 0) {
      const peak = (Object.entries(data.timing) as [TimeSlot, number][]).reduce((a, b) =>
        b[1] > a[1] ? b : a
      )
      if (peak[1] > 0) {
        const labels: Record<TimeSlot, string> = {
          morning: 'mornings',
          afternoon: 'afternoons',
          evening: 'evenings',
          night: 'nights',
        }
        const tips: Record<TimeSlot, string> = {
          morning: 'Morning doses can set the tone for the day. Try a brief walk first.',
          afternoon: 'Afternoon cravings often follow stress. A 10-min break can help.',
          evening: 'Evening doses can affect sleep quality. Watch for the pattern.',
          night: 'Late doses may be affecting your sleep. Try moving the last dose earlier.',
        }
        if (cards.length < 3) {
          cards.push({
            icon: '🕐',
            headline: `You dose most in the ${peak[0]}s`,
            body: tips[peak[0]],
          })
        }
      }
    }

    // Mood insight
    if (data.totalMoodEntries >= 3) {
      if (cards.length < 3) {
        if (data.moodCounts.good > data.moodCounts.rough) {
          const goodPct = Math.round((data.moodCounts.good / data.totalMoodEntries) * 100)
          cards.push({
            icon: '😊',
            headline: `${goodPct}% of doses logged feeling good`,
            body: 'More good moments than rough ones — real progress that deserves recognition.',
          })
        } else if (data.moodCounts.rough > data.moodCounts.good) {
          cards.push({
            icon: '💙',
            headline: 'More rough days than good lately',
            body: 'This is normal during a taper. The symptoms are temporary — your body is adjusting.',
          })
        }
      }
    }

    // Resistance insight
    if (data.totalResistances14 > 0 && cards.length < 3) {
      cards.push({
        icon: '🛡',
        headline: `${data.totalResistances14} craving${data.totalResistances14 !== 1 ? 's' : ''} resisted`,
        body: 'Every craving you ride out weakens the pattern. That willpower compounds.',
      })
    }

    return cards.slice(0, 3)
  })()

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            Insights
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Patterns from your last 14 days
          </p>
        </div>

        {/* Plain-language insight cards */}
        {insightCards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insightCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    backgroundColor: 'rgba(232,168,124,0.12)',
                    border: '1px solid rgba(232,168,124,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  {card.icon}
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 3px 0',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.2,
                    }}
                  >
                    {card.headline}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {card.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Top stat row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard
            label="This week avg"
            value={data.thisWeekAvg > 0 ? formatGrams(Math.round(data.thisWeekAvg * 10) / 10) : '—'}
            sub={
              weekDelta !== null && weekDeltaPct !== null
                ? weekDelta < 0
                  ? `↓ ${weekDeltaPct}% vs last week`
                  : weekDelta > 0
                    ? `↑ ${weekDeltaPct}% vs last week`
                    : 'Same as last week'
                : data.lastWeekAvg === 0
                  ? 'No prior week data'
                  : undefined
            }
            accent={weekDelta !== null && weekDelta < 0 ? 'var(--success)' : 'var(--primary)'}
            delay={0.05}
          />
          <StatCard
            label="Days logged"
            value={`${data.daysLogged}/14`}
            sub="last 14 days"
            accent="var(--text-primary)"
            delay={0.1}
          />
        </div>

        {/* On track + movement row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard
            label="On target"
            value={`${onTrackDays}`}
            sub={`of ${data.daysLogged} logged days`}
            accent="var(--success)"
            delay={0.15}
          />
          <StatCard
            label="Movement days"
            value={`${data.movementDays14}/14`}
            sub="last 14 days"
            accent={
              data.movementDays14 >= 10
                ? 'var(--success)'
                : data.movementDays14 >= 5
                  ? 'var(--primary)'
                  : 'var(--text-primary)'
            }
            delay={0.17}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {data.totalResistances14 > 0 && (
            <StatCard
              label="Cravings resisted"
              value={`${data.totalResistances14}`}
              sub="last 14 days"
              accent="var(--success)"
              delay={0.18}
            />
          )}
          {taperPlan && data.totalReduction > 0 && (
            <StatCard
              label="Saved vs start"
              value={formatGrams(Math.round(data.totalReduction * 10) / 10)}
              sub="vs. your starting dose"
              accent="var(--success)"
              delay={0.2}
            />
          )}
        </div>

        {/* Craving resistance */}
        {data.totalResistances14 > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.3 }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  margin: 0,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Cravings resisted
              </h2>
              <div
                style={{
                  backgroundColor: 'rgba(127, 176, 105, 0.12)',
                  border: '1px solid rgba(127, 176, 105, 0.3)',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--success)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} strokeWidth={2} /> {data.totalResistances14} total
                </span>
              </div>
            </div>
            <ResistanceBarChart data={data.resistanceByDay14} />
          </motion.div>
        )}

        {/* Mood breakdown */}
        {data.totalMoodEntries > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid var(--border)',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                margin: '0 0 16px 0',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Mood (last 14 days)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MoodBar
                label="Feeling good"
                MoodIcon={Smile}
                count={data.moodCounts.good}
                total={data.totalMoodEntries}
                color="var(--success)"
              />
              <MoodBar
                label="Getting by"
                MoodIcon={Meh}
                count={data.moodCounts.okay}
                total={data.totalMoodEntries}
                color="var(--primary)"
              />
              <MoodBar
                label="Rough days"
                MoodIcon={Frown}
                count={data.moodCounts.rough}
                total={data.totalMoodEntries}
                color="var(--danger)"
              />
            </div>
            {data.moodCounts.good > data.moodCounts.rough && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--success)',
                  marginTop: 14,
                  margin: '14px 0 0 0',
                  fontStyle: 'italic',
                }}
              >
                More good days than rough ones — that&apos;s real progress.
              </p>
            )}
          </motion.div>
        )}

        {/* Dose timing */}
        {data.totalTimingEntries > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid var(--border)',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                margin: '0 0 20px 0',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              When you dose
            </h2>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-around' }}>
              <TimingBubble
                label="Morning"
                Icon={Sunrise}
                count={data.timing.morning}
                max={maxTiming}
              />
              <TimingBubble
                label="Afternoon"
                Icon={Sun}
                count={data.timing.afternoon}
                max={maxTiming}
              />
              <TimingBubble
                label="Evening"
                Icon={Sunset}
                count={data.timing.evening}
                max={maxTiming}
              />
              <TimingBubble label="Night" Icon={Moon} count={data.timing.night} max={maxTiming} />
            </div>
            {(() => {
              const peak = (Object.entries(data.timing) as [TimeSlot, number][]).reduce((a, b) =>
                b[1] > a[1] ? b : a
              )
              if (peak[1] === 0) return null
              const labels: Record<TimeSlot, string> = {
                morning: 'mornings',
                afternoon: 'afternoons',
                evening: 'evenings',
                night: 'nights',
              }
              return (
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginTop: 16,
                    margin: '16px 0 0 0',
                  }}
                >
                  You tend to dose most in the{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{labels[peak[0]]}</strong>.
                </p>
              )
            })()}
          </motion.div>
        )}

        {/* Symptom tracker summary */}
        {(() => {
          const SYMPTOM_KEYS: Array<{ key: keyof SymptomData; emoji: string; label: string }> = [
            { key: 'sleep', emoji: '😴', label: 'Sleep' },
            { key: 'anxiety', emoji: '😰', label: 'Anxiety' },
            { key: 'restlessness', emoji: '🦵', label: 'Restlessness' },
            { key: 'gi', emoji: '🤢', label: 'Gut/GI' },
          ]
          const daysWithAnySymptom = data.symptomData14.filter(
            (d) => Object.keys(d.symptoms).length > 0
          ).length
          if (daysWithAnySymptom === 0) return null

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.3 }}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  margin: '0 0 16px 0',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Physical symptoms — 14 days
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SYMPTOM_KEYS.map(({ key, emoji, label }) => {
                  const mildDays = data.symptomData14.filter(
                    (d) => d.symptoms[key] === 'mild'
                  ).length
                  const badDays = data.symptomData14.filter((d) => d.symptoms[key] === 'bad').length
                  const trackedDays = data.symptomData14.filter((d) => !!d.symptoms[key]).length
                  if (trackedDays === 0) return null
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {label}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {badDays > 0 && (
                              <span style={{ color: '#e05c5c', fontWeight: 600 }}>
                                {badDays} bad
                              </span>
                            )}
                            {badDays > 0 && mildDays > 0 && ' · '}
                            {mildDays > 0 && (
                              <span style={{ color: 'var(--primary)' }}>{mildDays} mild</span>
                            )}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            backgroundColor: 'var(--border)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            display: 'flex',
                            gap: 2,
                          }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(mildDays / 14) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
                            style={{
                              height: '100%',
                              backgroundColor: 'var(--primary)',
                              borderRadius: 4,
                            }}
                          />
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(badDays / 14) * 100}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.6 }}
                            style={{ height: '100%', backgroundColor: '#e05c5c', borderRadius: 4 }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '12px 0 0 0',
                  lineHeight: 1.4,
                }}
              >
                Tracked on {daysWithAnySymptom} of 14 days. Log symptoms via the daily check-in.
              </p>
            </motion.div>
          )
        })()}

        {/* Weekly comparison mini chart */}
        {data.snapshots14.some((d) => d.total > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 20,
              padding: 20,
              border: '1px solid var(--border)',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                margin: '0 0 16px 0',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Daily intake — 14 days
            </h2>
            <MiniBarChart snapshots={data.snapshots14} plan={taperPlan} />
          </motion.div>
        )}

        {/* Empty state */}
        {data.daysLogged === 0 && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 20,
              padding: 32,
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
            <p
              style={{
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontSize: 15,
                margin: '0 0 8px 0',
              }}
            >
              No data yet
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Log your doses for a few days and insights will appear here — patterns, mood trends,
              and your progress over time.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function MiniBarChart({
  snapshots,
  plan,
}: {
  snapshots: DaySnapshot[]
  plan: import('@/lib/store').TaperPlan | null
}) {
  const maxVal = Math.max(
    ...snapshots.map((s) => s.total),
    plan ? Math.max(...snapshots.map((s) => getDailyTargetForDate(plan, s.date))) : 0,
    1
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 72 }}>
      {snapshots.map((snap, i) => {
        const barH = snap.total > 0 ? Math.max(4, (snap.total / maxVal) * 72) : 3
        const target = plan ? getDailyTargetForDate(plan, snap.date) : null
        const isOver = target !== null && snap.total > target
        const isToday = i === snapshots.length - 1
        const color =
          snap.total === 0 ? 'var(--border)' : isOver ? 'var(--danger)' : 'var(--success)'

        return (
          <div
            key={dateToKey(snap.date)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ delay: 0.4 + i * 0.03, duration: 0.4, ease: 'easeOut' }}
              style={{
                width: '100%',
                backgroundColor: color,
                borderRadius: 3,
                opacity: isToday ? 1 : 0.75,
                border: isToday ? `1.5px solid ${color}` : 'none',
              }}
            />
            {isToday && (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
