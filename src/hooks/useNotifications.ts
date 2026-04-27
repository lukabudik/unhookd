'use client'

import { useState, useEffect, useCallback } from 'react'

const REMINDER_KEY = 'unhookd_reminder_time'
const PERMISSION_ASKED_KEY = 'unhookd_notif_asked'
const WEEKLY_SENT_KEY = 'unhookd_weekly_sent'
const MONDAY_SENT_KEY = 'unhookd_monday_sent'
const REENGAGEMENT_SENT_KEY = 'unhookd_reengagement_sent'
const MILESTONES_SENT_KEY = 'unhookd_milestones_sent'

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export type NotifType =
  | 'daily_reminder'
  | 'streak_milestone'
  | 'weekly_summary'
  | 'monday_target'
  | 'evening_checkin'
  | 're_engagement'
  | 'hold_ending'

// ─── Data helpers ──────────────────────────────────────────────────────────

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

function getDateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

type LocalPlan = {
  startAmount: number
  targetAmount: number
  startDate: string
  weeksToTarget: number
  daysToTarget?: number
  currentDailyTarget: number
  holdUntil?: string
}

function getLocalPlan(): LocalPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('unhookd_plan')
    return raw ? (JSON.parse(raw) as LocalPlan) : null
  } catch {
    return null
  }
}

function getDailyTotal(dateKey: string): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(`unhookd_intakes_${dateKey}`)
    if (!raw) return 0
    const entries = JSON.parse(raw) as Array<{ amount: number }>
    return entries.reduce((s, e) => s + e.amount, 0)
  } catch {
    return 0
  }
}

function hasLoggedToday(): boolean {
  return getDailyTotal(getTodayKey()) > 0
}

function hasCheckedInToday(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(`unhookd_checkin_${getTodayKey()}`)
}

function getDailyTarget(plan: LocalPlan, date = new Date()): number {
  const totalDays = plan.daysToTarget !== undefined ? plan.daysToTarget : plan.weeksToTarget * 7
  if (totalDays === 0) return plan.targetAmount
  const daysDiff = Math.floor((date.getTime() - new Date(plan.startDate).getTime()) / 86400000)
  if (daysDiff < 0) return plan.startAmount
  if (daysDiff >= totalDays) return plan.targetAmount
  if (plan.holdUntil && new Date(plan.holdUntil) >= date) {
    return getDailyTarget(plan, new Date(plan.startDate))
  }
  return Math.max(
    plan.targetAmount,
    plan.startAmount - ((plan.startAmount - plan.targetAmount) / totalDays) * daysDiff
  )
}

function formatG(g: number): string {
  const rounded = Math.round(g * 10) / 10
  return `${rounded}g`
}

function getCurrentStreak(plan: LocalPlan): number {
  if (typeof window === 'undefined') return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let count = 0
  for (let i = 1; i <= 90; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = getDateKey(d)
    const total = getDailyTotal(key)
    const target = getDailyTarget(plan, d)
    if (total > 0 && total <= target) count++
    else break
  }
  return count
}

function getDayNumber(plan: LocalPlan): number {
  return Math.floor((Date.now() - new Date(plan.startDate).getTime()) / 86400000) + 1
}

function getLastLoggedDate(): Date | null {
  if (typeof window === 'undefined') return null
  for (let i = 0; i <= 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (getDailyTotal(getDateKey(d)) > 0) return d
  }
  return null
}

