'use client'

import { useState, useEffect, useCallback } from 'react'

const REMINDER_KEY = 'unhookd_reminder_time'
const PERMISSION_ASKED_KEY = 'unhookd_notif_asked'
const WEEKLY_SENT_KEY = 'unhookd_weekly_sent'

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported'

// ─── Helpers to read localStorage data for smart copy ─────────────────────

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

function hasLoggedToday(): boolean {
  if (typeof window === 'undefined') return false
  const raw = localStorage.getItem(`unhookd_intakes_${getTodayKey()}`)
  if (!raw) return false
  try {
    const entries = JSON.parse(raw) as Array<{ amount: number }>
    return entries.length > 0
  } catch {
    return false
  }
}

function getTodayTotal(): number {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(`unhookd_intakes_${getTodayKey()}`)
  if (!raw) return 0
  try {
    const entries = JSON.parse(raw) as Array<{ amount: number }>
    return entries.reduce((s, e) => s + e.amount, 0)
  } catch {
    return 0
  }
}

function getCurrentStreak(): number {
  if (typeof window === 'undefined') return 0
  try {
    const planRaw = localStorage.getItem('unhookd_plan')
    if (!planRaw) return 0
    const plan = JSON.parse(planRaw) as { startAmount: number; targetAmount: number; startDate: string; weeksToTarget: number; currentDailyTarget: number }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let count = 0
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const raw = localStorage.getItem(`unhookd_intakes_${key}`)
      if (!raw) break
      const entries = JSON.parse(raw) as Array<{ amount: number }>
      const total = entries.reduce((s: number, e: { amount: number }) => s + e.amount, 0)
      const targetDays = plan.weeksToTarget * 7
      const daysDiff = Math.floor((today.getTime() - new Date(plan.startDate).getTime()) / 86400000) - i
      const dailyTarget = daysDiff < 0 ? plan.startAmount : daysDiff >= targetDays ? plan.targetAmount : Math.max(plan.targetAmount, plan.startAmount - ((plan.startAmount - plan.targetAmount) / targetDays) * daysDiff)
      if (total > 0 && total <= dailyTarget) count++
      else break
    }
    return count
  } catch {
    return 0
  }
}

function getWeekStats(): { daysLogged: number; daysOnTarget: number; streak: number } {
  if (typeof window === 'undefined') return { daysLogged: 0, daysOnTarget: 0, streak: 0 }
  try {
    const planRaw = localStorage.getItem('unhookd_plan')
    const plan = planRaw ? JSON.parse(planRaw) as { startAmount: number; targetAmount: number; weeksToTarget: number; startDate: string; currentDailyTarget: number } : null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let daysLogged = 0; let daysOnTarget = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const raw = localStorage.getItem(`unhookd_intakes_${key}`)
      if (!raw) continue
      const entries = JSON.parse(raw) as Array<{ amount: number }>
      const total = entries.reduce((s: number, e: { amount: number }) => s + e.amount, 0)
      if (total > 0) {
        daysLogged++
        if (plan) {
          const totalDays = plan.weeksToTarget * 7
          const daysDiff = Math.floor((today.getTime() - new Date(plan.startDate).getTime()) / 86400000) - i
          const target = daysDiff < 0 ? plan.startAmount : daysDiff >= totalDays ? plan.targetAmount : Math.max(plan.targetAmount, plan.startAmount - ((plan.startAmount - plan.targetAmount) / totalDays) * daysDiff)
          if (total <= target) daysOnTarget++
        }
      }
    }
    return { daysLogged, daysOnTarget, streak: getCurrentStreak() }
  } catch {
    return { daysLogged: 0, daysOnTarget: 0, streak: 0 }
  }
}

// ─── Smart notification copy ───────────────────────────────────────────────

