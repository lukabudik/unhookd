import { TaperPlan } from './store'
import { getDaysSincePlanStart, getPastDates, dateToKey } from './utils'

export type TaperPhase =
  | 'taper-early'
  | 'taper-mid'
  | 'taper-late'
  | 'taper-final'
  | 'post-zero-acute'
  | 'post-zero-sub-acute'
  | 'post-zero-paws'
  | 'maintenance'

export interface PhaseInfo {
  phase: TaperPhase
  icon: string // Lucide icon name
  title: string
  body: string
  color: string
  isPostZero: boolean
  daysPostZero?: number
}

const PHASE_CONTENT: Record<TaperPhase, Omit<PhaseInfo, 'phase' | 'isPostZero' | 'daysPostZero'>> = {
  'taper-early': {
    icon: 'Sprout',
    color: 'var(--primary)',
    title: 'The beginning is the hardest part',
    body: 'Your body is adjusting to less kratom. Any discomfort you feel is the physical dependence loosening its grip — it means the process is working. A slow, consistent taper minimizes symptoms. There is no prize for going faster.',
  },
  'taper-mid': {
    icon: 'Zap',
    color: 'var(--primary)',
    title: 'Building real momentum',
    body: "You're in the heart of the taper. Your system is gradually recalibrating. Some days feel easier than expected; some harder. Both are normal. Consistency matters more than perfection — every day near or under target is your body gaining ground.",
  },
  'taper-late': {
    icon: 'Mountain',
    color: 'var(--primary)',
    title: 'The final approach',
    body: 'As doses get lower, some people notice a paradoxical increase in symptoms — this is normal. Your opioid receptors are becoming more sensitive as dependence decreases. The discomfort here is the dependence losing its last grip. Stay with the plan.',
  },
  'taper-final': {
    icon: 'Target',
    color: '#7fb069',
    title: 'Almost there',
    body: "You're approaching zero. The psychological challenge often intensifies here — the mind resists the idea of stopping more than the body does. The fear of how you'll feel without kratom is almost always worse than the reality. You've already done the hardest work.",
  },
  'post-zero-acute': {
    icon: 'Waves',
    color: '#e8a87c',
    title: 'Acute phase — days 1–10',
    body: 'Your body is completing the transition. Restlessness, broken sleep, anxiety, and body aches are all normal right now. Symptoms peak around days 3–5 for most people and improve significantly by day 10. Hydration, magnesium, and movement help more than you might expect. This phase is finite.',
  },
  'post-zero-sub-acute': {
    icon: 'CloudSun',
    color: '#e8a87c',
    title: 'Sub-acute phase — weeks 2–6',
    body: 'Physical symptoms have mostly resolved, but this phase can feel hard in new ways. Low motivation, flat mood, and broken sleep are common — your dopamine system is recalibrating after sustained opioid input. This is neurochemical, not a character flaw. Exercise is your most powerful tool right now.',
  },
  'post-zero-paws': {
    icon: 'Sunrise',
    color: '#7fb069',
    title: 'Post-acute recovery',
    body: "You're in PAWS (post-acute withdrawal syndrome). Most people feel noticeably better around weeks 6–8, with continued improvement through months 3–6. Cravings at this stage are triggered by stress and emotion, not physical need. Your brain is still rewiring — the fog will lift.",
  },
  'maintenance': {
    icon: 'Anchor',
    color: 'var(--success)',
    title: 'Holding your maintenance dose',
    body: "You've reached your target. Staying consistent while your system stabilizes is the goal. When you're ready to reduce further, update your plan.",
  },
}

export function detectPhase(plan: TaperPlan): PhaseInfo {
  const daysSinceStart = getDaysSincePlanStart(plan.startDate)
  const totalDays = plan.weeksToTarget * 7
  const progressPct = totalDays > 0 ? daysSinceStart / totalDays : 0

  if (daysSinceStart >= totalDays) {
    if (plan.targetAmount === 0) {
      const daysPostZero = daysSinceStart - totalDays
      if (daysPostZero <= 10) {
        return { phase: 'post-zero-acute', isPostZero: true, daysPostZero, ...PHASE_CONTENT['post-zero-acute'] }
      }
      if (daysPostZero <= 45) {
        return { phase: 'post-zero-sub-acute', isPostZero: true, daysPostZero, ...PHASE_CONTENT['post-zero-sub-acute'] }
      }
      return { phase: 'post-zero-paws', isPostZero: true, daysPostZero, ...PHASE_CONTENT['post-zero-paws'] }
    }
    return { phase: 'maintenance', isPostZero: false, ...PHASE_CONTENT['maintenance'] }
  }

  if (progressPct < 0.30) return { phase: 'taper-early', isPostZero: false, ...PHASE_CONTENT['taper-early'] }
  if (progressPct < 0.70) return { phase: 'taper-mid', isPostZero: false, ...PHASE_CONTENT['taper-mid'] }
  if (progressPct < 0.95) return { phase: 'taper-late', isPostZero: false, ...PHASE_CONTENT['taper-late'] }
  return { phase: 'taper-final', isPostZero: false, ...PHASE_CONTENT['taper-final'] }
}

