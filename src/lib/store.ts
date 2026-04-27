import { create } from 'zustand'

export interface IntakeEntry {
  id: string
  amount: number // grams
  timestamp: Date
  note?: string
  mood?: 'rough' | 'okay' | 'good'
}

export interface TaperPlan {
  startAmount: number // starting daily grams
  targetAmount: number // goal daily grams (0 = quit)
  startDate: string // ISO date
  weeksToTarget: number
  currentDailyTarget: number
  holdUntil?: string // ISO date — hold ends after this date (inclusive)
  holdStartDate?: string // ISO date — when the hold began
  reasons?: string // personal motivation, shown in craving modal
}

interface AppStore {
  userId: string | null
  todayIntakes: IntakeEntry[]
  taperPlan: TaperPlan | null
  setUserId: (id: string) => void
  addIntake: (entry: Omit<IntakeEntry, 'id'>) => void
  updateIntake: (id: string, updates: Partial<Omit<IntakeEntry, 'id'>>) => void
  setTodayIntakes: (intakes: IntakeEntry[]) => void
  setTaperPlan: (plan: TaperPlan) => void
  getTodayTotal: () => number
  getDailyTarget: () => number
}

export const useAppStore = create<AppStore>((set, get) => ({
  userId: null,
  todayIntakes: [],
  taperPlan: null,

  setUserId: (id: string) => set({ userId: id }),

  addIntake: (entry: Omit<IntakeEntry, 'id'>) => {
    const newEntry: IntakeEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    set((state) => ({ todayIntakes: [...state.todayIntakes, newEntry] }))
  },

  updateIntake: (id: string, updates: Partial<Omit<IntakeEntry, 'id'>>) => {
    set((state) => ({
      todayIntakes: state.todayIntakes.map(e => e.id === id ? { ...e, ...updates } : e),
    }))
  },

  setTodayIntakes: (intakes: IntakeEntry[]) => set({ todayIntakes: intakes }),

  setTaperPlan: (plan: TaperPlan) => set({ taperPlan: plan }),

  getTodayTotal: () => {
    const { todayIntakes } = get()
    return todayIntakes.reduce((sum, entry) => sum + entry.amount, 0)
  },

  getDailyTarget: () => {
    const { taperPlan } = get()
    if (!taperPlan) return 10 // default fallback
    return taperPlan.currentDailyTarget
  },
}))
