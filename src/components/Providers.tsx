'use client'

import { useEffect } from 'react'
import { useFirestore } from '@/hooks/useFirestore'
import { useFCMToken } from '@/hooks/useFCMToken'
import { InstallBanner } from '@/components/InstallBanner'
import { Onboarding } from '@/components/Onboarding'

// Singleton SW registration shared between Providers and useFCMToken
let swRegistrationPromise: Promise<ServiceWorkerRegistration | undefined> | null = null

export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(undefined)
  }
  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.debug('[SW] registered:', reg.scope)
        return reg
      })
      .catch((err) => {
        console.debug('[SW] registration failed:', err)
        return undefined
      })
  }
  return swRegistrationPromise
}

function FirestoreInitializer() {
  useFirestore()
  useFCMToken()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Kick off SW registration immediately. useFCMToken reads the same promise.
    getServiceWorkerRegistration()
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
