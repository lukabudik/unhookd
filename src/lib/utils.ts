import { TaperPlan } from './store'

const LOCAL_INTAKES_PREFIX = 'unhookd_intakes_'

const QUOTES_EARLY = [
  'Starting is the hardest part. You already did it.',
  "Every journey starts with a single step. You're on yours.",
  "You don't have to feel ready. You just have to begin.",
  "The first days are the roughest. They don't last forever.",
  'Being here and trying is already more than most people do.',
]

const QUOTES_BUILDING = [
  "You're building a new baseline. Keep showing up.",
  "Progress isn't always visible, but it's always real.",
  'Each day under target is your body getting a little more room to breathe.',
  "You don't need a perfect week. You need today.",
  "The hard part isn't the dose — it's choosing to track it. You did.",
]

const QUOTES_MID = [
  "Somewhere between where you started and where you're going, you found your rhythm.",
  "You've already proven you can do this. Keep proving it.",
  "The middle of the road is where most people quit. You're still here.",
  'Consistency is the quiet superpower behind every transformation.',
  "It's not about willpower. It's about the small decisions you make every day.",
]

const QUOTES_NEAR_END = [
  'The finish line is getting closer. You can see it now.',
  "You didn't come this far to only come this far.",
  "What you've built over these weeks is real. Don't stop.",
  'Almost there. The last stretch is where character is forged.',
  "Look back at where you started. Look where you are now. That's you.",
]

const QUOTES_STRUGGLE = [
  "A hard day doesn't erase the work you've put in. It's just a hard day.",
  "One rough day isn't a relapse. It's part of the journey. Keep going.",
  "You don't have to be perfect. You just have to keep showing up.",
  'Being honest about a hard day takes courage. You have that.',
  'Every slip in the road is feedback, not failure. Adjust and move forward.',
]

export function getContextualQuote(dayNumber: number, streak: number, journeyPct: number): string {
  let pool: string[]

  if (journeyPct >= 80) {
    pool = QUOTES_NEAR_END
  } else if (streak === 0) {
    pool = QUOTES_STRUGGLE
  } else if (dayNumber <= 7) {
    pool = QUOTES_EARLY
  } else if (dayNumber <= 21) {
    pool = QUOTES_BUILDING
  } else {
    pool = QUOTES_MID
  }

  // Seed with today's date so the quote changes daily but stays stable within a day
  const today = new Date()
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  return pool[dateSeed % pool.length]
}

/**
 * Returns today's date as YYYY-MM-DD string
 */
export function getTodayKey(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Formats grams as a readable string
 */
export function formatGrams(g: number): string {
  if (g === 0) return '0g'
  // Show up to 1 decimal place, remove trailing zero
  const rounded = Math.round(g * 10) / 10
  return `${rounded}g`
}

/**
 * Returns progress as 0-100, where 100 = at target
 * If current > target, returns > 100 (can go over)
 */
export function getProgressPercent(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 100 : 0
  return Math.round((current / target) * 100)
}

/**
 * Calculate the daily target for a given date based on the taper plan.
 * Linear taper from startAmount to targetAmount over weeksToTarget weeks.
 * Respects hold periods: freezes the dose during the hold, then resumes
 * smoothly after by subtracting the held days from the day count.
 */
export function getDailyTargetForDate(plan: TaperPlan, date: Date): number {
  // daysToTarget is the primary field; 0 means cold turkey (quit immediately)
  const totalDays = plan.daysToTarget !== undefined ? plan.daysToTarget : plan.weeksToTarget * 7

  // Cold turkey: target from day 0
  if (totalDays === 0) return plan.targetAmount

  const start = new Date(plan.startDate)
  start.setHours(0, 0, 0, 0)

  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  let daysDiff = Math.floor((target.getTime() - start.getTime()) / msPerDay)

  if (daysDiff < 0) return plan.startAmount

  if (plan.holdUntil && plan.holdStartDate) {
    const holdStart = new Date(plan.holdStartDate)
    holdStart.setHours(0, 0, 0, 0)
    const holdEnd = new Date(plan.holdUntil)
    holdEnd.setHours(0, 0, 0, 0)

    if (target >= holdStart && target <= holdEnd) {
      const daysToHoldStart = Math.floor((holdStart.getTime() - start.getTime()) / msPerDay)
      if (daysToHoldStart >= totalDays) return plan.targetAmount
      const reduction = plan.startAmount - plan.targetAmount
      const holdDose = plan.startAmount - (reduction / totalDays) * daysToHoldStart
      return Math.max(plan.targetAmount, Math.round(holdDose * 2) / 2)
    }

    if (target > holdEnd) {
      const holdDays = Math.round((holdEnd.getTime() - holdStart.getTime()) / msPerDay) + 1
      daysDiff = Math.max(0, daysDiff - holdDays)
    }
  }

  if (daysDiff >= totalDays) return plan.targetAmount

  const reduction = plan.startAmount - plan.targetAmount
  const dailyReduction = reduction / totalDays
  const targetForDay = plan.startAmount - dailyReduction * daysDiff

  return Math.max(plan.targetAmount, Math.round(targetForDay * 2) / 2)
}

/**
 * Returns context-appropriate dose preset buttons for a given daily target.
 */
export function getPresets(dailyTarget: number): number[] {
  if (dailyTarget <= 2) return [0.5, 1, 1.5, 2]
  if (dailyTarget <= 4) return [0.5, 1, 1.5, 2, 2.5, 3]
  if (dailyTarget <= 7) return [1, 1.5, 2, 3, 4, 5]
  return [1, 2, 3, 4, 5, 6]
}

/**
 * Returns the number of days since a plan started
 */
export function getDaysSincePlanStart(startDate: string): number {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / msPerDay))
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Format a date as a short label (Mon, Tue, etc.)
 */
export function getDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Format a date as YYYY-MM-DD
 */
export function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get the past N dates including today, in order from oldest to newest
 */
export function getPastDates(n: number): Date[] {
  const dates: Date[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    dates.push(d)
  }
  return dates
}

/**
 * Calculate the current streak purely from localStorage — no async required.
 * Counts consecutive past days at or under target, then +1 if today is also on track.
 */
export function calculateStreakFromLocal(plan: TaperPlan): number {
  if (typeof window === 'undefined') return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let count = 0

  // Walk backwards from yesterday
  for (let i = 1; i <= 60; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const key = dateToKey(date)
    const raw = localStorage.getItem(`${LOCAL_INTAKES_PREFIX}${key}`)
    const target = getDailyTargetForDate(plan, date)

    if (!raw) break // no data = never logged = streak broken

    let total = 0
    try {
      const entries = JSON.parse(raw) as Array<{ amount: number }>
      total = entries.reduce((sum, e) => sum + e.amount, 0)
    } catch {
      break
    }

    if (total > 0 && total <= target) count++
    else break
  }

  // Check today: only credit it if something was actually logged and under target
  const todayKey = dateToKey(today)
  const todayRaw = localStorage.getItem(`${LOCAL_INTAKES_PREFIX}${todayKey}`)
  if (todayRaw) {
    try {
      const todayEntries = JSON.parse(todayRaw) as Array<{ amount: number }>
      const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0)
      const todayTarget = getDailyTargetForDate(plan, today)
      if (todayTotal > 0 && todayTotal <= todayTarget) count++
    } catch {
      // ignore
    }
  }

  return count
}
