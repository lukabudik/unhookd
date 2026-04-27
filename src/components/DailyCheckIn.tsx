'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, BrainCircuit, Activity, Stethoscope, PersonStanding, Sofa, Frown, Meh, Smile, SmilePlus, LucideIcon } from 'lucide-react'
import { getTodayKey } from '@/lib/utils'

type CheckInMood = 'awful' | 'rough' | 'okay' | 'good' | 'great'
export type SymptomLevel = 'fine' | 'mild' | 'bad'

export interface SymptomData {
  sleep?: SymptomLevel
  anxiety?: SymptomLevel
  restlessness?: SymptomLevel
  gi?: SymptomLevel
}

export interface CheckInData {
  mood: CheckInMood
  note: string
  timestamp: string
  symptoms?: SymptomData
  moved?: boolean
}

const MOODS: { value: CheckInMood; Icon: LucideIcon; label: string; color: string }[] = [
  { value: 'awful', Icon: Frown, label: 'Awful', color: '#e05c5c' },
  { value: 'rough', Icon: Frown, label: 'Rough', color: '#e8a87c' },
  { value: 'okay', Icon: Meh, label: 'Okay', color: '#b8a898' },
  { value: 'good', Icon: Smile, label: 'Good', color: '#7fb069' },
  { value: 'great', Icon: SmilePlus, label: 'Great', color: '#5bc4a0' },
]

type SymptomIconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
const SYMPTOMS: { key: keyof SymptomData; Icon: SymptomIconComponent; label: string }[] = [
  { key: 'sleep', Icon: Moon, label: 'Sleep' },
  { key: 'anxiety', Icon: BrainCircuit, label: 'Anxiety' },
  { key: 'restlessness', Icon: Activity, label: 'Restlessness' },
  { key: 'gi', Icon: Stethoscope, label: 'Gut/GI' },
]

const SYMPTOM_LEVELS: { value: SymptomLevel; label: string; color: string }[] = [
  { value: 'fine', label: 'Fine', color: 'var(--success)' },
  { value: 'mild', label: 'Mild', color: 'var(--primary)' },
  { value: 'bad', label: 'Bad', color: '#e05c5c' },
]

const CHECKIN_KEY_PREFIX = 'unhookd_checkin_'

