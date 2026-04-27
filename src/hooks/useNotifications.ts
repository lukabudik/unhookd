'use client'

import { useState, useEffect, useCallback } from 'react'

const REMINDER_KEY = 'unhookd_reminder_time'
const PERMISSION_ASKED_KEY = 'unhookd_notif_asked'

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported'

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

  // Schedule next reminder via setTimeout — fires even if the tab is hidden,
  // but not if the browser/tab is fully closed. Good enough for a PWA on mobile.
  useEffect(() => {
    if (permission !== 'granted' || !reminderTime) return

    const [hours, minutes] = reminderTime.split(':').map(Number)

    function scheduleNext() {
      const now = new Date()
      const next = new Date()
      next.setHours(hours, minutes, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      const delay = next.getTime() - now.getTime()

      return setTimeout(() => {
        fireReminder()
        scheduleNext()
      }, delay)
    }

    const timerId = scheduleNext()
    return () => clearTimeout(timerId)
  }, [permission, reminderTime])

  const fireReminder = useCallback(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: 'Unhookd check-in',
        body: "Time to log your dose and see how you're doing.",
        url: '/',
      })
    } else if (Notification.permission === 'granted') {
      new Notification('Unhookd check-in', {
        body: "Time to log your dose and see how you're doing.",
        icon: '/icon-192.png',
        tag: 'unhookd-reminder',
      })
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false

    localStorage.setItem(PERMISSION_ASKED_KEY, 'true')

    const result = await Notification.requestPermission()
    setPermission(result as NotifPermission)
    return result === 'granted'
  }, [])

  const setReminderTime = useCallback((time: string | null) => {
    if (time) {
      localStorage.setItem(REMINDER_KEY, time)
    } else {
      localStorage.removeItem(REMINDER_KEY)
    }
    setReminderTimeState(time)
  }, [])

  const hasBeenAsked = typeof window !== 'undefined'
    ? !!localStorage.getItem(PERMISSION_ASKED_KEY)
    : false

  return {
    permission,
    reminderTime,
    setReminderTime,
    requestPermission,
    hasBeenAsked,
  }
}
