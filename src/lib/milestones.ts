import { TaperPlan } from './store'
import { getDaysSincePlanStart } from './utils'

export interface Milestone {
  id: string
  emoji: string
  title: string
  message: string
  accentColor: string
}

const CELEBRATED_KEY = 'unhookd_celebrated_milestones'

function getCelebrated(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function markMilestoneCelebrated(id: string): void {
  if (typeof window === 'undefined') return
  const current = getCelebrated()
  current.add(id)
  localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...current]))
}

const STREAK_MILESTONES: Array<{ days: number; emoji: string; title: string; message: string }> = [
  {
    days: 3,
    emoji: '🔥',
    title: 'Three days straight',
    message: 'Momentum is building. Three days of showing up for yourself.',
  },
  {
    days: 7,
    emoji: '🌟',
    title: 'One full week!',
    message: 'Seven days of commitment. That\'s not luck — that\'s you choosing this.',
  },
  {
    days: 14,
    emoji: '💪',
    title: 'Two-week warrior',
    message: 'Fourteen days in a row. This is becoming part of who you are.',
  },
  {
    days: 21,
    emoji: '🧠',
    title: '21 days strong',
    message: 'Three weeks. Habits form here. You\'re building a new normal.',
  },
  {
    days: 30,
    emoji: '🌱',
    title: 'One month of showing up',
    message: '30 days. A whole month of commitment to yourself. This is remarkable.',
  },
]

const JOURNEY_MILESTONES: Array<{ days: number; emoji: string; title: string; message: string }> = [
  {
    days: 7,
    emoji: '✨',
    title: 'One week in',
    message: 'Seven days since you started your journey. You took the first step and kept walking.',
  },
  {
    days: 30,
    emoji: '🎯',
    title: 'One month on the path',
    message: 'A full month since you started. Look how far you\'ve already come.',
  },
  {
    days: 60,
    emoji: '🏔️',
    title: 'Two months of growth',
    message: '60 days. You\'ve made this a real, sustained part of your life.',
  },
]

const PROGRESS_MILESTONES: Array<{ pct: number; emoji: string; title: string; message: string }> = [
  {
    pct: 25,
    emoji: '🌅',
    title: 'A quarter of the way there',
    message: '25% through your taper. Every step down is your body healing.',
  },
  {
    pct: 50,
    emoji: '⚡',
    title: 'Halfway to your goal!',
    message: 'You\'re at the midpoint. The summit is in sight. Keep climbing.',
  },
  {
    pct: 75,
    emoji: '🔭',
    title: 'Three quarters done',
    message: '75% complete. The finish line is real now. You can feel it.',
  },
  {
    pct: 100,
    emoji: '🎉',
    title: 'You reached your goal!',
    message: 'You completed your taper plan. This is huge. Take a moment to feel that.',
  },
]

export function checkNewMilestones(plan: TaperPlan, streak: number): Milestone[] {
  const celebrated = getCelebrated()
  const newMilestones: Milestone[] = []

  const daysSinceStart = getDaysSincePlanStart(plan.startDate)

  for (const m of STREAK_MILESTONES) {
    const id = `streak_${m.days}`
    if (!celebrated.has(id) && streak >= m.days) {
      newMilestones.push({ id, emoji: m.emoji, title: m.title, message: m.message, accentColor: '#7fb069' })
    }
  }

  for (const m of JOURNEY_MILESTONES) {
    const id = `journey_${m.days}`
    if (!celebrated.has(id) && daysSinceStart >= m.days) {
      newMilestones.push({ id, emoji: m.emoji, title: m.title, message: m.message, accentColor: '#e8a87c' })
    }
  }

  const totalDays = plan.weeksToTarget * 7
  const progressPct = totalDays > 0 ? Math.round((daysSinceStart / totalDays) * 100) : 0
  for (const m of PROGRESS_MILESTONES) {
    const id = `progress_${m.pct}`
    if (!celebrated.has(id) && progressPct >= m.pct) {
      newMilestones.push({ id, emoji: m.emoji, title: m.title, message: m.message, accentColor: '#e8a87c' })
    }
  }

  return newMilestones
}