// ─── Supplement system ─────────────────────────────────────────────────────

type SymptomKey = 'sleep' | 'anxiety' | 'restlessness' | 'gi' | 'mood' | 'energy' | 'cravings'

export interface Supplement {
  id: string
  name: string
  icon: string
  dose: string
  timing: string
  forSymptoms: SymptomKey[]
  phases: TaperPhase[]
  why: string
  caution?: string
  priority: number
}

export const SUPPLEMENTS: Supplement[] = [
  {
    id: 'magnesium',
    name: 'Magnesium glycinate',
    icon: 'Pill',
    dose: '400–500mg',
    timing: 'Evening before bed',
    forSymptoms: ['sleep', 'restlessness', 'anxiety'],
    phases: ['taper-early', 'taper-mid', 'taper-late', 'taper-final', 'post-zero-acute', 'post-zero-sub-acute', 'post-zero-paws', 'maintenance'],
    why: 'Relaxes muscles, calms the nervous system, and is one of the most effective supports for restless legs and sleep disruption. The glycinate form is best absorbed and gentlest on the stomach. First supplement most people in kratom recovery add.',
    priority: 10,
  },
  {
    id: 'ltheanine',
    name: 'L-theanine',
    icon: 'Leaf',
    dose: '200–400mg',
    timing: 'Morning and/or evening',
    forSymptoms: ['anxiety', 'sleep'],
    phases: ['taper-early', 'taper-mid', 'taper-late', 'taper-final', 'post-zero-acute', 'post-zero-sub-acute', 'post-zero-paws', 'maintenance'],
    why: 'Amino acid from green tea that reduces anxiety without sedation. Promotes calm alertness during the day and improves sleep quality at night. Well-tolerated and non-habit-forming.',
    priority: 9,
  },
  {
    id: 'melatonin',
    name: 'Melatonin (low dose)',
    icon: 'Moon',
    dose: '0.5–1mg',
    timing: '30–60 min before bed',
    forSymptoms: ['sleep'],
    phases: ['taper-early', 'taper-mid', 'taper-late', 'taper-final', 'post-zero-acute', 'post-zero-sub-acute', 'post-zero-paws'],
    why: 'Signals your circadian rhythm to wind down. Counter-intuitively, low doses (0.5–1mg) work better than the 5–10mg doses usually sold. Take at the same time every night.',
    caution: 'Use for 2–4 weeks then take a break. Higher doses can paradoxically disrupt sleep architecture.',
    priority: 8,
  },
  {
    id: 'nac',
    name: 'NAC (N-acetyl cysteine)',
    icon: 'FlaskConical',
    dose: '600–1200mg twice daily',
    timing: 'Morning and evening with food',
    forSymptoms: ['cravings', 'mood', 'energy'],
    phases: ['taper-mid', 'taper-late', 'taper-final', 'post-zero-sub-acute', 'post-zero-paws'],
    why: 'Restores glutamate homeostasis disrupted by chronic opioid use. Multiple clinical trials show meaningful craving reduction across substance use disorders. Also supports mood, brain fog, and liver health.',
    priority: 9,
  },
  {
    id: 'blackseedoil',
    name: 'Black seed oil',
    icon: 'Leaf',
    dose: '1 tsp 2–3× daily',
    timing: 'With meals',
    forSymptoms: ['cravings', 'anxiety', 'gi'],
    phases: ['taper-late', 'taper-final', 'post-zero-acute', 'post-zero-sub-acute'],
    why: 'Nigella sativa has weak kappa-opioid activity that may ease withdrawal symptoms. Widely used and recommended in kratom recovery communities. Anti-inflammatory and calming. Good evidence in community experience even if clinical research is limited.',
    priority: 7,
  },
  {
    id: 'ltyrosine',
    name: 'L-tyrosine',
    icon: 'Zap',
    dose: '500–1500mg',
    timing: 'Morning on empty stomach',
    forSymptoms: ['mood', 'energy', 'cravings'],
    phases: ['taper-late', 'taper-final', 'post-zero-sub-acute', 'post-zero-paws'],
    why: 'Dopamine and norepinephrine precursor. Chronic opioid use depletes dopamine; L-tyrosine helps replenish the precursor pool. Particularly useful for the flat mood and low motivation of the sub-acute and PAWS phases.',
    caution: 'Avoid if on MAOIs or thyroid medication. Take on an empty stomach away from other protein foods.',
    priority: 8,
  },
  {
    id: 'omega3',
    name: 'Omega-3 / Fish oil',
    icon: 'Fish',
    dose: '2–4g EPA+DHA daily',
    timing: 'With food',
    forSymptoms: ['mood', 'energy'],
    phases: ['taper-mid', 'taper-late', 'post-zero-sub-acute', 'post-zero-paws', 'maintenance'],
    why: 'Anti-inflammatory, supports neuroplasticity and dopamine receptor recovery. Good evidence for depression and anxiety reduction. Take with food to reduce fish burps.',
    priority: 7,
  },
  {
    id: 'vitaminc',
    name: 'Vitamin C (high dose)',
    icon: 'Sun',
    dose: '1–3g in divided doses',
    timing: 'Split through the day with food',
    forSymptoms: ['anxiety', 'energy', 'cravings'],
    phases: ['taper-final', 'post-zero-acute'],
    why: 'Some evidence for reducing acute opioid withdrawal severity. Strong antioxidant depleted by chronic opioid use. Split doses prevent GI upset.',
    caution: 'Start at 500mg and increase gradually. High doses can cause loose stools.',
    priority: 6,
  },
  {
    id: 'bcomplex',
    name: 'B-complex',
    icon: 'Pill',
    dose: 'Standard B-complex tablet',
    timing: 'Morning with food',
    forSymptoms: ['energy', 'mood'],
    phases: ['taper-early', 'taper-mid', 'taper-late', 'taper-final', 'post-zero-acute', 'post-zero-sub-acute', 'post-zero-paws', 'maintenance'],
    why: 'B vitamins are essential for energy production, nerve function, and neurotransmitter synthesis — B6 is needed to make serotonin and dopamine. Often depleted by chronic substance use.',
    priority: 6,
  },
  {
    id: 'cbd',
    name: 'CBD',
    icon: 'Sprout',
    dose: '25–50mg for sleep · 15–25mg for anxiety',
    timing: 'As needed; larger dose 1hr before bed',
    forSymptoms: ['anxiety', 'sleep', 'restlessness'],
    phases: ['taper-early', 'taper-mid', 'taper-late', 'taper-final', 'post-zero-acute', 'post-zero-sub-acute', 'post-zero-paws'],
    why: 'Reduces anxiety and promotes sleep without addiction potential. Full-spectrum hemp products may be more effective than isolate. Quality varies hugely — buy from companies with third-party lab testing (COA).',
    caution: 'Can interact with some medications (CYP450 pathway). Check with a pharmacist if on prescription drugs.',
    priority: 7,
  },
  {
    id: 'ashwagandha',
    name: 'Ashwagandha (KSM-66)',
    icon: 'Sprout',
    dose: '300–600mg',
    timing: 'Morning, or split morning/evening',
    forSymptoms: ['anxiety', 'energy', 'mood'],
    phases: ['taper-mid', 'taper-late', 'post-zero-sub-acute', 'post-zero-paws'],
    why: 'Adaptogen that reduces cortisol and helps the body manage stress. Particularly good for the anxiety and fatigue of the sub-acute phase. Use the KSM-66 extract — it has the best evidence base.',
    caution: 'Avoid in the acute phase (can worsen acute anxiety in some people). Rare cases of liver stress at very high doses. Avoid during pregnancy.',
    priority: 6,
  },
]

