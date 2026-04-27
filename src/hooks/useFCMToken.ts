'use client'

import { useEffect } from 'react'
import { getOrCreateRecoveryCode } from '@/lib/recovery'
import { getServiceWorkerRegistration } from '@/components/Providers'

const VAPID_KEY =
  'BHETp2qVlTYj8slxzGwUhbtYcj7qwlt1OdG2Gzhv-FSBWqgDbVlQZ1ggMzZoRjajxGzYAfMsLV-jYb7sgh2IJWE'
const FCM_TOKEN_KEY = 'unhookd_fcm_token'

// Registers the device with FCM and persists the token to Firestore so the
// Cloud Function can send push notifications when the app is closed.
export function useFCMToken() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    let cancelled = false

    async function registerToken() {
      try {
        const { auth, db } = await import('@/lib/firebase')
        const { onAuthStateChanged } = await import('firebase/auth')

        // Wait for Firebase auth to resolve from IndexedDB (auth.currentUser is
        // null synchronously; onAuthStateChanged fires once the state is loaded)
        const user = await new Promise<import('firebase/auth').User | null>((resolve) => {
          const unsub = onAuthStateChanged(auth, (u) => {
            unsub()
            resolve(u)
          })
        })

        if (!user || cancelled) return

        // Get the shared SW registration (same instance used for push subscriptions)
        const swReg = await getServiceWorkerRegistration()
        if (!swReg || cancelled) return

        const { getMessaging, getToken } = await import('firebase/messaging')
        const messaging = getMessaging()

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        })
        if (!token || cancelled) return

        // Skip Firestore write if token hasn't changed
        const stored = localStorage.getItem(FCM_TOKEN_KEY)
        if (stored === token) return
        localStorage.setItem(FCM_TOKEN_KEY, token)

        const recoveryCode = getOrCreateRecoveryCode()
        if (!recoveryCode) return

        const reminderTime = localStorage.getItem('unhookd_reminder_time') || null
        // JS getTimezoneOffset() returns minutes BEHIND UTC (e.g. UTC+1 → -60)
        // We store the offset FROM UTC (positive east)
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
        // FCM not available in this environment (e.g. local dev without HTTPS) — silent fail
        console.debug('[FCM] token registration skipped:', err)
      }
    }

    registerToken()
    return () => {
      cancelled = true
    }
  }, [])
}
