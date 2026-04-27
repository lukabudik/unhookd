import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'

admin.initializeApp()

const db = admin.firestore()
const fcm = admin.messaging()

// ─── Types ─────────────────────────────────────────────────────────────────

interface TaperPlan {
  startAmount: number
  targetAmount: number
  startDate: string
  weeksToTarget: number
  daysToTarget?: number
  currentDailyTarget: number
  holdUntil?: string
  holdStartDate?: string
}

interface FCMTokenDoc {
  token: string
  updatedAt: string
  reminderTime: string | null // "HH:MM" or null
  utcOffsetMinutes: number
  platform: string
  // Deduplication state — updated after each send
  dailyReminderDate?: string // last date daily reminder was sent (YYYY-MM-DD local)
  eveningCheckinDate?: string // last date evening check-in was sent
  weeklySummaryKey?: string // "YYYY-WN" last summary sent
  mondayTargetKey?: string // "YYYY-WN" last monday target sent
  reEngagementDate?: string // last date re-engagement was sent
  holdEndingSentFor?: string // hold end date we already notified about
  milestonesSent?: number[] // streak milestones already notified
}

// ─── Calculation helpers ───────────────────────────────────────────────────

function getDailyTarget(plan: TaperPlan, date: Date): number {
  const totalDays = plan.daysToTarget !== undefined ? plan.daysToTarget : plan.weeksToTarget * 7
  if (totalDays === 0) return plan.targetAmount

  const start = new Date(plan.startDate)
  start.setUTCHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)

  let daysDiff = Math.floor((d.getTime() - start.getTime()) / 86400000)
  if (daysDiff < 0) return plan.startAmount

  if (plan.holdUntil && plan.holdStartDate) {
    const holdStart = new Date(plan.holdStartDate)
    holdStart.setUTCHours(0, 0, 0, 0)
    const holdEnd = new Date(plan.holdUntil)
    holdEnd.setUTCHours(0, 0, 0, 0)

    if (d >= holdStart && d <= holdEnd) {
      const daysToHoldStart = Math.floor((holdStart.getTime() - start.getTime()) / 86400000)
      if (daysToHoldStart >= totalDays) return plan.targetAmount
      const reduction = plan.startAmount - plan.targetAmount
      const holdDose = plan.startAmount - (reduction / totalDays) * daysToHoldStart
      return Math.max(plan.targetAmount, Math.round(holdDose * 2) / 2)
    }

    if (d > holdEnd) {
      const holdDays = Math.round((holdEnd.getTime() - holdStart.getTime()) / 86400000) + 1
      daysDiff = Math.max(0, daysDiff - holdDays)
    }
  }

  if (daysDiff >= totalDays) return plan.targetAmount

  const reduction = plan.startAmount - plan.targetAmount
  const targetForDay = plan.startAmount - (reduction / totalDays) * daysDiff
  return Math.max(plan.targetAmount, Math.round(targetForDay * 2) / 2)
}

