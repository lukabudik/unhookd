'use client'

import { useEffect, useState, useCallback } from 'react'
import { IntakeEntry, TaperPlan, useAppStore } from '@/lib/store'
import { getTodayKey, getDailyTargetForDate, dateToKey } from '@/lib/utils'
import { getOrCreateRecoveryCode } from '@/lib/recovery'

// ─── localStorage helpers ──────────────────────────────────────────────────

const LOCAL_PLAN_KEY = 'unhookd_plan'
const LOCAL_INTAKES_PREFIX = 'unhookd_intakes_'

function loadLocalPlan(): TaperPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_PLAN_KEY)
    return raw ? (JSON.parse(raw) as TaperPlan) : null
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

// ─── Module-level Firebase singleton ──────────────────────────────────────
// Shared across all useFirestore() instances so Firebase initializes only once
// and loadData never runs more than twice (before + after auth).

let _db: import('firebase/firestore').Firestore | null = null
let _firebaseReady = false
let _recoveryCode = ''
let _initStarted = false
const _readyCallbacks: Set<() => void> = new Set()

function notifyReady() {
  _readyCallbacks.forEach((cb) => cb())
}

async function ensureFirebaseInit(onReady: () => void) {
  _readyCallbacks.add(onReady)

  if (_initStarted) {
    // Firebase already initializing — if already ready, call immediately
    if (_firebaseReady) onReady()
    return
  }
  _initStarted = true
  _recoveryCode = getOrCreateRecoveryCode()

  try {
    const { db, auth } = await import('@/lib/firebase')
    const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth')
    _db = db

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        _firebaseReady = true
        notifyReady()
      } else {
        try {
          await signInAnonymously(auth)
        } catch {
          /* localStorage-only */
        }
      }
    })
  } catch {
    // Firebase not configured — localStorage-only mode
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useFirestore() {
  const { setUserId, setTodayIntakes, setTaperPlan, todayIntakes } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [firebaseReady, setFirebaseReady] = useState(_firebaseReady)
  const [recoveryCode, setRecoveryCode] = useState(_recoveryCode || '')

  // Initialize Firebase once; subsequent instances reuse the singleton
  useEffect(() => {
    ensureFirebaseInit(() => {
      setFirebaseReady(true)
      setRecoveryCode(_recoveryCode)
    })
    // Set recovery code immediately if already available
    if (_recoveryCode) {
      setRecoveryCode(_recoveryCode)
      setUserId(_recoveryCode)
    }
    return () => {
      _readyCallbacks.delete(() => {
        setFirebaseReady(true)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (recoveryCode) setUserId(recoveryCode)
  }, [recoveryCode, setUserId])

  // Load today's data — runs once on mount (localStorage), again when Firebase ready (Firestore)
  useEffect(() => {
    if (!recoveryCode && !_recoveryCode) return
    const code = recoveryCode || _recoveryCode
    let mounted = true
    const todayKey = getTodayKey()

    async function loadData() {
      if (_db && _firebaseReady) {
        try {
          const { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc } =
            await import('firebase/firestore')

          // Load plan
          const planSnap = await getDoc(doc(_db, 'users', code, 'data', 'plan'))
          if (planSnap.exists() && mounted) {
            setTaperPlan(planSnap.data() as TaperPlan)
          } else {
            const local = loadLocalPlan()
            if (local && mounted) setTaperPlan(local)
          }

          // Load today's intakes from Firestore
          const start = new Date()
          start.setHours(0, 0, 0, 0)
          const end = new Date()
          end.setHours(23, 59, 59, 999)
          const q = query(
            collection(_db, 'users', code, 'intakes'),
            where('timestamp', '>=', Timestamp.fromDate(start)),
            where('timestamp', '<=', Timestamp.fromDate(end))
          )
          const snap = await getDocs(q)
          if (!mounted) return

          const firestoreIntakes: IntakeEntry[] = snap.docs.map((d) => {
            const data = d.data()
            return {
              id: d.id,
              amount: data.amount,
              timestamp: (data.timestamp as import('firebase/firestore').Timestamp).toDate(),
              note: data.note || undefined,
              mood: data.mood || undefined,
            }
          })

          // Sync any intakes that exist locally but not yet in Firestore
          // (logged during the brief window before Firebase auth completed).
          // IDs always match because addIntake now uses setDoc with the local ID.
          const firestoreIds = new Set(firestoreIntakes.map((i) => i.id))
          const localIntakes = loadLocalIntakes(todayKey)
          const unsynced = localIntakes.filter((i) => !firestoreIds.has(i.id))

          if (unsynced.length > 0) {
            for (const p of unsynced) {
              await setDoc(doc(_db, 'users', code, 'intakes', p.id), {
                amount: p.amount,
                timestamp: Timestamp.fromDate(new Date(p.timestamp)),
                note: p.note || null,
                mood: p.mood || null,
              }).catch(() => {})
            }
          }

          const merged = [...firestoreIntakes, ...unsynced]
          setTodayIntakes(merged)
          saveLocalIntakes(todayKey, merged)
        } catch {
          // Firestore failed — use localStorage
          const local = loadLocalPlan()
          if (local && mounted) setTaperPlan(local)
          if (mounted) setTodayIntakes(loadLocalIntakes(todayKey))
        }
      } else {
        // Firebase not ready — load from localStorage
        const local = loadLocalPlan()
        if (local && mounted) setTaperPlan(local)
        if (mounted) setTodayIntakes(loadLocalIntakes(todayKey))
      }

      if (mounted) setLoading(false)
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [recoveryCode, firebaseReady, setTaperPlan, setTodayIntakes])

  // ─── Mutations ────────────────────────────────────────────────────────────

  const addIntake = useCallback(
    async (entry: Omit<IntakeEntry, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newEntry: IntakeEntry = { ...entry, id }
      const entryDateKey = dateToKey(new Date(entry.timestamp))
      const todayKey = getTodayKey()

      // Update local state immediately
      if (entryDateKey === todayKey) {
        const updated = [...todayIntakes, newEntry]
        setTodayIntakes(updated)
        saveLocalIntakes(todayKey, updated)
      } else {
        saveLocalIntakes(entryDateKey, [...loadLocalIntakes(entryDateKey), newEntry])
      }

      // Sync to Firestore using the SAME id as local (setDoc, not addDoc)
      // This is critical: addDoc generates a different ID causing duplicates on re-load
      if (_db && _firebaseReady && _recoveryCode) {
        try {
          const { doc, setDoc, Timestamp } = await import('firebase/firestore')
          await setDoc(doc(_db, 'users', _recoveryCode, 'intakes', id), {
            amount: entry.amount,
            timestamp: Timestamp.fromDate(new Date(entry.timestamp)),
            note: entry.note || null,
            mood: entry.mood || null,
          })
        } catch (err) {
          console.error('[Firestore] addIntake failed:', err)
        }
      }
    },
    [todayIntakes, setTodayIntakes]
  )

  const updateIntake = useCallback(
    async (id: string, updates: Partial<Omit<IntakeEntry, 'id'>>) => {
      const todayKey = getTodayKey()
      const updated = todayIntakes.map((e) => (e.id === id ? { ...e, ...updates } : e))
      setTodayIntakes(updated)
      saveLocalIntakes(todayKey, updated)

      if (_db && _firebaseReady && _recoveryCode) {
        try {
          const { doc, updateDoc, Timestamp } = await import('firebase/firestore')
          const patch: Record<string, unknown> = {}
          if (updates.amount !== undefined) patch.amount = updates.amount
          if (updates.mood !== undefined) patch.mood = updates.mood || null
          if (updates.note !== undefined) patch.note = updates.note || null
          if (updates.timestamp !== undefined)
            patch.timestamp = Timestamp.fromDate(new Date(updates.timestamp))
          if (Object.keys(patch).length > 0)
            await updateDoc(doc(_db, 'users', _recoveryCode, 'intakes', id), patch)
        } catch (err) {
          console.error('[Firestore] updateIntake failed:', err)
        }
      }
    },
    [todayIntakes, setTodayIntakes]
  )

  const deleteIntake = useCallback(
    async (id: string, dateKey?: string) => {
      const key = dateKey || getTodayKey()
      const existing = loadLocalIntakes(key)
      const updated = existing.filter((e) => e.id !== id)
      saveLocalIntakes(key, updated)

      if (key === getTodayKey()) {
        setTodayIntakes(updated)
      }

      if (_db && _firebaseReady && _recoveryCode) {
        try {
          const { doc, deleteDoc } = await import('firebase/firestore')
          await deleteDoc(doc(_db, 'users', _recoveryCode, 'intakes', id))
        } catch (err) {
          console.error('[Firestore] deleteIntake failed:', err)
        }
      }
    },
    [setTodayIntakes]
  )

  const updatePlan = useCallback(
    async (plan: TaperPlan) => {
      const updatedPlan: TaperPlan = {
        ...plan,
        currentDailyTarget: getDailyTargetForDate(plan, new Date()),
      }
      setTaperPlan(updatedPlan)
      saveLocalPlan(updatedPlan)

      if (_db && _firebaseReady && _recoveryCode) {
        try {
          const { doc, setDoc } = await import('firebase/firestore')
          await setDoc(doc(_db, 'users', _recoveryCode, 'data', 'plan'), updatedPlan)
        } catch (err) {
          console.error('[Firestore] updatePlan failed:', err)
        }
      }
    },
    [setTaperPlan]
  )

  const getHistoryIntakes = useCallback(async (dateKey: string): Promise<IntakeEntry[]> => {
    if (_db && _firebaseReady && _recoveryCode) {
      try {
        const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore')
        const date = new Date(dateKey)
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)
        const snap = await getDocs(
          query(
            collection(_db, 'users', _recoveryCode, 'intakes'),
            where('timestamp', '>=', Timestamp.fromDate(start)),
            where('timestamp', '<=', Timestamp.fromDate(end))
          )
        )
        return snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            amount: data.amount,
            timestamp: (data.timestamp as import('firebase/firestore').Timestamp).toDate(),
            note: data.note || undefined,
            mood: data.mood || undefined,
          }
        })
      } catch {
        /* fall through */
      }
    }
    return loadLocalIntakes(dateKey)
  }, [])

  return {
    recoveryCode,
    loading,
    addIntake,
    updateIntake,
    deleteIntake,
    updatePlan,
    getHistoryIntakes,
  }
}