// ─── Symptom scoring ───────────────────────────────────────────────────────

export interface SymptomScores {
  sleep: number
  anxiety: number
  restlessness: number
  gi: number
  mood: number
  energy: number
  cravings: number
}

function readCheckin(dateKey: string): { mood?: string; symptoms?: Record<string, string> } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`unhookd_checkin_${dateKey}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function computeSymptomScores(days = 7): SymptomScores {
  const scores: SymptomScores = { sleep: 0, anxiety: 0, restlessness: 0, gi: 0, mood: 0, energy: 0, cravings: 0 }
  for (const date of getPastDates(days)) {
    const data = readCheckin(dateToKey(date))
    if (!data) continue
    const s = data.symptoms ?? {}
    if (s.sleep === 'bad') scores.sleep += 3; else if (s.sleep === 'mild') scores.sleep += 1
    if (s.anxiety === 'bad') scores.anxiety += 3; else if (s.anxiety === 'mild') scores.anxiety += 1
    if (s.restlessness === 'bad') scores.restlessness += 3; else if (s.restlessness === 'mild') scores.restlessness += 1
    if (s.gi === 'bad') scores.gi += 3; else if (s.gi === 'mild') scores.gi += 1
    if (data.mood === 'awful') { scores.mood += 3; scores.energy += 2 }
    else if (data.mood === 'rough') { scores.mood += 2; scores.energy += 1 }
  }
  return scores
}

export function getSuggestedSupplements(scores: SymptomScores, phase: TaperPhase, maxCount = 3): Supplement[] {
  return SUPPLEMENTS
    .filter(s => s.phases.includes(phase))
    .map(s => {
      let score = s.priority
      for (const key of s.forSymptoms) {
        score += (scores[key] ?? 0) * 2
      }
      return { s, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map(({ s }) => s)
}

export function hasRecentSymptomData(days = 3): boolean {
  if (typeof window === 'undefined') return false
  return getPastDates(days).some(date => {
    const data = readCheckin(dateToKey(date))
    return !!(data?.symptoms && Object.keys(data.symptoms).length > 0)
  })
}