function fmtG(g: number): string {
  return `${Math.round(g * 10) / 10}g`
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Convert UTC now to local date/time using the stored UTC offset
function toLocalDate(utcNow: Date, utcOffsetMinutes: number): Date {
  return new Date(utcNow.getTime() + utcOffsetMinutes * 60 * 1000)
}

function weekKey(date: Date): string {
  // ISO week-ish key: year + week number of month
  return `${date.getUTCFullYear()}-W${date.getUTCMonth()}-${Math.ceil(date.getUTCDate() / 7)}`
}

// ─── Notification builders ─────────────────────────────────────────────────

function buildDailyReminder(
  plan: TaperPlan,
  localNow: Date,
  todayTotal: number,
  streak: number
): { title: string; body: string } {
  const target = getDailyTarget(plan, localNow)
  const dayNum =
    Math.floor((localNow.getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1
  const logged = todayTotal > 0
  const hour = localNow.getUTCHours()

  if (logged) {
    if (todayTotal > target) {
      return {
        title: "Over today's goal — that's okay",
        body: "One hard day doesn't define the journey. Open Unhookd to breathe through it.",
      }
    }
    if (streak >= 14)
      return {
        title: `${streak} days straight`,
        body: `${fmtG(todayTotal)} logged today. You're on track.`,
      }
    if (streak >= 3)
      return {
        title: 'Checked in',
        body: `${streak}-day streak alive. ${fmtG(todayTotal)} logged today.`,
      }
    return { title: 'Logged today', body: `${fmtG(todayTotal)} down. Keep it consistent.` }
  }

  if (streak >= 14)
    return {
      title: `Don't break day ${streak + 1}`,
      body: `${streak} days in a row — log your dose to keep going.`,
    }
  if (streak >= 7)
    return {
      title: `${streak}-day streak at stake`,
      body: 'Log your dose today to keep it alive.',
    }
  if (streak >= 3)
    return {
      title: 'Check in today',
      body: `${streak} days going. Target: ${fmtG(target)}.`,
    }
  if (hour >= 20)
    return {
      title: 'Still time to log',
      body: `Today's target is ${fmtG(target)}. Don't let the day go untracked.`,
    }
  if (hour < 10)
    return {
      title: `Good morning — day ${dayNum}`,
      body: `Your target today is ${fmtG(target)}.`,
    }
  return {
    title: 'Unhookd check-in',
    body: `Target: ${fmtG(target)} today. Log when you dose.`,
  }
}

function buildStreakMilestone(
  streak: number,
  plan: TaperPlan,
  localNow: Date
): { title: string; body: string } {
  const dayNum =
    Math.floor((localNow.getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1
  const reduction = Math.round((plan.startAmount - getDailyTarget(plan, localNow)) * 10) / 10

  if (streak >= 90)
    return {
      title: '90 days. Remarkable.',
      body: `${dayNum} days into the journey. Every day now is real neurological recovery.`,
    }
  if (streak >= 60)
    return {
      title: '60 consecutive days',
      body: `Two months of honest tracking.${reduction > 0 ? ` Down ${fmtG(reduction)} from where you started.` : ''}`,
    }
  if (streak >= 30)
    return {
      title: '30-day streak',
      body: `One month straight.${reduction > 0 ? ` Down ${fmtG(reduction)} from your start.` : ' This is real momentum.'}`,
    }
  if (streak >= 21)
    return {
      title: '3 weeks in a row',
      body: 'The habit is forming. Your brain is starting to remember what this feels like.',
    }
  if (streak >= 14)
    return {
      title: '14 days straight',
      body: 'Two weeks consistent. This is where real taper progress happens.',
    }
  if (streak >= 7)
    return {
      title: 'One week streak',
      body: 'Seven days in a row. This is where habits start to take hold.',
    }
  return {
    title: '3-day streak',
    body: 'Three days of honest tracking. Every day you log builds the picture.',
  }
}

function buildWeeklySummary(
  daysLogged: number,
  daysOnTarget: number
): { title: string; body: string } {
  if (daysLogged === 0)
    return {
      title: 'Weekly check-in',
      body: "No doses logged this week. It's never too late to start tracking again.",
    }
  if (daysOnTarget === daysLogged)
    return {
      title: `Perfect week — ${daysLogged}/7 days on target`,
      body: 'Every logged day on target. Strong week.',
    }
  if (daysOnTarget >= Math.ceil(daysLogged * 0.7))
    return {
      title: `Solid week — ${daysLogged}/7 logged`,
      body: `On target ${daysOnTarget} of ${daysLogged} days. More good days than not.`,
    }
  return {
    title: `${daysLogged}/7 days logged`,
    body: `${daysOnTarget} on target. Rough week happens — the data is what matters.`,
  }
}

function buildMondayTarget(plan: TaperPlan, localNow: Date): { title: string; body: string } {
  const target = getDailyTarget(plan, localNow)
  const lastWeek = new Date(localNow.getTime() - 7 * 86400000)
  const prevTarget = getDailyTarget(plan, lastWeek)
  const drop = Math.round((prevTarget - target) * 10) / 10
  if (drop > 0)
    return {
      title: `New week — target drops to ${fmtG(target)}`,
      body: `Down ${fmtG(drop)} from last week. Step by step.`,
    }
  return {
    title: `New week — target: ${fmtG(target)}/day`,
    body: 'Same target as last week. Consistency is the goal.',
  }
}

function buildHoldEnding(plan: TaperPlan, localNow: Date): { title: string; body: string } {
  const tomorrow = new Date(localNow.getTime() + 86400000)
  const target = getDailyTarget(plan, tomorrow)
  return {
    title: 'Hold ends tomorrow',
    body: `Taper resumes at ${fmtG(target)}/day. You rested — now back to it.`,
  }
}

function buildReEngagement(daysSince: number): { title: string; body: string } {
  if (daysSince >= 5)
    return {
      title: `${daysSince} days — still here?`,
      body: "No judgment. Come back and log when you're ready.",
    }
  if (daysSince >= 3)
    return {
      title: 'A few days since your last log',
      body: 'Gaps happen. Open Unhookd and pick up where you left off.',
    }
  return {
    title: '2 days since your last log',
    body: "Quick check-in — how's the taper going?",
  }
}

// ─── Send a single FCM message ─────────────────────────────────────────────

async function sendPush(
  token: string,
  title: string,
  body: string,
  tag: string,
  url = '/'
): Promise<boolean> {
  try {
    await fcm.send({
      token,
      notification: { title, body },
      data: { url, tag },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag,
          renotify: true,
        },
        fcmOptions: { link: url },
      },
    })
    return true
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      // Token is stale — caller should delete it
      return false
    }
    console.error('[FCM] send error:', err)
    return true // don't delete on transient errors
  }
}

// ─── Main scheduled function ───────────────────────────────────────────────

export const sendScheduledNotifications = onSchedule(
  {
    schedule: 'every 1 hours',
    region: 'europe-west1',
    timeoutSeconds: 540,
    memory: '256MiB',
  },
  async () => {
    const utcNow = new Date()

    // Query all FCM token documents across all users
    const fcmSnap = await db.collectionGroup('fcm').get()

    const sendPromises: Promise<void>[] = []

    for (const fcmDoc of fcmSnap.docs) {
      const fcmData = fcmDoc.data() as FCMTokenDoc
      if (!fcmData.token) continue

      // Derive the user's recovery code from the document path:
      // users/{recoveryCode}/fcm/token
      const pathParts = fcmDoc.ref.path.split('/')
      const recoveryCode = pathParts[1]
      if (!recoveryCode) continue

      sendPromises.push(processUser(utcNow, recoveryCode, fcmDoc.ref, fcmData))
    }

    await Promise.allSettled(sendPromises)
    console.log(`[FCM] processed ${sendPromises.length} users`)
  }
)

async function processUser(
  utcNow: Date,
  recoveryCode: string,
  fcmRef: admin.firestore.DocumentReference,
  fcmData: FCMTokenDoc
): Promise<void> {
  const localNow = toLocalDate(utcNow, fcmData.utcOffsetMinutes)
  const localDate = isoDate(localNow)
  const localHour = localNow.getUTCHours()
  const localDayOfWeek = localNow.getUTCDay() // 0=Sun, 1=Mon
  const wKey = weekKey(localNow)
  const updates: Partial<FCMTokenDoc> = {}

  // Load plan
  const planSnap = await db.doc(`users/${recoveryCode}/data/plan`).get()
  if (!planSnap.exists) return
  const plan = planSnap.data() as TaperPlan

  // Load last 90 days of intakes for streak + today's total
  const ninetyDaysAgo = new Date(utcNow.getTime() - 90 * 86400000)
  const intakesSnap = await db
    .collection(`users/${recoveryCode}/intakes`)
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
    .get()

  // Build daily totals map { "YYYY-MM-DD" → totalGrams }
  const dailyTotals: Record<string, number> = {}
  for (const doc of intakesSnap.docs) {
    const data = doc.data()
    const ts: admin.firestore.Timestamp = data.timestamp
    const localEntryDate = isoDate(toLocalDate(ts.toDate(), fcmData.utcOffsetMinutes))
    dailyTotals[localEntryDate] = (dailyTotals[localEntryDate] || 0) + (data.amount || 0)
  }

  const todayTotal = dailyTotals[localDate] || 0

  // Calculate streak
  let streak = 0
  const yesterday = new Date(localNow.getTime() - 86400000)
  for (let i = 0; i < 90; i++) {
    const d = new Date(yesterday.getTime() - i * 86400000)
    const key = isoDate(d)
    const total = dailyTotals[key] || 0
    const target = getDailyTarget(plan, d)
    if (total > 0 && total <= target) streak++
    else break
  }
  // Count today if on track
  if (todayTotal > 0 && todayTotal <= getDailyTarget(plan, localNow)) streak++

  // Get last logged date
  let daysSinceLastLog = 0
  const sortedDates = Object.keys(dailyTotals).sort().reverse()
  if (sortedDates.length > 0) {
    const lastLoggedKey = sortedDates[0]
    const lastLoggedDate = new Date(lastLoggedKey)
    const localToday = new Date(localDate)
    daysSinceLastLog = Math.floor((localToday.getTime() - lastLoggedDate.getTime()) / 86400000)
  } else {
    daysSinceLastLog = 99 // never logged — skip re-engagement
  }

  const milestonesSent = fcmData.milestonesSent || []
  const token = fcmData.token
  let tokenValid = true

  // ── 1. Daily reminder ──────────────────────────────────────────────────
  if (fcmData.reminderTime && fcmData.dailyReminderDate !== localDate) {
    const [rh] = fcmData.reminderTime.split(':').map(Number)
    if (localHour === rh) {
      const { title, body } = buildDailyReminder(plan, localNow, todayTotal, streak)
      tokenValid = await sendPush(token, title, body, 'unhookd-daily')
      if (tokenValid) updates.dailyReminderDate = localDate
    }
  }

  if (!tokenValid) {
    await fcmRef.delete()
    return
  }

  // ── 2. Evening check-in (20:00 local, if no check-in logged today) ────
  if (localHour === 20 && fcmData.eveningCheckinDate !== localDate && todayTotal === 0) {
    const { title, body } = {
      title: `Evening — haven't logged yet`,
      body: `Today's target is ${fmtG(getDailyTarget(plan, localNow))}. Log before you sleep.`,
    }
    tokenValid = await sendPush(token, title, body, 'unhookd-evening')
    if (tokenValid) updates.eveningCheckinDate = localDate
  }

  // ── 3. Monday new target (08:00 local) ────────────────────────────────
  if (localDayOfWeek === 1 && localHour === 8 && fcmData.mondayTargetKey !== wKey) {
    const { title, body } = buildMondayTarget(plan, localNow)
    tokenValid = await sendPush(token, title, body, 'unhookd-monday')
    if (tokenValid) updates.mondayTargetKey = wKey
  }

  // ── 4. Weekly summary (Sunday 20:00 local) ────────────────────────────
  if (localDayOfWeek === 0 && localHour === 20 && fcmData.weeklySummaryKey !== wKey) {
    let daysLogged = 0
    let daysOnTarget = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date(localNow.getTime() - i * 86400000)
      const key = isoDate(d)
      const total = dailyTotals[key] || 0
      if (total > 0) {
        daysLogged++
        if (total <= getDailyTarget(plan, d)) daysOnTarget++
      }
    }
    const { title, body } = buildWeeklySummary(daysLogged, daysOnTarget)
    tokenValid = await sendPush(token, title, body, 'unhookd-weekly')
    if (tokenValid) updates.weeklySummaryKey = wKey
  }

  // ── 5. Re-engagement (2+ days since last log) ─────────────────────────
  if (daysSinceLastLog >= 2 && sortedDates.length > 0 && fcmData.reEngagementDate !== localDate) {
    const { title, body } = buildReEngagement(daysSinceLastLog)
    tokenValid = await sendPush(token, title, body, 'unhookd-reengagement')
    if (tokenValid) updates.reEngagementDate = localDate
  }

  // ── 6. Hold ending tomorrow ───────────────────────────────────────────
  if (plan.holdUntil) {
    const holdEnd = plan.holdUntil // "YYYY-MM-DD"
    const tomorrow = isoDate(new Date(localNow.getTime() + 86400000))
    if (holdEnd === tomorrow && fcmData.holdEndingSentFor !== holdEnd) {
      const { title, body } = buildHoldEnding(plan, localNow)
      tokenValid = await sendPush(token, title, body, 'unhookd-hold')
      if (tokenValid) updates.holdEndingSentFor = holdEnd
    }
  }

  // ── 7. Streak milestones ──────────────────────────────────────────────
  const MILESTONES = [3, 7, 14, 21, 30, 60, 90]
  for (const m of MILESTONES) {
    if (streak === m && !milestonesSent.includes(m)) {
      const { title, body } = buildStreakMilestone(m, plan, localNow)
      tokenValid = await sendPush(token, title, body, `unhookd-milestone-${m}`)
      if (tokenValid) {
        milestonesSent.push(m)
        updates.milestonesSent = milestonesSent
      }
      break // one milestone at a time
    }
  }

  // Persist dedup state
  if (Object.keys(updates).length > 0) {
    await fcmRef.set(updates, { merge: true })
  }
}
