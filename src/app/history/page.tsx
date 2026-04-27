'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useFirestore } from '@/hooks/useFirestore'
import { IntakeEntry } from '@/lib/store'
import { IntakeChart } from '@/components/IntakeChart'
import { getPastDates, dateToKey, formatGrams, getDailyTargetForDate, getPresets } from '@/lib/utils'
import { format } from 'date-fns'
import { Flame, Frown, Meh, Smile, SmilePlus, LucideIcon } from 'lucide-react'

interface CheckInData {
  mood: 'awful' | 'rough' | 'okay' | 'good' | 'great'
  note: string
  timestamp: string
}

const MOOD_ICON: Record<string, LucideIcon> = {
  awful: Frown,
  rough: Frown,
  okay: Meh,
  good: Smile,
  great: SmilePlus,
}
function MoodIndicator({ mood }: { mood: string }) {
  const Icon = MOOD_ICON[mood]
  if (!Icon) return null
  const color = mood === 'good' || mood === 'great' ? 'var(--success)' : mood === 'awful' || mood === 'rough' ? '#e8a87c' : 'var(--text-secondary)'
  return <Icon size={14} color={color} strokeWidth={1.75} />
}

interface DayData {
  date: Date
  total: number
  target: number
  key: string
  checkIn?: CheckInData
  intakes: IntakeEntry[]
}