export function DailyCheckIn() {
  const [saved, setSaved] = useState<CheckInData | null>(null)
  const [selectedMood, setSelectedMood] = useState<CheckInMood | null>(null)
  const [note, setNote] = useState('')
  const [symptoms, setSymptoms] = useState<SymptomData>({})
  const [showSymptoms, setShowSymptoms] = useState(false)
  const [moved, setMoved] = useState<boolean | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = CHECKIN_KEY_PREFIX + getTodayKey()
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CheckInData
      setSaved(parsed)
      if (parsed.moved !== undefined) setMoved(parsed.moved)
      } catch {
        // ignore
      }
    }
  }, [])

  function saveCheckIn() {
    if (!selectedMood) return
    const data: CheckInData = {
      mood: selectedMood,
      note: note.trim(),
      timestamp: new Date().toISOString(),
      symptoms: Object.keys(symptoms).length > 0 ? symptoms : undefined,
      moved: moved ?? undefined,
    }
    const key = CHECKIN_KEY_PREFIX + getTodayKey()
    localStorage.setItem(key, JSON.stringify(data))
    setSaved(data)
    setIsEditing(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  function startEditing() {
    if (saved) {
      setSelectedMood(saved.mood)
      setNote(saved.note)
      setSymptoms(saved.symptoms ?? {})
      setMoved(saved.moved ?? null)
      setShowSymptoms(!!(saved.symptoms && Object.keys(saved.symptoms).length > 0))
    }
    setIsEditing(true)
  }

  function setSymptom(key: keyof SymptomData, value: SymptomLevel) {
    setSymptoms(prev => ({ ...prev, [key]: prev[key] === value ? undefined : value }))
  }

  const moodConfig = saved ? MOODS.find((m) => m.value === saved.mood) : null

  if (saved && !isEditing) {
    return (
      <motion.div
        initial={justSaved ? { scale: 0.97 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 16,
          padding: '14px 16px',
          border: `1px solid ${moodConfig?.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {moodConfig?.Icon && (
            <moodConfig.Icon size={24} color={moodConfig.color} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: moodConfig?.color }}>
              Feeling {moodConfig?.label.toLowerCase()} today
            </p>
            {saved.note && (
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {saved.note}
              </p>
            )}
            {(saved.symptoms && Object.keys(saved.symptoms).length > 0 || saved.moved !== undefined) && (
              <p style={{ margin: '3px 0 0 0', fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {saved.moved === true && <><PersonStanding size={11} strokeWidth={2} /> moved · </>}
                {saved.moved === false && <><Sofa size={11} strokeWidth={2} /> rested · </>}
                {saved.symptoms && Object.keys(saved.symptoms).length > 0 &&
                  (Object.values(saved.symptoms).every(v => v === 'fine') ? 'no symptoms' : 'symptoms tracked')
                }
              </p>
            )}
          </div>
        </div>
        <button
          onClick={startEditing}
          style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          Edit
        </button>
      </motion.div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--surface)', borderRadius: 16, padding: '16px', border: '1px solid var(--border)' }}>
      <p style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
        How are you feeling today?
      </p>

      {/* Mood picker */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', marginBottom: 14 }}>
        {MOODS.map((m) => (
          <button
            key={m.value}
            onClick={() => setSelectedMood(m.value)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              padding: '10px 4px',
              borderRadius: 12,
              border: selectedMood === m.value ? `1.5px solid ${m.color}` : '1px solid var(--border)',
              backgroundColor: selectedMood === m.value ? `${m.color}18` : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <m.Icon size={22} color={selectedMood === m.value ? m.color : 'var(--text-secondary)'} strokeWidth={1.75} />
            <span style={{ fontSize: 10, color: selectedMood === m.value ? m.color : 'var(--text-secondary)', fontWeight: selectedMood === m.value ? 600 : 400, lineHeight: 1 }}>
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedMood && (
          <motion.div
            key="note-area"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder="Anything on your mind? (optional)"
              maxLength={140}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                marginBottom: 10,
              }}
            />

            {/* Movement tracker */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                Did you move your body today? <span style={{ fontSize: 11, opacity: 0.7 }}>(20+ min activity)</span>
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    onClick={() => setMoved(moved === val ? null : val)}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: moved === val ? 700 : 400,
                      cursor: 'pointer',
                      border: `1px solid ${moved === val ? (val ? 'var(--success)' : '#e05c5c') : 'var(--border)'}`,
                      backgroundColor: moved === val ? (val ? 'rgba(127,176,105,0.12)' : 'rgba(224,92,92,0.08)') : 'transparent',
                      color: moved === val ? (val ? 'var(--success)' : '#e05c5c') : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      {val ? <PersonStanding size={14} strokeWidth={2} /> : <Sofa size={14} strokeWidth={2} />}
                      {val ? 'Yes' : 'No'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms toggle */}
            <button
              onClick={() => setShowSymptoms(!showSymptoms)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: showSymptoms ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0 0 10px 0',
                fontWeight: showSymptoms ? 600 : 400,
                display: 'block',
              }}
            >
              {showSymptoms ? '▾' : '▸'} Track physical symptoms (optional)
            </button>

            <AnimatePresence>
              {showSymptoms && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 10 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SYMPTOMS.map(({ key, Icon, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={16} color="var(--text-secondary)" strokeWidth={1.75} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', width: 90, flexShrink: 0 }}>{label}</span>
                        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                          {SYMPTOM_LEVELS.map(({ value, label: lvlLabel, color }) => {
                            const isSelected = symptoms[key] === value
                            return (
                              <button
                                key={value}
                                onClick={() => setSymptom(key, value)}
                                style={{
                                  flex: 1,
                                  height: 30,
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: isSelected ? 700 : 400,
                                  border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                                  backgroundColor: isSelected ? `${color}20` : 'transparent',
                                  color: isSelected ? color : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  transition: 'all 0.12s',
                                }}
                              >
                                {lvlLabel}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {140 - note.length} chars left
              </span>
              <button
                onClick={saveCheckIn}
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  backgroundColor: 'var(--primary)',
                  color: 'var(--bg)',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save check-in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