function buildReminderMessage(): { title: string; body: string } {
  const logged = hasLoggedToday()
  const streak = getCurrentStreak()
  const total = getTodayTotal()

  if (logged) {
    if (streak >= 3) {
      return {
        title: `${streak}-day streak 🔥`,
        body: `You've already logged today — ${streak} days in a row. Keep it going.`,
      }
    }
    return {
      title: 'Logged ✓',
      body: "You've already checked in today. Well done.",
    }
  }

  // Not logged yet
  if (streak >= 7) {
    return {
      title: `Don't break the streak 🔥`,
      body: `${streak} days in a row. Log your dose to keep it alive.`,
    }
  }
  if (streak >= 3) {
    return {
      title: 'Check in today',
      body: `${streak}-day streak going. Log your dose and keep the momentum.`,
    }
  }

  const hour = new Date().getHours()
  if (hour >= 20) {
    return {
      title: 'End of day check-in',
      body: "Haven't logged yet today — do it now while you remember.",
    }
  }

  return {
    title: 'Unhookd check-in',
    body: "Time to log your dose and see how you're doing.",
  }
}

function buildWeeklySummaryMessage(): { title: string; body: string } {
  const { daysLogged, daysOnTarget, streak } = getWeekStats()
  if (daysLogged === 0) {
    return {
      title: 'Weekly check-in',
      body: 'Open Unhookd and log your doses this week — the data helps you see patterns.',
    }
  }
  const onTargetStr = daysOnTarget > 0 ? `On target ${daysOnTarget} of ${daysLogged} logged days.` : ''
  const streakStr = streak > 0 ? ` ${streak}-day streak 🔥` : ''
  return {
    title: `Week in review — ${daysLogged}/7 days logged`,
    body: [onTargetStr, streakStr].filter(Boolean).join(' ') || 'Keep going this week.',
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [permission, setPermission] = useState<NotifPermission>('default')
  const [reminderTime, setReminderTimeState] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) { setPermission('unsupported'); return }
    setPermission(Notification.permission as NotifPermission)
    const stored = localStorage.getItem(REMINDER_KEY)
    if (stored) setReminderTimeState(stored)
  }, [])

  // Daily reminder scheduler
  useEffect(() => {
    if (permission !== 'granted' || !reminderTime) return
    const [hours, minutes] = reminderTime.split(':').map(Number)

    function scheduleNext() {
      const now = new Date()
      const next = new Date()
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return setTimeout(() => { fireReminder(); scheduleNext() }, next.getTime() - now.getTime())
    }

    const timerId = scheduleNext()
    return () => clearTimeout(timerId)
  }, [permission, reminderTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Weekly summary — Sunday at 20:00
  useEffect(() => {
    if (permission !== 'granted') return

    function scheduleWeekly() {
      const now = new Date()
      const next = new Date()
      // Next Sunday at 20:00
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7
      next.setDate(now.getDate() + daysUntilSunday)
      next.setHours(20, 0, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 7)

      return setTimeout(() => {
        // Only send once per week
        const lastSent = localStorage.getItem(WEEKLY_SENT_KEY)
        const weekKey = `${next.getFullYear()}-W${Math.ceil(next.getDate() / 7)}`
        if (lastSent !== weekKey) {
          fireWeeklySummary()
          localStorage.setItem(WEEKLY_SENT_KEY, weekKey)
        }
        scheduleWeekly()
      }, next.getTime() - now.getTime())
    }

    const timerId = scheduleWeekly()
    return () => clearTimeout(timerId)
  }, [permission]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendNotification = useCallback((title: string, body: string, tag = 'unhookd-reminder') => {
    if (typeof window === 'undefined') return
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body, url: '/' })
    } else if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png', tag })
    }
  }, [])

  const fireReminder = useCallback(() => {
    const { title, body } = buildReminderMessage()
    sendNotification(title, body)
  }, [sendNotification])

  const fireWeeklySummary = useCallback(() => {
    const { title, body } = buildWeeklySummaryMessage()
    sendNotification(title, body, 'unhookd-weekly')
  }, [sendNotification])

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

  const hasBeenAsked = typeof window !== 'undefined' ? !!localStorage.getItem(PERMISSION_ASKED_KEY) : false

  return { permission, reminderTime, setReminderTime, requestPermission, hasBeenAsked }
}
