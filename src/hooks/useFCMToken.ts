'use client'

import { useEffect } from 'react'
import { getOrCreateRecoveryCode } from '@/lib/recovery'

const VAPID_KEY =
  'BHETp2qVlTYj8slxzGwUhbtYcj7qwlt1OdG2Gzhv-FSBWqgDbVlQZ1ggMzZoRjajxGzYAfMsLV-jYb7sgh2IJWE'
const FCM_TOKEN_KEY = 'unhookd_fcm_token'

export function useFCMToken() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    let cancelled = false

    async function registerToken() {
      try {
        const { auth, db } = await import('@/lib/firebase')
        const { onAuthStateChanged } = await import('firebase/auth')

        const user = await new Promise<import('firebase/auth').User | null>((resolve) => {
          const unsub = onAuthStateChanged(auth, (u) => {
            unsub()
            resolve(u)
          })
        })
        if (!user || cancelled) return

        // Use getRegistration instead of importing from Providers to avoid a
        // circular dependency (Providers → useFCMToken → Providers) that breaks
        // module evaluation order in Safari's JS engine
        const swReg = await navigator.serviceWorker.getRegistration('/')
        if (!swReg || cancelled) return

        const { getMessaging, getToken } = await import('firebase/messaging')
        const messaging = getMessaging()

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        })
        if (!token || cancelled) return

        const stored = localStorage.getItem(FCM_TOKEN_KEY)
        if (stored === token) return
        localStorage.setItem(FCM_TOKEN_KEY, token)

        const recoveryCode = getOrCreateRecoveryCode()
        if (!recoveryCode) return

        const reminderTime = localStorage.getItem('unhookd_reminder_time') || null
        const utcOffsetMinutes = -new Date().getTimezoneOffset()

        const { doc, setDoc } = await import('firebase/firestore')
        await setDoc(
          doc(db, 'users', recoveryCode, 'fcm', 'token'),
          {
            token,
            updatedAt: new Date().toISOString(),
            reminderTime,
            utcOffsetMinutes,
            platform: /iPhone|iPad|iPod|Android/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          },
          { merge: true }
        )
      } catch (err) {
        console.debug('[FCM] token registration skipped:', err)
      }
    }

    registerToken()
    return () => {
      cancelled = true
    }
  }, [])
}
