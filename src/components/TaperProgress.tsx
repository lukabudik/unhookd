'use client'

import { useMemo } from 'react'
import { formatGrams, getProgressPercent } from '@/lib/utils'

interface TaperProgressProps {
  current: number
  target: number
  weeklyContext?: string
}

function ArcProgress({ percent }: { percent: number }) {
  // SVG arc progress ring
  const size = 220
  const strokeWidth = 16
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // We use 270 degrees of the circle (start from bottom-left, end at bottom-right)
  const arcLength = circumference * 0.75
  const clampedPercent = Math.min(percent, 100)
  const progressLength = (clampedPercent / 100) * arcLength
  const gapLength = arcLength - progressLength

  // Color based on percentage
  let strokeColor = 'var(--success)' // green = good
  if (percent > 100) strokeColor = 'var(--danger)'
  else if (percent > 85) strokeColor = 'var(--primary-muted)'
  else if (percent > 60) strokeColor = 'var(--primary)'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(135deg)' }}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeLinecap="round"
        strokeDashoffset={0}
      />
      {/* Progress arc */}
      {clampedPercent > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progressLength} ${gapLength + (circumference - arcLength)}`}
          strokeLinecap="round"
          strokeDashoffset={0}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s ease' }}
        />
      )}
    </svg>
  )
}

export function TaperProgress({ current, target, weeklyContext }: TaperProgressProps) {
  const percent = useMemo(() => getProgressPercent(current, target), [current, target])
  const remaining = Math.max(0, target - current)

  const statusMessage = useMemo(() => {
    if (percent > 100) return "Over today's goal — that's okay, tomorrow is fresh"
    if (percent > 85) return "Almost at your limit — you've got this"
    if (percent > 50) return 'Making your way through the day — stay steady'
    return 'Great day! Well within your goal'
  }, [percent])

  const statusColor = useMemo(() => {
    if (percent > 100) return 'var(--danger)'
    if (percent > 85) return 'var(--primary-muted)'
    return 'var(--success)'
  }, [percent])

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 24,
        padding: '24px 16px',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Arc progress visual */}
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <ArcProgress percent={percent} />
        {/* Center text */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 20,
          }}
        >
          <span
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {formatGrams(current)}
          </span>
          <span
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              marginTop: 6,
            }}
          >
            of {formatGrams(target)} today
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--primary)',
              marginTop: 4,
            }}
          >
            {percent}%
          </span>
        </div>
      </div>

      {/* Status message */}
      <div
        style={{
          textAlign: 'center',
          padding: '12px 16px',
          backgroundColor: 'var(--surface-elevated)',
          borderRadius: 12,
          width: '100%',
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: statusColor,
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {statusMessage}
        </p>
      </div>

      {/* Remaining + weekly context */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {remaining > 0 && percent <= 100 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)' }}>
              {formatGrams(remaining)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              remaining today
            </div>
          </div>
        )}
        {weeklyContext && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg)',
              borderRadius: 8,
              padding: '4px 10px',
              lineHeight: 1.4,
              textAlign: 'center',
            }}
          >
            {weeklyContext}
          </div>
        )}
      </div>
    </div>
  )
}
