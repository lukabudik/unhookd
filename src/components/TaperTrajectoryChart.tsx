'use client'

import { useMemo } from 'react'
import { TaperPlan } from '@/lib/store'
import { getDailyTargetForDate, getDaysSincePlanStart, formatGrams, dateToKey } from '@/lib/utils'

interface Props {
  plan: TaperPlan
}

function loadActualHistory(plan: TaperPlan): { day: number; total: number }[] {
  if (typeof window === 'undefined') return []
  const daysSinceStart = getDaysSincePlanStart(plan.startDate)
  const result: { day: number; total: number }[] = []
  const lookback = Math.min(daysSinceStart, plan.weeksToTarget * 7)
  for (let i = 0; i <= lookback; i++) {
    const d = new Date(plan.startDate)
    d.setDate(d.getDate() + i)
    const key = dateToKey(d)
    try {
      const raw = localStorage.getItem(`unhookd_intakes_${key}`)
      if (raw) {
        const entries = JSON.parse(raw) as Array<{ amount: number }>
        const total = entries.reduce((s, e) => s + e.amount, 0)
        if (total > 0) result.push({ day: i, total })
      }
    } catch { /* ignore */ }
  }
  return result
}

export function TaperTrajectoryChart({ plan }: Props) {
  const totalDays = plan.weeksToTarget * 7
  const daysSinceStart = getDaysSincePlanStart(plan.startDate)
  const todayDay = Math.min(daysSinceStart, totalDays)

  const actual = useMemo(() => loadActualHistory(plan), [plan])

  const W = 340
  const H = 160
  const PAD_L = 36
  const PAD_R = 12
  const PAD_T = 12
  const PAD_B = 28
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxY = plan.startAmount * 1.1
  const toX = (day: number) => PAD_L + (day / totalDays) * chartW
  const toY = (g: number) => PAD_T + chartH - (g / maxY) * chartH

  // Planned taper line points (sample every ~7 days for smoothness)
  const planPoints: string[] = []
  const sampleDays = Math.min(totalDays, 100)
  for (let i = 0; i <= sampleDays; i++) {
    const day = Math.round((i / sampleDays) * totalDays)
    const d = new Date(plan.startDate)
    d.setDate(d.getDate() + day)
    const target = getDailyTargetForDate(plan, d)
    planPoints.push(`${toX(day).toFixed(1)},${toY(target).toFixed(1)}`)
  }

  const todayX = toX(todayDay)
  const todayTarget = getDailyTargetForDate(plan, new Date())

  // Y-axis labels
  const yLabels = [plan.startAmount, plan.startAmount / 2, plan.targetAmount].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 20,
        padding: '16px 12px 8px',
        border: '1px solid var(--border)',
      }}
    >
      <p style={{ margin: '0 0 12px 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Your taper arc
      </p>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        {/* Y-axis labels */}
        {yLabels.map(v => (
          <text
            key={v}
            x={PAD_L - 4}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize="9"
            fill="var(--text-secondary)"
          >
            {formatGrams(v)}
          </text>
        ))}

        {/* Horizontal grid lines */}
        {yLabels.map(v => (
          <line
            key={v}
            x1={PAD_L}
            y1={toY(v)}
            x2={W - PAD_R}
            y2={toY(v)}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}

        {/* X-axis labels: start, midpoint, end */}
        {[0, Math.round(totalDays / 2), totalDays].map(day => (
          <text
            key={day}
            x={toX(day)}
            y={H - 6}
            textAnchor={day === 0 ? 'start' : day === totalDays ? 'end' : 'middle'}
            fontSize="9"
            fill="var(--text-secondary)"
          >
            {day === 0 ? 'Start' : day === totalDays ? `Wk ${plan.weeksToTarget}` : `Wk ${Math.round(day / 7)}`}
          </text>
        ))}

        {/* Planned taper line */}
        <polyline
          points={planPoints.join(' ')}
          fill="none"
          stroke="rgba(232,168,124,0.4)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Shaded area under plan line */}
        <polygon
          points={[
            `${PAD_L},${toY(0)}`,
            ...planPoints,
            `${toX(totalDays)},${toY(0)}`,
          ].join(' ')}
          fill="rgba(232,168,124,0.06)"
        />

        {/* Actual logged dots */}
        {actual.map(({ day, total }) => {
          const isOver = total > getDailyTargetForDate(plan, (() => { const d = new Date(plan.startDate); d.setDate(d.getDate() + day); return d })())
          return (
            <circle
              key={day}
              cx={toX(day)}
              cy={toY(total)}
              r="3"
              fill={isOver ? 'var(--danger)' : 'var(--success)'}
              opacity="0.85"
            />
          )
        })}

        {/* Today vertical line */}
        {todayDay > 0 && (
          <>
            <line
              x1={todayX}
              y1={PAD_T}
              x2={todayX}
              y2={PAD_T + chartH}
              stroke="var(--primary)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={todayX}
              cy={toY(todayTarget)}
              r="5"
              fill="var(--primary)"
            />
          </>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 4, padding: '0 4px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 2, backgroundColor: 'rgba(232,168,124,0.6)', borderRadius: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Target</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>On track</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Over target</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Today</span>
        </div>
      </div>
    </div>
  )
}
