'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DoseLogger } from '@/components/DoseLogger'
import { useFirestore } from '@/hooks/useFirestore'
import { useAppStore } from '@/lib/store'
import { getDailyTargetForDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function LogPage() {
  const router = useRouter()
  const { addIntake } = useFirestore()
  const { taperPlan } = useAppStore()
  const dailyTarget = taperPlan ? getDailyTargetForDate(taperPlan, new Date()) : 6

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 14,
            padding: '0 0 20px 0',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Back
        </button>

        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 6px 0',
            }}
          >
            Log a dose
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Tracking honestly is an act of self-care. No judgment here.
          </p>
        </div>

        <DoseLogger
          dailyTarget={dailyTarget}
          onLog={addIntake}
          onSuccess={() => {
            setTimeout(() => router.push('/'), 300)
          }}
        />
      </motion.div>
    </div>
  )
}
