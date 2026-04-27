'use client'

import { useEffect, useState, useCallback } from 'react'
import { IntakeEntry, TaperPlan, useAppStore } from '@/lib/store'
import { getTodayKey, getDailyTargetForDate, dateToKey } from '@/lib/utils'
import { getOrCreateRecoveryCode } from '@/lib/recovery'

const LOCAL_PLAN_KEY = 'unhookd_plan'
const LOCAL_INTAKES_PREFIX = 'unhookd_intakes_'

function loadLocalPlan(): TaperPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_PLAN_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveLocalPlan(plan: TaperPlan): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(plan))
}

function loadLocalIntakes(dateKey: string): IntakeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${LOCAL_INTAKES_PREFIX}${dateKey}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<IntakeEntry & { timestamp: string }>
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
  } catch {
    return []
  }
}

function saveLocalIntakes(dateKey: string, intakes: IntakeEntry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${LOCAL_INTAKES_PREFIX}${dateKey}`, JSON.stringify(intakes))
}

function loadLocalIntakesForDate(dateKey: string): IntakeEntry[] {
  return loadLocalIntakes(dateKey)
}

export function useFirestore() {
  const { setUserId, setTodayIntakes, setTaperPlan, todayIntakes, taperPlan } = useAppStore()
  const [loading, setLoading] = useState(true)
  // recoveryCode is stable per-device and used as the Firestore data path key
  const [recoveryCode, setLocalRecoveryCode] = useState<string>('')
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [firestoreDb, setFirestoreDb] = useState<import('firebase/firestore').Firestore | null>(
    null
  )

  // Initialize Firebase (anonymous auth for security rules) and load recovery code
  useEffect(() => {
    let mounted = true

    const code = getOrCreateRecoveryCode()
    if (mounted) {
      setLocalRecoveryCode(code)
      setUserId(code)
    }

    async function initFirebase() {
      try {
        const { db, auth } = await import('@/lib/firebase')
        const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth')

        if (!mounted) return

        setFirestoreDb(db)

        onAuthStateChanged(auth, async (user) => {
          if (!mounted) return
          if (user) {
            setFirebaseReady(true)
          } else {
            try {
              await signInAnonymously(auth)
            } catch {
              // Firebase auth failed — localStorage-only mode
            }
          }
        })
      } catch {
        // Firebase not configured — localStorage-only mode
        if (mounted) setFirebaseReady(false)
      }
    }

    initFirebase()
    return () => {
      mounted = false
    }
  }, [setUserId])

  // Load data once we have a recovery code
  useEffect(() => {
    if (!recoveryCode) return

    let mounted = true

    async function loadData() {
      const todayKey = getTodayKey()

      if (firebaseReady && firestoreDb) {
        try {
          const { collection, query, where, getDocs, Timestamp, doc, getDoc } =
            await import('firebase/firestore')

          // Load taper plan
          const planRef = doc(firestoreDb, 'users', recoveryCode, 'data', 'plan')
          const planSnap = await getDoc(planRef)
          if (planSnap.exists() && mounted) {
            setTaperPlan(planSnap.data() as TaperPlan)
          } else {
            const localPlan = loadLocalPlan()
            if (localPlan && mounted) setTaperPlan(localPlan)
          }

          // Load today's intakes
          const startOfDay = new Date()
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date()
          endOfDay.setHours(23, 59, 59, 999)

          const intakesRef = collection(firestoreDb, 'users', recoveryCode, 'intakes')
          const q = query(
            intakesRef,
            where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay))
          )
          const snap = await getDocs(q)
          if (mounted) {
            const intakes: IntakeEntry[] = snap.docs.map((d) => {
              const data = d.data()
              return {
                id: d.id,
                amount: data.amount,
                timestamp: (data.timestamp as import('firebase/firestore').Timestamp).toDate(),
                note: data.note,
                mood: data.mood,
              }
            })
            setTodayIntakes(intakes)
          }
        } catch {
          const localPlan = loadLocalPlan()
          if (localPlan && mounted) setTaperPlan(localPlan)
          const localIntakes = loadLocalIntakes(todayKey)
          if (mounted) setTodayIntakes(localIntakes)
        }
      } else {
        const localPlan = loadLocalPlan()
        if (localPlan && mounted) setTaperPlan(localPlan)
        const localIntakes = loadLocalIntakes(todayKey)
        if (mounted) setTodayIntakes(localIntakes)
      }

      if (mounted) setLoading(false)
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [recoveryCode, firebaseReady, firestoreDb, setTaperPlan, setTodayIntakes])

  const addIntake = useCallback(
    async (entry: Omit<IntakeEntry, 'id'>) => {
      const newEntry: IntakeEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }

      const entryDateKey = dateToKey(new Date(entry.timestamp))
      const todayKey = getTodayKey()

      if (entryDateKey === todayKey) {
        const updated = [...todayIntakes, newEntry]
        setTodayIntakes(updated)
        saveLocalIntakes(todayKey, updated)
      } else {
        // Past date: persist to that day's key without touching today's store state
        const existing = loadLocalIntakes(entryDateKey)
        saveLocalIntakes(entryDateKey, [...existing, newEntry])
      }

      if (firebaseReady && firestoreDb && recoveryCode) {
        try {
          const { collection, addDoc, Timestamp } = await import('firebase/firestore')
          const intakesRef = collection(firestoreDb, 'users', recoveryCode, 'intakes')
          await addDoc(intakesRef, {
            amount: entry.amount,
            timestamp: Timestamp.fromDate(new Date(entry.timestamp)),
            note: entry.note || null,
            mood: entry.mood || null,
          })
        } catch (err) {
          console.error('Failed to save to Firestore:', err)
        }
      }
    },
    [todayIntakes, setTodayIntakes, firebaseReady, firestoreDb, recoveryCode]
  )

  const updateIntake = useCallback(
    async (id: string, updates: Partial<Omit<IntakeEntry, 'id'>>) => {
      const todayKey = getTodayKey()
      const updated = todayIntakes.map((e) => (e.id === id ? { ...e, ...updates } : e))
      setTodayIntakes(updated)
      saveLocalIntakes(todayKey, updated)

      if (firebaseReady && firestoreDb && recoveryCode) {
        try {
          const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
          const ref = doc(firestoreDb, 'users', recoveryCode, 'intakes', id)
          const patch: Record<string, unknown> = {}
          if (updates.amount !== undefined) patch.amount = updates.amount
          if (updates.mood !== undefined) patch.mood = updates.mood || null
          if (updates.note !== undefined) patch.note = updates.note || null
          if (updates.timestamp !== undefined)
            patch.timestamp = Timestamp.fromDate(new Date(updates.timestamp))
          if (Object.keys(patch).length > 0) await updateDoc(ref, patch)
        } catch (err) {
          console.error('Failed to update in Firestore:', err)
        }
      }
    },
    [todayIntakes, setTodayIntakes, firebaseReady, firestoreDb, recoveryCode]
  )

  const updatePlan = useCallback(
    async (plan: TaperPlan) => {
      // Update current daily target based on today
      const updatedPlan: TaperPlan = {
        ...plan,
        currentDailyTarget: getDailyTargetForDate(plan, new Date()),
      }

      setTaperPlan(updatedPlan)
      saveLocalPlan(updatedPlan)

      if (firebaseReady && firestoreDb && recoveryCode) {
        try {
          const { doc, setDoc } = await import('firebase/firestore')
          const planRef = doc(firestoreDb, 'users', recoveryCode, 'data', 'plan')
          await setDoc(planRef, updatedPlan)
        } catch (err) {
          console.error('Failed to save plan to Firestore:', err)
        }
      }
    },
    [setTaperPlan, firebaseReady, firestoreDb, recoveryCode]
  )

  const getHistoryIntakes = useCallback(
    async (dateKey: string): Promise<IntakeEntry[]> => {
      // Try Firestore first
      if (firebaseReady && firestoreDb && recoveryCode) {
        try {
          const { collection, query, where, getDocs, Timestamp } =
            await import('firebase/firestore')
          const date = new Date(dateKey)
          const startOfDay = new Date(date)
          startOfDay.setHours(0, 0, 0, 0)
          const endOfDay = new Date(date)
          endOfDay.setHours(23, 59, 59, 999)

          const intakesRef = collection(firestoreDb, 'users', recoveryCode, 'intakes')
          const q = query(
            intakesRef,
            where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay))
          )
          const snap = await getDocs(q)
          return snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              amount: data.amount,
              timestamp: (data.timestamp as import('firebase/firestore').Timestamp).toDate(),
              note: data.note,
              mood: data.mood,
            }
          })
        } catch {
          // Fall back to local
        }
      }

      return loadLocalIntakesForDate(dateKey)
    },
    [firebaseReady, firestoreDb, recoveryCode]
  )

  return {
    recoveryCode,
    todayIntakes,
    taperPlan,
    loading,
    addIntake,
    updateIntake,
    updatePlan,
    getHistoryIntakes,
  }
}