function loadLocalIntakesRaw(dateKey: string): IntakeEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`unhookd_intakes_${dateKey}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<IntakeEntry & { timestamp: string }>
    return parsed.map((e) => ({ ...e, timestamp: new Date(e.timestamp) }))
  } catch {
    return []
  }
}

function saveLocalIntakesRaw(dateKey: string, intakes: IntakeEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`unhookd_intakes_${dateKey}`, JSON.stringify(intakes))
}

export default function HistoryPage() {
  const { taperPlan } = useAppStore()
  const { getHistoryIntakes, addIntake } = useFirestore()
  const [historyData, setHistoryData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [editingHistEntry, setEditingHistEntry] = useState<{ entry: IntakeEntry; dayKey: string } | null>(null)
  const [showAddForDay, setShowAddForDay] = useState(false)

  const loadHistory = useCallback(async () => {
    const dates = getPastDates(30)
    const data = await Promise.all(
      dates.map(async (date) => {
        const key = dateToKey(date)
        const intakes = await getHistoryIntakes(key)
        const total = intakes.reduce((sum, e) => sum + e.amount, 0)
        const target = taperPlan ? getDailyTargetForDate(taperPlan, date) : 10
        let checkIn: CheckInData | undefined
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem(`unhookd_checkin_${key}`)
          if (raw) {
            try { checkIn = JSON.parse(raw) } catch { /* ignore */ }
          }
        }
        return { date, total, target, key, checkIn, intakes }
      })
    )
    setHistoryData(data)
    setLoading(false)
  }, [taperPlan, getHistoryIntakes])

  useEffect(() => { loadHistory() }, [loadHistory])

  // Refresh selected day data after mutations
  function refreshSelectedDay(dayKey: string) {
    const intakes = loadLocalIntakesRaw(dayKey)
    const total = intakes.reduce((sum, e) => sum + e.amount, 0)
    setHistoryData(prev => prev.map(d => d.key === dayKey ? { ...d, intakes, total } : d))
    setSelectedDay(prev => prev?.key === dayKey ? { ...prev, intakes, total } : prev)
  }

  function deleteHistoricalIntake(dayKey: string, id: string) {
    const existing = loadLocalIntakesRaw(dayKey)
    saveLocalIntakesRaw(dayKey, existing.filter(e => e.id !== id))
    refreshSelectedDay(dayKey)
  }

  function saveHistoricalEdit(dayKey: string, id: string, updates: Partial<Omit<IntakeEntry, 'id'>>) {
    const existing = loadLocalIntakesRaw(dayKey)
    saveLocalIntakesRaw(dayKey, existing.map(e => e.id === id ? { ...e, ...updates } : e))
    setEditingHistEntry(null)
    refreshSelectedDay(dayKey)
  }

  const streak = (() => {
    let count = 0
    const reversed = [...historyData].reverse()
    for (const day of reversed) {
      if (day.total === 0 && dateToKey(day.date) === dateToKey(new Date())) continue
      if (day.total > 0 && day.total <= day.target) count++
      else if (day.total > 0) break
    }
    return count
  })()

  const chartData = historyData.slice(-7)

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            History
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            Your journey, day by day
          </p>
        </div>

        {/* Streak card */}
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 20,
              padding: '20px',
              border: '1px solid rgba(127, 176, 105, 0.3)',
              background: 'linear-gradient(135deg, rgba(127,176,105,0.08) 0%, var(--surface) 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(127,176,105,0.15)', border: '1px solid rgba(127,176,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Flame size={28} color="var(--success)" strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>
                {streak}-day streak
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Consecutive days at or under your goal
              </div>
            </div>
          </motion.div>
        )}

        {/* Chart */}
        {loading ? (
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 20, padding: 40, border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            Loading history...
          </div>
        ) : (
          <IntakeChart data={chartData} plan={taperPlan} />
        )}

        {/* 30-day list */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 12px 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Past 30 days
          </h2>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 60, backgroundColor: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', opacity: 0.5 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...historyData].reverse().map((day, i) => {
                const isOver = day.total > day.target
                const isZero = day.total === 0
                const isToday = dateToKey(day.date) === dateToKey(new Date())

                let statusColor = 'var(--success)'
                if (isZero) statusColor = 'var(--text-secondary)'
                else if (isOver) statusColor = 'var(--danger)'

                let statusDot = '●'
                if (isZero) statusDot = '○'
                else if (isOver) statusDot = '▲'

                return (
                  <motion.div
                    key={day.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelectedDay(day)}
                    style={{
                      backgroundColor: 'var(--surface)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      border: `1px solid ${isToday ? 'rgba(232,168,124,0.3)' : 'var(--border)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--primary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isToday ? 'Today' : format(day.date, 'EEEE, MMM d')}
                        {day.checkIn && <span style={{ fontSize: 14 }} title={`Feeling ${day.checkIn.mood}`}><MoodIndicator mood={day.checkIn.mood} /></span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {day.checkIn?.note ? (
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 180 }}>
                            {day.checkIn.note}
                          </span>
                        ) : (
                          `target: ${formatGrams(day.target)}`
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: statusColor, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10 }}>{statusDot}</span>
                        {isZero ? '—' : formatGrams(day.total)}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.5 }}>›</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Day drill-down sheet */}
      <AnimatePresence>
        {selectedDay && (
          <>
            <motion.div
              key="day-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelectedDay(null); setEditingHistEntry(null); setShowAddForDay(false) }}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 300, backdropFilter: 'blur(2px)' }}
            />
            <motion.div
              key="day-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
                backgroundColor: 'var(--surface)', borderRadius: '24px 24px 0 0',
                padding: '12px 20px 48px', maxHeight: '85vh', overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, backgroundColor: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }} />

              {/* Sheet header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {dateToKey(selectedDay.date) === dateToKey(new Date()) ? 'Today' : format(selectedDay.date, 'EEEE, MMMM d')}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Target: {formatGrams(selectedDay.target)} · Logged: {selectedDay.total > 0 ? formatGrams(selectedDay.total) : 'nothing'}
                  </p>
                </div>
                <button onClick={() => { setSelectedDay(null); setEditingHistEntry(null); setShowAddForDay(false) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 22, cursor: 'pointer', padding: 0 }}>×</button>
              </div>

              {/* Mood check-in */}
              {selectedDay.checkIn && (
                <div style={{ backgroundColor: 'var(--bg)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <MoodIndicator mood={selectedDay.checkIn.mood} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Feeling {selectedDay.checkIn.mood}
                    </p>
                    {selectedDay.checkIn.note && (
                      <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {selectedDay.checkIn.note}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Individual doses */}
              {selectedDay.intakes.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                  No doses logged for this day.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {[...selectedDay.intakes]
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((intake) => {
                      const isEditing = editingHistEntry?.entry.id === intake.id

                      if (isEditing) {
                        return (
                          <HistoryEntryEditor
                            key={intake.id}
                            entry={intake}
                            dailyTarget={selectedDay.target}
                            onSave={(updates) => saveHistoricalEdit(selectedDay.key, intake.id, updates)}
                            onCancel={() => setEditingHistEntry(null)}
                          />
                        )
                      }

                      return (
                        <div
                          key={intake.id}
                          style={{
                            backgroundColor: 'var(--bg)', borderRadius: 12, padding: '10px 12px',
                            border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--primary)' }}>{formatGrams(intake.amount)}</span>
                              {intake.mood === 'rough' && <span>😣</span>}
                              {intake.mood === 'okay' && <span>😐</span>}
                              {intake.mood === 'good' && <span>🙂</span>}
                            </div>
                            {intake.note && (
                              <p style={{ margin: '3px 0 0 0', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {intake.note}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {format(new Date(intake.timestamp), 'h:mm a')}
                            </span>
                            <button
                              onClick={() => setEditingHistEntry({ entry: intake, dayKey: selectedDay.key })}
                              style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, padding: 0, flexShrink: 0 }}
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => deleteHistoricalIntake(selectedDay.key, intake.id)}
                              style={{ width: 26, height: 26, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, flexShrink: 0 }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Add dose for this day */}
              {showAddForDay ? (
                <AddDoseForDay
                  date={selectedDay.date}
                  onLog={async (entry) => { await addIntake(entry); refreshSelectedDay(selectedDay.key); setShowAddForDay(false) }}
                  onCancel={() => setShowAddForDay(false)}
                  dailyTarget={selectedDay.target}
                />
              ) : (
                <button
                  onClick={() => setShowAddForDay(true)}
                  style={{
                    width: '100%', height: 44, borderRadius: 12, backgroundColor: 'transparent', border: '1px dashed var(--border)',
                    color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  + Add dose for this day
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Inline editor for a historical entry ──────────────────────────────────

function HistoryEntryEditor({
  entry,
  dailyTarget,
  onSave,
  onCancel,
}: {
  entry: IntakeEntry
  dailyTarget: number
  onSave: (updates: Partial<Omit<IntakeEntry, 'id'>>) => void
  onCancel: () => void
}) {
  const presets: number[] = getPresets(dailyTarget)
  const [amount, setAmount] = useState<number | null>(entry.amount)
  const [useCustom, setUseCustom] = useState(!presets.includes(entry.amount))
  const [customAmount, setCustomAmount] = useState(useCustom ? String(entry.amount) : '')
  const [mood, setMood] = useState<string | null>(entry.mood ?? null)

  const finalAmount = useCustom ? parseFloat(customAmount) || 0 : amount || 0

  return (
    <div style={{ backgroundColor: 'rgba(232,168,124,0.06)', borderRadius: 12, padding: 12, border: '1px solid rgba(232,168,124,0.2)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
        {presets.map((p: number) => {
          const sel = !useCustom && amount === p
          return (
            <button key={p} onClick={() => { setAmount(p); setUseCustom(false) }}
              style={{ height: 40, borderRadius: 10, fontSize: 15, fontWeight: sel ? 700 : 400, cursor: 'pointer',
                backgroundColor: sel ? 'var(--primary)' : 'var(--bg)', color: sel ? 'var(--bg)' : 'var(--text-primary)',
                border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}` }}>
              {p}g
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <input type="number" step="0.1" min="0" placeholder="Custom" value={useCustom ? customAmount : ''}
          onFocus={() => setUseCustom(true)}
          onChange={e => { setUseCustom(true); setAmount(null); setCustomAmount(e.target.value) }}
          style={{ flex: 1, height: 36, padding: '0 10px', borderRadius: 10, fontSize: 14, boxSizing: 'border-box',
            backgroundColor: 'var(--bg)', color: 'var(--text-primary)', border: `1px solid ${useCustom ? 'var(--primary)' : 'var(--border)'}` }} />
        {['rough', 'okay', 'good'].map(m => (
          <button key={m} onClick={() => setMood(mood === m ? null : m)}
            style={{ width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: 'pointer',
              backgroundColor: mood === m ? 'rgba(232,168,124,0.15)' : 'var(--bg)',
              border: `1px solid ${mood === m ? 'var(--primary)' : 'var(--border)'}` }}>
            {m === 'rough' ? '😣' : m === 'okay' ? '😐' : '🙂'}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave({ amount: finalAmount, mood: mood as 'rough' | 'okay' | 'good' | undefined })}
          disabled={finalAmount <= 0}
          style={{ flex: 1, height: 36, borderRadius: 10, backgroundColor: 'var(--primary)', color: 'var(--bg)', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Save
        </button>
        <button onClick={onCancel}
          style={{ height: 36, padding: '0 14px', borderRadius: 10, backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Add dose for a specific past date ─────────────────────────────────────

function AddDoseForDay({
  date,
  dailyTarget,
  onLog,
  onCancel,
}: {
  date: Date
  dailyTarget: number
  onLog: (entry: Omit<IntakeEntry, 'id'>) => Promise<void>
  onCancel: () => void
}) {
  const presets: number[] = getPresets(dailyTarget)
  const [amount, setAmount] = useState<number | null>(null)
  const [mood, setMood] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!amount || saving) return
    setSaving(true)
    const timestamp = new Date(date)
    timestamp.setHours(12, 0, 0, 0) // noon as default time for retroactive entries
    await onLog({ amount, timestamp, mood: mood as 'rough' | 'okay' | 'good' | undefined })
    setSaving(false)
  }

  return (
    <div style={{ backgroundColor: 'rgba(127,176,105,0.06)', borderRadius: 12, padding: 12, border: '1px solid rgba(127,176,105,0.2)', marginTop: 8 }}>
      <p style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Add a missed dose</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
        {presets.map((p: number) => {
          const sel = amount === p
          return (
            <button key={p} onClick={() => setAmount(sel ? null : p)}
              style={{ height: 40, borderRadius: 10, fontSize: 15, fontWeight: sel ? 700 : 400, cursor: 'pointer',
                backgroundColor: sel ? 'var(--success)' : 'var(--bg)', color: sel ? '#1a1612' : 'var(--text-primary)',
                border: `1px solid ${sel ? 'var(--success)' : 'var(--border)'}` }}>
              {p}g
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAdd} disabled={!amount || saving}
          style={{ flex: 1, height: 36, borderRadius: 10, backgroundColor: amount ? 'var(--success)' : 'var(--border)', color: amount ? '#1a1612' : 'var(--text-secondary)', fontWeight: 600, fontSize: 13, border: 'none', cursor: amount ? 'pointer' : 'default' }}>
          {saving ? 'Adding...' : amount ? `Add ${amount}g` : 'Select amount'}
        </button>
        <button onClick={onCancel}
          style={{ height: 36, padding: '0 14px', borderRadius: 10, backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
