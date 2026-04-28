'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAppStore, TaperPlan } from '@/lib/store'
import { useFirestore } from '@/hooks/useFirestore'
import { useNotifications } from '@/hooks/useNotifications'
import {
  formatGrams,
  getDailyTargetForDate,
  getTodayKey,
  dateToKey,
  getAllPlanOptions,
  PlanOption,
} from '@/lib/utils'
import { TaperTrajectoryChart } from '@/components/TaperTrajectoryChart'
import {
  Pencil,
  Check,
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus,
  Zap,
  Feather,
  Wind,
  Skull,
} from 'lucide-react'

// ─── Utility ──────────────────────────────────────────────────────────────────

function buildSchedulePreview(
  startDose: number,
  targetDose: number,
  weeklyDrop: number,
  totalWeeks: number
): { label: string; dose: number }[] {
  if (totalWeeks === 0) return [{ label: 'Today', dose: targetDose }]
  const milestoneWeeks = [0]
  const quarter = Math.max(1, Math.round(totalWeeks / 4))
  for (let w = quarter; w < totalWeeks; w += quarter) milestoneWeeks.push(w)
  milestoneWeeks.push(totalWeeks)
  const unique = [...new Set(milestoneWeeks)]
  return unique.map((w) => ({
    label: w === 0 ? 'Start' : w === totalWeeks ? 'Goal' : `Week ${w}`,
    dose:
      w === 0 ? startDose : Math.max(targetDose, Math.round((startDose - weeklyDrop * w) * 2) / 2),
  }))
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 4,
            width: i === current ? 20 : 6,
            borderRadius: 2,
            backgroundColor: i <= current ? 'var(--primary)' : 'var(--border)',
            transition: 'width 0.2s, background-color 0.2s',
          }}
        />
      ))}
    </div>
  )
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  height: 56,
  padding: '0 16px',
  borderRadius: 14,
  border: '1.5px solid var(--border)',
  backgroundColor: 'var(--bg)',
  color: 'var(--text-primary)',
  fontSize: 18,
  fontWeight: 600,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
}

