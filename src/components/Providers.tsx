'use client'

import { useEffect } from 'react'
import { useFirestore } from '@/hooks/useFirestore'
import { useFCMToken } from '@/hooks/useFCMToken'
import { InstallBanner } from '@/components/InstallBanner'
import { Onboarding } from '@/components/Onboarding'

function FirestoreInitializer() {
  useFirestore()
  useFCMToken()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register both service workers:
    // sw.js — caching + in-app notification delivery
    // firebase-messaging-sw.js — background FCM push delivery
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {})
    }
  }, [])

  return (
    <>
      <FirestoreInitializer />
      {children}
      <Onboarding />
      <InstallBanner />
    </>
  )
}
