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
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
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
