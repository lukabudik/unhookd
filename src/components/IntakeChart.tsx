'use client'

import { useMemo } from 'react'
import { getDayLabel, dateToKey } from '@/lib/utils'
import { TaperPlan } from '@/lib/store'
import { getDailyTargetForDate } from '@/lib/utils'

interface DayData {
  date: Date
  total: number
  target: number
}

interface IntakeChartProps {
  data: DayData[]
  plan: TaperPlan | null
}

export function IntakeChart({ data, plan }: IntakeChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => {
      const target = plan ? getDailyTargetForDate(plan, d.date) : d.target
      const isOver = d.total > target
      const isToday = dateToKey(d.date) === dateToKey(new Date())
      return { ...d, target, isOver, isToday }
    })
  }, [data, plan])

  const maxValue = useMemo(() => {
    const values = chartData.flatMap((d) => [d.total, d.target])
    return Math.max(...values, 1)
  }, [chartData])

  const chartHeight = 120

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 20,
        padding: '20px 16px',
        border: '1px solid var(--border)',
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          margin: '0 0 16px 0',
        }}
      >
        7-Day Overview
      </h3>

      <div style={{ position: 'relative' }}>
        {/* SVG Chart */}
        <svg
          width="100%"
          height={chartHeight + 32}
          viewBox={`0 0 ${chartData.length * 44} ${chartHeight + 32}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          {/* Target line */}
          {chartData.map((d, i) => {
            const targetY = chartHeight - (d.target / maxValue) * chartHeight
            if (i === 0) return null
            const prevD = chartData[i - 1]
            const prevTargetY = chartHeight - (prevD.target / maxValue) * chartHeight
            const x1 = (i - 1) * 44 + 22
            const x2 = i * 44 + 22
            return (
              <line
                key={`target-${i}`}
                x1={x1}
                y1={prevTargetY}
                x2={x2}
                y2={targetY}
                stroke="var(--primary-muted)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity={0.6}
              />
            )
          })}

          {/* Bars */}
          {chartData.map((d, i) => {
            const barHeight = Math.max((d.total / maxValue) * chartHeight, d.total > 0 ? 4 : 0)
            const barY = chartHeight - barHeight
            const x = i * 44 + 10
            const barWidth = 24
            const color = d.total === 0 ? 'var(--border)' : d.isOver ? 'var(--danger)' : 'var(--success)'

            return (
              <g key={`bar-${i}`}>
                {/* Bar */}
                <rect
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={5}
                  fill={color}
                  opacity={d.isToday ? 1 : 0.7}
                />
                {/* Today indicator dot */}
                {d.isToday && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={chartHeight + 8}
                    r={3}
                    fill="var(--primary)"
                  />
                )}
                {/* Day label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 26}
                  textAnchor="middle"
                  fontSize={10}
                  fill={d.isToday ? 'var(--primary)' : 'var(--text-secondary)'}
                  fontWeight={d.isToday ? 700 : 400}
                >
                  {getDayLabel(d.date)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 12,
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: 'var(--success)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>At/under goal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: 'var(--danger)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Over goal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 24,
              height: 2,
              background: 'repeating-linear-gradient(90deg, var(--primary-muted) 0px, var(--primary-muted) 4px, transparent 4px, transparent 7px)',
              opacity: 0.8,
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Target</span>
        </div>
      </div>
    </div>
  )
}
