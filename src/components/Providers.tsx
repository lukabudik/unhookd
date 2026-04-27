'use client'

import { useEffect } from 'react'
import { useFirestore } from '@/hooks/useFirestore'
import { InstallBanner } from '@/components/InstallBanner'

function FirestoreInitializer() {
  useFirestore()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed silently
      })
    }
  }, [])

  return (
    <>
      <FirestoreInitializer />
      {children}
      <InstallBanner />
    </>
  )
}