const primaryBtn: React.CSSProperties = {
  width: '100%',
  height: 56,
  borderRadius: 16,
  backgroundColor: 'var(--primary)',
  color: 'var(--bg)',
  fontWeight: 700,
  fontSize: 17,
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

interface WizardState {
  step: 1 | 2 | 3 | 4
  startDose: string
  goalType: 'quit' | 'reduce'
  targetDose: string
  selectedOption: PlanOption | null
  // Step 4 customisation
  weeklyDrop: string
  reasons: string
  contactName: string
  contactPhone: string
}

function PlanWizard({ onSave }: { onSave: (plan: TaperPlan) => Promise<void> }) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    startDose: '',
    goalType: 'quit',
    targetDose: '',
    selectedOption: null,
    weeklyDrop: '',
    reasons: '',
    contactName: '',
    contactPhone: '',
  })
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState(1)

  function go(step: WizardState['step'], dir = 1) {
    setDirection(dir)
    setState((s) => ({ ...s, step }))
  }

  const startNum = parseFloat(state.startDose) || 0
  const targetNum = state.goalType === 'quit' ? 0 : parseFloat(state.targetDose) || 0
  const options = startNum > 0 && startNum > targetNum ? getAllPlanOptions(startNum, targetNum) : []

  // Derived from step-4 weeklyDrop
  const dropNum = parseFloat(state.weeklyDrop) || 0
  const customWeeks = dropNum > 0 ? Math.ceil((startNum - targetNum) / dropNum) : 0

  function selectOption(opt: PlanOption) {
    setState((s) => ({
      ...s,
      selectedOption: opt,
      weeklyDrop: opt.isColdTurkey ? '' : String(opt.weeklyDrop),
    }))
    go(4)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const isColdTurkey = state.selectedOption?.isColdTurkey ?? false
    const weeks = isColdTurkey ? 0 : customWeeks
    const plan: TaperPlan = {
      startAmount: startNum,
      targetAmount: isColdTurkey ? 0 : targetNum,
      startDate: getTodayKey(),
      weeksToTarget: weeks,
      daysToTarget: isColdTurkey ? 0 : weeks * 7,
      currentDailyTarget: 0,
      reasons: state.reasons.trim() || undefined,
      emergencyContact: state.contactName.trim()
        ? { name: state.contactName.trim(), phone: state.contactPhone.trim() }
        : undefined,
    }
    await onSave(plan)
    setSaving(false)
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir * 40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -40, opacity: 0 }),
  }

  const schedulePreview =
    state.selectedOption && !state.selectedOption.isColdTurkey && dropNum > 0
      ? buildSchedulePreview(startNum, targetNum, dropNum, customWeeks)
      : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <StepDots total={4} current={state.step - 1} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={state.step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* ── Step 1: Dose ── */}
          {state.step === 1 && (
            <>
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px 0',
                    lineHeight: 1.2,
                  }}
                >
                  How much are you taking per day?
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Be honest — this is private. Any amount is fine.
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 8"
                    value={state.startDose}
                    onChange={(e) => setState((s) => ({ ...s, startDose: e.target.value }))}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      fontSize: 28,
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                    autoFocus
                  />
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    g / day
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {[2, 5, 10, 20, 40, 80].map((g) => (
                    <button
                      key={g}
                      onClick={() => setState((s) => ({ ...s, startDose: String(g) }))}
                      style={{
                        height: 36,
                        padding: '0 14px',
                        borderRadius: 10,
                        border: `1px solid ${state.startDose === String(g) ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor:
                          state.startDose === String(g)
                            ? 'rgba(232,168,124,0.15)'
                            : 'var(--surface)',
                        color:
                          state.startDose === String(g)
                            ? 'var(--primary)'
                            : 'var(--text-secondary)',
                        fontSize: 14,
                        fontWeight: state.startDose === String(g) ? 700 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {g}g
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={() => go(2)}
                  disabled={startNum <= 0}
                  style={{
                    ...primaryBtn,
                    opacity: startNum <= 0 ? 0.4 : 1,
                    cursor: startNum <= 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Continue <ArrowRight size={18} strokeWidth={2} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Goal ── */}
          {state.step === 2 && (
            <>
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px 0',
                    lineHeight: 1.2,
                  }}
                >
                  What&apos;s your goal?
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  Starting at {formatGrams(startNum)}/day.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Quit card */}
                <button
                  onClick={() => setState((s) => ({ ...s, goalType: 'quit', targetDose: '' }))}
                  style={{
                    textAlign: 'left',
                    padding: '18px 20px',
                    borderRadius: 18,
                    border: `2px solid ${state.goalType === 'quit' ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor:
                      state.goalType === 'quit' ? 'rgba(232,168,124,0.08)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${state.goalType === 'quit' ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor:
                          state.goalType === 'quit' ? 'var(--primary)' : 'transparent',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Quit completely
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '0 0 0 30px',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    Taper down to zero. The most common goal.
                  </p>
                </button>

                {/* Reduce card */}
                <button
                  onClick={() => setState((s) => ({ ...s, goalType: 'reduce' }))}
                  style={{
                    textAlign: 'left',
                    padding: '18px 20px',
                    borderRadius: 18,
                    border: `2px solid ${state.goalType === 'reduce' ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor:
                      state.goalType === 'reduce' ? 'rgba(232,168,124,0.08)' : 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${state.goalType === 'reduce' ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor:
                          state.goalType === 'reduce' ? 'var(--primary)' : 'transparent',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Reduce to a lower amount
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '0 0 0 30px',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    Cut back to a sustainable daily amount.
                  </p>
                  {state.goalType === 'reduce' && (
                    <div style={{ marginTop: 14, marginLeft: 30 }}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="Target g/day"
                        value={state.targetDose}
                        onChange={(e) => setState((s) => ({ ...s, targetDose: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        style={{ ...inputStyle, height: 46, fontSize: 16, width: '60%' }}
                        autoFocus
                      />
                    </div>
                  )}
                </button>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <button
                  onClick={() => go(1, -1)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={20} color="var(--text-secondary)" strokeWidth={2} />
                </button>
                <button
                  onClick={() => go(3)}
                  disabled={
                    state.goalType === 'reduce' &&
                    (parseFloat(state.targetDose) >= startNum || !state.targetDose)
                  }
                  style={{
                    ...primaryBtn,
                    flex: 1,
                    opacity:
                      state.goalType === 'reduce' &&
                      (parseFloat(state.targetDose) >= startNum || !state.targetDose)
                        ? 0.4
                        : 1,
                    cursor:
                      state.goalType === 'reduce' &&
                      (parseFloat(state.targetDose) >= startNum || !state.targetDose)
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  See my options <ArrowRight size={18} strokeWidth={2} />
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Pick pace ── */}
          {state.step === 3 && (
            <>
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px 0',
                    lineHeight: 1.2,
                  }}
                >
                  Pick your pace.
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  {formatGrams(startNum)} →{' '}
                  {state.goalType === 'quit' ? '0g' : formatGrams(targetNum)}. You can adjust this
                  after.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {options.map((opt, i) => {
                  const icons = [Feather, Wind, Zap, Skull]
                  const Icon = icons[i] ?? Zap
                  const isRecommended = i === 1
                  return (
                    <button
                      key={opt.label}
                      onClick={() => selectOption(opt)}
                      style={{
                        textAlign: 'left',
                        padding: '16px 18px',
                        borderRadius: 18,
                        border: `1.5px solid ${opt.isColdTurkey ? 'rgba(224,92,92,0.3)' : isRecommended ? 'rgba(232,168,124,0.4)' : 'var(--border)'}`,
                        backgroundColor: opt.isColdTurkey
                          ? 'rgba(224,92,92,0.05)'
                          : isRecommended
                            ? 'rgba(232,168,124,0.07)'
                            : 'var(--surface)',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isRecommended && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -1,
                            right: 14,
                            backgroundColor: 'var(--primary)',
                            color: 'var(--bg)',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '0 0 6px 6px',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Recommended
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            flexShrink: 0,
                            backgroundColor: opt.isColdTurkey
                              ? 'rgba(224,92,92,0.1)'
                              : 'rgba(232,168,124,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon
                            size={20}
                            color={opt.isColdTurkey ? '#e05c5c' : 'var(--primary)'}
                            strokeWidth={1.75}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 8,
                              marginBottom: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: opt.isColdTurkey ? '#e05c5c' : 'var(--text-primary)',
                              }}
                            >
                              {opt.label}
                            </span>
                            {!opt.isColdTurkey && (
                              <span
                                style={{
                                  fontSize: 13,
                                  color: 'var(--text-secondary)',
                                  fontWeight: 500,
                                }}
                              >
                                {formatGrams(opt.weeklyDrop)}/wk · {opt.weeks} weeks
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              lineHeight: 1.4,
                            }}
                          >
                            {opt.description}
                          </p>
                        </div>
                        <ArrowRight
                          size={16}
                          color="var(--text-secondary)"
                          strokeWidth={2}
                          style={{ opacity: 0.4, flexShrink: 0 }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <button
                  onClick={() => go(2, -1)}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowLeft size={16} strokeWidth={2} /> Back
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Review & customise ── */}
          {state.step === 4 && state.selectedOption && (
            <>
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px 0',
                    lineHeight: 1.2,
                  }}
                >
                  {state.selectedOption.isColdTurkey ? 'Cold turkey.' : "Here's your plan."}
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {state.selectedOption.isColdTurkey
                    ? `Stopping ${formatGrams(startNum)}/day immediately. The first week is the hardest.`
                    : `${formatGrams(startNum)} → ${state.goalType === 'quit' ? '0g' : formatGrams(targetNum)} in ${customWeeks > 0 ? `${customWeeks} weeks` : '…'}. Adjust the drop if needed.`}
                </p>
              </div>

              {/* Weekly drop adjuster */}
              {!state.selectedOption.isColdTurkey && (
                <div
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: 20,
                    padding: 20,
                    border: '1px solid var(--border)',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 12px 0',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Weekly drop
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() =>
                        setState((s) => {
                          const cur = parseFloat(s.weeklyDrop) || 0.5
                          return {
                            ...s,
                            weeklyDrop: String(Math.max(0.5, Math.round((cur - 0.5) * 2) / 2)),
                          }
                        })
                      }
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Minus size={18} color="var(--text-secondary)" strokeWidth={2} />
                    </button>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={state.weeklyDrop}
                        onChange={(e) => setState((s) => ({ ...s, weeklyDrop: e.target.value }))}
                        style={{
                          width: '100%',
                          height: 52,
                          borderRadius: 12,
                          border: '1.5px solid var(--primary)',
                          backgroundColor: 'rgba(232,168,124,0.06)',
                          color: 'var(--primary)',
                          fontSize: 24,
                          fontWeight: 800,
                          textAlign: 'center',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <p
                        style={{
                          margin: '6px 0 0 0',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        grams per week
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setState((s) => {
                          const cur = parseFloat(s.weeklyDrop) || 0
                          return { ...s, weeklyDrop: String(Math.round((cur + 0.5) * 2) / 2) }
                        })
                      }
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={18} color="var(--text-secondary)" strokeWidth={2} />
                    </button>
                  </div>
                  {customWeeks > 0 && (
                    <p
                      style={{
                        margin: '10px 0 0 0',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                      }}
                    >
                      Reaches goal in{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{customWeeks} weeks</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Schedule preview */}
              {schedulePreview.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  {schedulePreview.map((row, i) => (
                    <div
                      key={row.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderBottom:
                          i < schedulePreview.length - 1 ? '1px solid var(--border)' : 'none',
                        backgroundColor: i === 0 ? 'rgba(232,168,124,0.05)' : 'transparent',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color:
                            i === 0
                              ? 'var(--primary)'
                              : i === schedulePreview.length - 1
                                ? 'var(--success)'
                                : 'var(--text-secondary)',
                          fontWeight: i === 0 || i === schedulePreview.length - 1 ? 600 : 400,
                        }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color:
                            i === schedulePreview.length - 1
                              ? 'var(--success)'
                              : 'var(--text-primary)',
                        }}
                      >
                        {row.dose === 0 ? '0g' : formatGrams(row.dose)}/day
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Optional: Why */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 20,
                  padding: 20,
                  border: '1px solid var(--border)',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Why are you doing this?{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (optional)
                  </span>
                </label>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: '0 0 10px 0',
                    lineHeight: 1.5,
                  }}
                >
                  Shown to you in the craving SOS when it gets hard.
                </p>
                <textarea
                  value={state.reasons}
                  onChange={(e) =>
                    setState((s) => ({ ...s, reasons: e.target.value.slice(0, 400) }))
                  }
                  placeholder={'e.g. "I want to be present for my kids."'}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: 1.6,
                    resize: 'none',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Optional: Emergency contact */}
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 20,
                  padding: 20,
                  border: '1px solid var(--border)',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Your person{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    (optional)
                  </span>
                </label>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    margin: '0 0 12px 0',
                    lineHeight: 1.5,
                  }}
                >
                  Someone to call from the craving SOS screen.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={state.contactName}
                    onChange={(e) => setState((s) => ({ ...s, contactName: e.target.value }))}
                    style={{
                      flex: 1,
                      height: 46,
                      padding: '0 14px',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={state.contactPhone}
                    onChange={(e) => setState((s) => ({ ...s, contactPhone: e.target.value }))}
                    style={{
                      flex: 1.4,
                      height: 46,
                      padding: '0 14px',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                <button
                  onClick={handleSave}
                  disabled={
                    saving ||
                    (!state.selectedOption.isColdTurkey && (dropNum <= 0 || customWeeks <= 0))
                  }
                  style={{
                    ...primaryBtn,
                    opacity:
                      saving ||
                      (!state.selectedOption.isColdTurkey && (dropNum <= 0 || customWeeks <= 0))
                        ? 0.5
                        : 1,
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving…' : 'Start this plan'}{' '}
                  {!saving && <ArrowRight size={18} strokeWidth={2} />}
                </button>
                <button
                  onClick={() => go(3, -1)}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowLeft size={16} strokeWidth={2} /> Back to options
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const router = useRouter()
  const { taperPlan } = useAppStore()
  const { updatePlan } = useFirestore()
  const { permission, reminderTime, setReminderTime, requestPermission } = useNotifications()

  const [mode, setMode] = useState<'overview' | 'edit'>(taperPlan ? 'overview' : 'edit')
  const [startAmount, setStartAmount] = useState(taperPlan?.startAmount ?? 8)
  const [targetAmount, setTargetAmount] = useState(taperPlan?.targetAmount ?? 0)
  const [weeksToTarget, setWeeksToTarget] = useState(taperPlan?.weeksToTarget ?? 12)
  const [daysToTarget, setDaysToTarget] = useState<number>(
    taperPlan?.daysToTarget !== undefined
      ? taperPlan.daysToTarget
      : (taperPlan?.weeksToTarget ?? 12) * 7
  )
  const [taperUnit, setTaperUnit] = useState<'weeks' | 'days' | 'cold_turkey'>(() => {
    if (!taperPlan) return 'weeks'
    if (taperPlan.daysToTarget === 0) return 'cold_turkey'
    if (taperPlan.daysToTarget !== undefined && taperPlan.daysToTarget % 7 !== 0) return 'days'
    return 'weeks'
  })
  const [reasons, setReasons] = useState(taperPlan?.reasons ?? '')
  const [contactName, setContactName] = useState(taperPlan?.emergencyContact?.name ?? '')
  const [contactPhone, setContactPhone] = useState(taperPlan?.emergencyContact?.phone ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(!!reminderTime)
  const [localReminderTime, setLocalReminderTime] = useState(reminderTime || '09:00')

  useEffect(() => {
    if (reminderTime) {
      setReminderEnabled(true)
      setLocalReminderTime(reminderTime)
    }
  }, [reminderTime])

  useEffect(() => {
    if (taperPlan) {
      setStartAmount(taperPlan.startAmount)
      setTargetAmount(taperPlan.targetAmount)
      setWeeksToTarget(taperPlan.weeksToTarget)
      const days =
        taperPlan.daysToTarget !== undefined ? taperPlan.daysToTarget : taperPlan.weeksToTarget * 7
      setDaysToTarget(days)
      if (taperPlan.daysToTarget === 0) setTaperUnit('cold_turkey')
      else if (taperPlan.daysToTarget !== undefined && taperPlan.daysToTarget % 7 !== 0)
        setTaperUnit('days')
      else setTaperUnit('weeks')
      setReasons(taperPlan.reasons ?? '')
      setContactName(taperPlan.emergencyContact?.name ?? '')
      setContactPhone(taperPlan.emergencyContact?.phone ?? '')
    }
  }, [taperPlan])

  async function handleToggleReminder() {
    if (!reminderEnabled) {
      if (permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) return
      }
      setReminderEnabled(true)
      setReminderTime(localReminderTime)
    } else {
      setReminderEnabled(false)
      setReminderTime(null)
    }
  }

  function handleReminderTimeChange(time: string) {
    setLocalReminderTime(time)
    if (reminderEnabled) setReminderTime(time)
  }

  const effectiveDays =
    taperUnit === 'cold_turkey' ? 0 : taperUnit === 'days' ? daysToTarget : weeksToTarget * 7
  const effectiveTargetAmount = taperUnit === 'cold_turkey' ? 0 : targetAmount

  async function handleSave() {
    if (isSaving) return
    setIsSaving(true)
    const plan: TaperPlan = {
      startAmount,
      targetAmount: effectiveTargetAmount,
      startDate: taperPlan?.startDate ?? getTodayKey(),
      weeksToTarget:
        taperUnit === 'cold_turkey'
          ? 0
          : taperUnit === 'days'
            ? Math.max(1, Math.round(daysToTarget / 7))
            : weeksToTarget,
      daysToTarget: effectiveDays,
      currentDailyTarget: 0,
      reasons: reasons.trim() || undefined,
      emergencyContact: contactName.trim()
        ? { name: contactName.trim(), phone: contactPhone.trim() }
        : undefined,
    }
    try {
      await updatePlan(plan)
      setSaved(true)
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err) {
      console.error('Failed to save plan:', err)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleWizardSave(plan: TaperPlan) {
    await updatePlan(plan)
    setSaved(true)
    setTimeout(() => {
      router.push('/')
    }, 1500)
  }

  async function handleHold() {
    if (!taperPlan || isHolding) return
    setIsHolding(true)
    const today = new Date()
    const holdEnd = new Date(today)
    holdEnd.setDate(holdEnd.getDate() + 6)
    await updatePlan({ ...taperPlan, holdStartDate: getTodayKey(), holdUntil: dateToKey(holdEnd) })
    setIsHolding(false)
  }

  async function handleResumeHold() {
    if (!taperPlan || isHolding) return
    setIsHolding(true)
    const { holdUntil: _h, holdStartDate: _s, ...rest } = taperPlan
    await updatePlan(rest)
    setIsHolding(false)
  }

  const holdIsActive = !!(
    taperPlan?.holdUntil && new Date(taperPlan.holdUntil) >= new Date(getTodayKey())
  )

  if (saved) {
    return (
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <motion.div
          key="saved"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(232,168,124,0.15)',
              border: '2px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={36} color="var(--primary)" strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Plan saved!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>
            Your taper schedule is set. Take it one day at a time.
          </p>
        </motion.div>
      </div>
    )
  }

  // New user: show wizard
  if (!taperPlan && mode === 'edit') {
    return (
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 32 }}>
        <PlanWizard onSave={handleWizardSave} />
      </div>
    )
  }

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <AnimatePresence mode="wait">
        {mode === 'overview' && taperPlan ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Header */}
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 4px 0',
                  }}
                >
                  My plan
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  {(() => {
                    const d =
                      taperPlan.daysToTarget !== undefined
                        ? taperPlan.daysToTarget
                        : taperPlan.weeksToTarget * 7
                    if (d === 0) return `${formatGrams(taperPlan.startAmount)} → 0g (cold turkey)`
                    const goal =
                      taperPlan.targetAmount === 0 ? 'zero' : formatGrams(taperPlan.targetAmount)
                    if (d % 7 === 0)
                      return `${formatGrams(taperPlan.startAmount)} → ${goal} over ${d / 7} weeks`
                    return `${formatGrams(taperPlan.startAmount)} → ${goal} over ${d} days`
                  })()}
                </p>
              </div>
              <button
                onClick={() => setMode('edit')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 10,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={13} strokeWidth={2} /> Edit
              </button>
            </div>

            {/* Hold mode */}
            <div
              style={{
                backgroundColor: holdIsActive ? 'rgba(232,168,124,0.08)' : 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${holdIsActive ? 'rgba(232,168,124,0.3)' : 'var(--border)'}`,
              }}
            >
              {holdIsActive ? (
                <>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Hold active until{' '}
                    {new Date(taperPlan.holdUntil!).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      margin: '0 0 14px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    Taper paused at {formatGrams(getDailyTargetForDate(taperPlan, new Date()))}{' '}
                    until then. Rest and recover.
                  </p>
                  <button
                    onClick={handleResumeHold}
                    disabled={isHolding}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: 12,
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: 14,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {isHolding ? 'Updating…' : 'Resume taper now'}
                  </button>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Need a breather?
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      margin: '0 0 14px 0',
                      lineHeight: 1.5,
                    }}
                  >
                    Hold at your current dose for 7 days, then resume automatically. No shame in
                    rest.
                  </p>
                  <button
                    onClick={handleHold}
                    disabled={isHolding}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: 12,
                      backgroundColor: 'rgba(232,168,124,0.1)',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      fontSize: 14,
                      border: '1px solid rgba(232,168,124,0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    {isHolding ? 'Setting hold…' : 'Hold for 7 days'}
                  </button>
                </>
              )}
            </div>

            {/* Today's target + drop + goal */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                {
                  label: "Today's target",
                  value: formatGrams(getDailyTargetForDate(taperPlan, new Date())),
                  color: 'var(--primary)',
                },
                {
                  label: (() => {
                    const d =
                      taperPlan.daysToTarget !== undefined
                        ? taperPlan.daysToTarget
                        : taperPlan.weeksToTarget * 7
                    return d === 0 ? 'Mode' : d % 7 === 0 ? 'Weekly drop' : 'Daily drop'
                  })(),
                  value: (() => {
                    const d =
                      taperPlan.daysToTarget !== undefined
                        ? taperPlan.daysToTarget
                        : taperPlan.weeksToTarget * 7
                    if (d === 0) return 'Cold turkey'
                    const reduction = taperPlan.startAmount - taperPlan.targetAmount
                    if (d % 7 === 0) return formatGrams(Math.round((reduction / (d / 7)) * 10) / 10)
                    return formatGrams(Math.round((reduction / d) * 10) / 10)
                  })(),
                  color: 'var(--text-primary)',
                },
                {
                  label: 'Goal',
                  value: taperPlan.targetAmount === 0 ? '0g' : formatGrams(taperPlan.targetAmount),
                  color: 'var(--success)',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--surface)',
                    borderRadius: 16,
                    padding: '16px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                </div>
              ))}
            </div>

            <TaperTrajectoryChart plan={taperPlan} />

            {/* Reminders */}
            {permission !== 'unsupported' && (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 20,
                  padding: 20,
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: reminderEnabled ? 16 : 0,
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: '0 0 2px 0',
                      }}
                    >
                      Daily reminder
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      {permission === 'denied'
                        ? 'Notifications blocked — enable in browser settings'
                        : 'Gentle nudge to log your dose'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleReminder}
                    disabled={permission === 'denied'}
                    style={{
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: reminderEnabled ? 'var(--primary)' : 'var(--border)',
                      border: 'none',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                      opacity: permission === 'denied' ? 0.4 : 1,
                      cursor: permission === 'denied' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: reminderEnabled ? 23 : 3,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                </div>
                {reminderEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Remind me at
                    </label>
                    <input
                      type="time"
                      value={localReminderTime}
                      onChange={(e) => handleReminderTimeChange(e.target.value)}
                      style={{
                        width: '100%',
                        height: 44,
                        padding: '0 12px',
                        borderRadius: 12,
                        fontSize: 16,
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                      }}
                    />
                  </motion.div>
                )}
              </div>
            )}

            {taperPlan.reasons && (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 16,
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 8px 0',
                  }}
                >
                  Why you&apos;re doing this
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: 1.6,
                    fontStyle: 'italic',
                  }}
                >
                  &ldquo;{taperPlan.reasons}&rdquo;
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          /* Edit existing plan */
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 6px 0',
                  }}
                >
                  Edit your plan
                </h1>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  A realistic taper is kinder to your body.
                </p>
              </div>
              {taperPlan && (
                <button
                  onClick={() => setMode('overview')}
                  style={{
                    height: 36,
                    padding: '0 14px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Starting amount — number input, no max */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 12,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Current daily amount
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={startAmount}
                onChange={(e) => setStartAmount(parseFloat(e.target.value) || 0)}
                style={{ ...inputStyle, fontSize: 24, fontWeight: 800, textAlign: 'center' }}
              />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                How much you typically take per day right now
              </p>
            </div>

            {/* Target amount */}
            {taperUnit !== 'cold_turkey' && (
              <div
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 20,
                  padding: 20,
                  border: '1px solid var(--border)',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: 12,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Goal amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    ...inputStyle,
                    fontSize: 24,
                    fontWeight: 800,
                    textAlign: 'center',
                    accentColor: 'var(--success)',
                  }}
                />
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                  {targetAmount === 0
                    ? 'Fully quit — a powerful goal.'
                    : `Reduce to ${formatGrams(targetAmount)}/day`}
                </p>
                {startAmount <= effectiveTargetAmount && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--danger)',
                      margin: '6px 0 0 0',
                      fontWeight: 600,
                    }}
                  >
                    Goal must be less than starting amount
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 12,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Timeline
              </label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['weeks', 'days', 'cold_turkey'] as const).map((u) => (
                  <button
                    key={u}
                    onClick={() => setTaperUnit(u)}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: taperUnit === u ? 700 : 400,
                      cursor: 'pointer',
                      backgroundColor:
                        taperUnit === u
                          ? u === 'cold_turkey'
                            ? 'rgba(224,92,92,0.12)'
                            : 'rgba(232,168,124,0.15)'
                          : 'var(--bg)',
                      color:
                        taperUnit === u
                          ? u === 'cold_turkey'
                            ? '#e05c5c'
                            : 'var(--primary)'
                          : 'var(--text-secondary)',
                      border: `1px solid ${taperUnit === u ? (u === 'cold_turkey' ? '#e05c5c' : 'var(--primary)') : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {u === 'weeks' ? 'Weeks' : u === 'days' ? 'Days' : 'Cold turkey'}
                  </button>
                ))}
              </div>

              {taperUnit === 'cold_turkey' ? (
                <div
                  style={{
                    backgroundColor: 'rgba(224,92,92,0.07)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid rgba(224,92,92,0.2)',
                  }}
                >
                  <p
                    style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: '#e05c5c' }}
                  >
                    Quit immediately
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    Your target becomes 0g starting today. Consider a taper if you&apos;ve been
                    using for a long time.
                  </p>
                </div>
              ) : taperUnit === 'days' ? (
                <>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={daysToTarget}
                    onChange={(e) => setDaysToTarget(parseInt(e.target.value) || 1)}
                    style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center' }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                    days total — reducing by ~
                    {formatGrams(
                      Math.round(((startAmount - effectiveTargetAmount) / daysToTarget) * 10) / 10
                    )}{' '}
                    per day
                  </p>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={weeksToTarget}
                    onChange={(e) => setWeeksToTarget(parseInt(e.target.value) || 1)}
                    style={{ ...inputStyle, fontSize: 22, fontWeight: 800, textAlign: 'center' }}
                  />
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
                    weeks total — reducing by ~
                    {formatGrams(
                      Math.round(((startAmount - effectiveTargetAmount) / weeksToTarget) * 10) / 10
                    )}{' '}
                    per week
                  </p>
                </>
              )}
            </div>

            {/* Reasons */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Why are you doing this?
              </label>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 10px 0',
                  lineHeight: 1.5,
                }}
              >
                Written to you, shown inside the craving SOS when it gets hard.
              </p>
              <textarea
                value={reasons}
                onChange={(e) => setReasons(e.target.value.slice(0, 400))}
                placeholder={'e.g. "I want to be present for my kids."'}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.6,
                  resize: 'none',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Emergency contact */}
            <div
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: 20,
                padding: 20,
                border: '1px solid var(--border)',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                My person (optional)
              </label>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  margin: '0 0 12px 0',
                  lineHeight: 1.5,
                }}
              >
                A call button in the craving SOS for when it gets really hard.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={{
                    flex: 1,
                    height: 46,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{
                    flex: 1.4,
                    height: 46,
                    padding: '0 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={
                isSaving || (taperUnit !== 'cold_turkey' && startAmount <= effectiveTargetAmount)
              }
              style={{
                height: 56,
                borderRadius: 16,
                backgroundColor:
                  taperUnit === 'cold_turkey' || startAmount > effectiveTargetAmount
                    ? 'var(--primary)'
                    : 'var(--surface-elevated)',
                color:
                  taperUnit === 'cold_turkey' || startAmount > effectiveTargetAmount
                    ? 'var(--bg)'
                    : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: 17,
                border: 'none',
                transition: 'all 0.2s ease',
                opacity: isSaving ? 0.7 : 1,
                cursor:
                  isSaving || (taperUnit !== 'cold_turkey' && startAmount <= effectiveTargetAmount)
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {isSaving ? 'Saving…' : 'Update plan'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