function getSentMilestones(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(MILESTONES_SENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function markMilestoneSent(streak: number) {
  const sent = getSentMilestones()
  if (!sent.includes(streak)) {
    localStorage.setItem(MILESTONES_SENT_KEY, JSON.stringify([...sent, streak]))
  }
}

// ─── Notification builders ─────────────────────────────────────────────────

export const NOTIFICATION_TYPES: Record<NotifType, { label: string; description: string }> = {
  daily_reminder: {
    label: 'Daily reminder',
    description: 'Context-aware dose check-in based on time and streak',
  },
  streak_milestone: {
    label: 'Streak milestone',
    description: 'Fired when you hit 3, 7, 14, 30 day milestones',
  },
  weekly_summary: {
    label: 'Weekly summary',
    description: 'Sunday evening recap of the past 7 days',
  },
  monday_target: {
    label: 'New week target',
    description: 'Monday morning: new dose target for the week',
  },
  evening_checkin: {
    label: 'Evening check-in',
    description: 'Prompted if daily check-in not done by 8 pm',
  },
  re_engagement: {
    label: 'Re-engagement',
    description: 'Gentle nudge after 2+ days with no logging',
  },
  hold_ending: { label: 'Hold ending', description: 'Heads-up the day before a dose hold expires' },
}

function buildDailyReminder(): { title: string; body: string } {
  const plan = getLocalPlan()
  const logged = hasLoggedToday()
  const hour = new Date().getHours()
  const streak = plan ? getCurrentStreak(plan) : 0
  const target = plan ? getDailyTarget(plan) : null
  const todayTotal = getDailyTotal(getTodayKey())
  const dayNum = plan ? getDayNumber(plan) : 0

  if (logged && target !== null) {
    const over = todayTotal > target
    if (over) {
      return {
        title: "Over target today — that's okay",
        body: "One hard day doesn't define the journey. Open the app to breathe through it.",
      }
    }
    if (streak >= 7)
      return {
        title: `${streak} days straight`,
        body: `${formatG(todayTotal)} logged today. You\'re on track.`,
      }
    if (streak >= 3)
      return {
        title: 'Checked in',
        body: `${streak}-day streak alive. ${formatG(todayTotal)} logged today.`,
      }
    return { title: 'Logged today', body: `${formatG(todayTotal)} down. Keep it consistent.` }
  }

  // Not logged yet
  if (streak >= 14)
    return {
      title: `Don\'t break day ${streak + 1}`,
      body: `${streak} days in a row — log your dose to keep going.`,
    }
  if (streak >= 7)
    return { title: `${streak}-day streak at stake`, body: 'Log your dose today to keep it alive.' }
  if (streak >= 3)
    return {
      title: 'Check in today',
      body: `${streak} days going. Target: ${target ? formatG(target) : 'set in app'}.`,
    }

  if (hour >= 20)
    return {
      title: 'Still time to log',
      body: target
        ? `Today\'s target is ${formatG(target)}. Don\'t let the day go untracked.`
        : 'Log before the day ends.',
    }
  if (hour >= 17)
    return {
      title: 'Evening check-in',
      body: target
        ? `Target today: ${formatG(target)}. How\'s it going?`
        : 'Time to log your dose.',
    }
  if (hour < 10)
    return {
      title: `Good morning — day ${dayNum}`,
      body: target
        ? `Your target today is ${formatG(target)}.`
        : 'Track your dose when you take it.',
    }

  return {
    title: 'Unhookd check-in',
    body: target
      ? `Target: ${formatG(target)} today. Log when you dose.`
      : 'Time to log your dose.',
  }
}

function buildStreakMilestone(streak: number): { title: string; body: string } {
  const plan = getLocalPlan()
  const dayNum = plan ? getDayNumber(plan) : streak
  const reductionSoFar = plan ? Math.round((plan.startAmount - getDailyTarget(plan)) * 10) / 10 : 0

  if (streak >= 90)
    return {
      title: '90 days. Remarkable.',
      body: `${dayNum} days into the journey. Every day now is real neurological recovery.`,
    }
  if (streak >= 60)
    return {
      title: '60 consecutive days',
      body: `Two months of honest tracking. ${reductionSoFar > 0 ? `You\'ve reduced by ${formatG(reductionSoFar)} from your start.` : 'Keep going.'}`,
    }
  if (streak >= 30)
    return {
      title: '30-day streak',
      body: `One month straight. ${reductionSoFar > 0 ? `Down ${formatG(reductionSoFar)} from where you started.` : 'This is real momentum.'}`,
    }
  if (streak >= 21)
    return {
      title: '3 weeks in a row',
      body: 'The habit is forming. Your brain is starting to remember what this feels like.',
    }
  if (streak >= 14)
    return {
      title: '14 days straight',
      body: 'Two weeks consistent. This is where real taper progress happens.',
    }
  if (streak >= 7)
    return {
      title: 'One week streak',
      body: 'Seven days in a row. This is where habits start to take hold.',
    }
  return {
    title: '3-day streak',
    body: 'Three days of honest tracking. Every day you log builds the picture.',
  }
}

function buildWeeklySummary(): { title: string; body: string } {
  const plan = getLocalPlan()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let daysLogged = 0
  let daysOnTarget = 0

  for (let i = 1; i <= 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const total = getDailyTotal(getDateKey(d))
    if (total > 0) {
      daysLogged++
      if (plan && total <= getDailyTarget(plan, d)) daysOnTarget++
    }
  }

  if (daysLogged === 0)
    return {
      title: 'Weekly check-in',
      body: "No doses logged this week. It's never too late to start tracking again.",
    }

  const target = plan ? getDailyTarget(plan) : null
  const reduction = plan
    ? Math.round((plan.startAmount - (target ?? plan.startAmount)) * 10) / 10
    : 0

  if (daysOnTarget === daysLogged)
    return {
      title: `Perfect week — ${daysLogged}/7 days on target`,
      body:
        reduction > 0
          ? `You\'re ${formatG(reduction)} below your starting dose. The taper is working.`
          : 'Every logged day on target. Strong week.',
    }
  if (daysOnTarget >= Math.ceil(daysLogged * 0.7))
    return {
      title: `Solid week — ${daysLogged}/7 logged`,
      body: `On target ${daysOnTarget} of ${daysLogged} days. More good days than not.`,
    }
  return {
    title: `${daysLogged}/7 days logged`,
    body: `${daysOnTarget} on target. Rough week happens — the data is what matters. Keep going.`,
  }
}

function buildMondayTarget(): { title: string; body: string } {
  const plan = getLocalPlan()
  if (!plan) return { title: 'New week', body: 'Open Unhookd to track your doses this week.' }
  const target = getDailyTarget(plan)
  const prevTarget = getDailyTarget(
    plan,
    (() => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return d
    })()
  )
  const drop = Math.round((prevTarget - target) * 10) / 10
  if (drop > 0)
    return {
      title: `New week — target drops to ${formatG(target)}`,
      body: `Down ${formatG(drop)} from last week. Step by step.`,
    }
  return {
    title: `New week — target: ${formatG(target)}/day`,
    body: 'Same target as last week. Consistency is the goal.',
  }
}

function buildEveningCheckin(): { title: string; body: string } {
  const plan = getLocalPlan()
  const logged = hasLoggedToday()
  if (!logged && plan) {
    const target = getDailyTarget(plan)
    return {
      title: "Evening — haven't logged yet",
      body: `Today\'s target is ${formatG(target)}. Log before you sleep.`,
    }
  }
  return {
    title: 'Evening check-in',
    body: 'How was today? 30 seconds to record your mood before bed.',
  }
}

function buildReEngagement(daysSince: number): { title: string; body: string } {
  if (daysSince >= 5)
    return {
      title: `${daysSince} days — still here?`,
      body: "No judgment. Come back and log when you're ready. The data is still yours.",
    }
  if (daysSince >= 3)
    return {
      title: 'A few days since your last log',
      body: 'Gaps happen. Open Unhookd and pick up where you left off.',
    }
  return { title: '2 days since your last log', body: "Quick check-in — how's the taper going?" }
}

function buildHoldEnding(): { title: string; body: string } {
  const plan = getLocalPlan()
  if (!plan)
    return {
      title: 'Hold ending tomorrow',
      body: 'Your taper resumes tomorrow. Check your target in the app.',
    }
  const target = getDailyTarget(
    plan,
    (() => {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      return d
    })()
  )
  return {
    title: 'Hold ends tomorrow',
    body: `Taper resumes at ${formatG(target)}/day. You rested — now back to it.`,
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [permission, setPermission] = useState<NotifPermission>('default')
  const [reminderTime, setReminderTimeState] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as NotifPermission)
    const stored = localStorage.getItem(REMINDER_KEY)
    if (stored) setReminderTimeState(stored)
  }, [])

  const sendNotification = useCallback(
    (title: string, body: string, tag = 'unhookd-reminder', url = '/') => {
      if (typeof window === 'undefined' || Notification.permission !== 'granted') return
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body,
          url,
        })
      } else {
        new Notification(title, { body, icon: '/icon-192.png', tag })
      }
    },
    []
  )

  // App-open proactive checks: re-engagement, hold ending, streak milestone
  useEffect(() => {
    if (typeof window === 'undefined' || Notification.permission !== 'granted') return

    const plan = getLocalPlan()
    if (!plan) return

    const today = getTodayKey()

    // Re-engagement: last logged 2+ days ago
    const lastLogged = getLastLoggedDate()
    // Only re-engage if user has logged before (lastLogged !== null) — never fire for brand new users
    const daysSinceLogged = lastLogged
      ? Math.floor((Date.now() - lastLogged.getTime()) / 86400000)
      : 0
    const reSentKey = `${REENGAGEMENT_SENT_KEY}_${today}`
    if (daysSinceLogged >= 2 && !localStorage.getItem(reSentKey)) {
      localStorage.setItem(reSentKey, '1')
      const { title, body } = buildReEngagement(daysSinceLogged)
      sendNotification(title, body, 'unhookd-reengagement')
    }

    // Hold ending tomorrow
    if (plan.holdUntil) {
      const holdEnd = new Date(plan.holdUntil)
      holdEnd.setHours(0, 0, 0, 0)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      if (holdEnd.getTime() === tomorrow.getTime()) {
        const holdSentKey = `unhookd_hold_ending_${today}`
        if (!localStorage.getItem(holdSentKey)) {
          localStorage.setItem(holdSentKey, '1')
          const { title, body } = buildHoldEnding()
          sendNotification(title, body, 'unhookd-hold')
        }
      }
    }

    // Streak milestone
    const streak = getCurrentStreak(plan)
    const MILESTONES = [3, 7, 14, 21, 30, 60, 90]
    if (MILESTONES.includes(streak)) {
      const sent = getSentMilestones()
      if (!sent.includes(streak)) {
        markMilestoneSent(streak)
        const { title, body } = buildStreakMilestone(streak)
        sendNotification(title, body, `unhookd-milestone-${streak}`)
      }
    }
  }, [sendNotification])

  // Daily reminder scheduler
  useEffect(() => {
    if (permission !== 'granted' || !reminderTime) return
    const [hours, minutes] = reminderTime.split(':').map(Number)

    function scheduleNext() {
      const now = new Date()
      const next = new Date()
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return setTimeout(() => {
        const { title, body } = buildDailyReminder()
        sendNotification(title, body)
        scheduleNext()
      }, next.getTime() - now.getTime())
    }

    const id = scheduleNext()
    return () => clearTimeout(id)
  }, [permission, reminderTime, sendNotification])

  // Evening check-in: 20:00 if not checked in
  useEffect(() => {
    if (permission !== 'granted') return

    function scheduleEvening() {
      const now = new Date()
      const next = new Date()
      next.setHours(20, 0, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return setTimeout(() => {
        if (!hasCheckedInToday()) {
          const { title, body } = buildEveningCheckin()
          sendNotification(title, body, 'unhookd-evening')
        }
        scheduleEvening()
      }, next.getTime() - now.getTime())
    }

    const id = scheduleEvening()
    return () => clearTimeout(id)
  }, [permission, sendNotification])

  // Weekly summary: Sunday 20:30
  useEffect(() => {
    if (permission !== 'granted') return

    function scheduleWeekly() {
      const now = new Date()
      const next = new Date()
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7
      next.setDate(now.getDate() + daysUntilSunday)
      next.setHours(20, 30, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 7)

      return setTimeout(() => {
        const weekKey = `${next.getFullYear()}-W${next.getDay()}-${next.getDate()}`
        if (localStorage.getItem(WEEKLY_SENT_KEY) !== weekKey) {
          localStorage.setItem(WEEKLY_SENT_KEY, weekKey)
          const { title, body } = buildWeeklySummary()
          sendNotification(title, body, 'unhookd-weekly')
        }
        scheduleWeekly()
      }, next.getTime() - now.getTime())
    }

    const id = scheduleWeekly()
    return () => clearTimeout(id)
  }, [permission, sendNotification])

  // Monday new target: Monday 08:00
  useEffect(() => {
    if (permission !== 'granted') return

    function scheduleMonday() {
      const now = new Date()
      const next = new Date()
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7
      next.setDate(now.getDate() + daysUntilMonday)
      next.setHours(8, 0, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 7)

      return setTimeout(() => {
        const key = `${next.getFullYear()}-W${next.getDate()}`
        if (localStorage.getItem(MONDAY_SENT_KEY) !== key) {
          localStorage.setItem(MONDAY_SENT_KEY, key)
          const { title, body } = buildMondayTarget()
          sendNotification(title, body, 'unhookd-monday')
        }
        scheduleMonday()
      }, next.getTime() - now.getTime())
    }

    const id = scheduleMonday()
    return () => clearTimeout(id)
  }, [permission, sendNotification])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    localStorage.setItem(PERMISSION_ASKED_KEY, 'true')
    const result = await Notification.requestPermission()
    setPermission(result as NotifPermission)
    return result === 'granted'
  }, [])

  const setReminderTime = useCallback((time: string | null) => {
    if (time) localStorage.setItem(REMINDER_KEY, time)
    else localStorage.removeItem(REMINDER_KEY)
    setReminderTimeState(time)
  }, [])

  // Exposed for the test panel in Settings
  const fireTestNotification = useCallback(
    (type: NotifType) => {
      const plan = getLocalPlan()
      let title: string, body: string

      switch (type) {
        case 'daily_reminder': {
          const m = buildDailyReminder()
          title = m.title
          body = m.body
          break
        }
        case 'streak_milestone': {
          const m = buildStreakMilestone(plan ? getCurrentStreak(plan) || 7 : 7)
          title = m.title
          body = m.body
          break
        }
        case 'weekly_summary': {
          const m = buildWeeklySummary()
          title = m.title
          body = m.body
          break
        }
        case 'monday_target': {
          const m = buildMondayTarget()
          title = m.title
          body = m.body
          break
        }
        case 'evening_checkin': {
          const m = buildEveningCheckin()
          title = m.title
          body = m.body
          break
        }
        case 're_engagement': {
          const m = buildReEngagement(2)
          title = m.title
          body = m.body
          break
        }
        case 'hold_ending': {
          const m = buildHoldEnding()
          title = m.title
          body = m.body
          break
        }
      }

      sendNotification(title, body, `unhookd-test-${type}`)
    },
    [sendNotification]
  )

  const hasBeenAsked =
    typeof window !== 'undefined' ? !!localStorage.getItem(PERMISSION_ASKED_KEY) : false

  return {
    permission,
    reminderTime,
    setReminderTime,
    requestPermission,
    hasBeenAsked,
    fireTestNotification,
  }
}
