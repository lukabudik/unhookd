'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 10px 0',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40 }}>
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

        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 6px 0',
          }}
        >
          Privacy & Disclaimer
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 32px 0' }}>
          Last updated April 2026
        </p>

        <Section title="Not medical advice">
          <p style={{ margin: '0 0 10px 0' }}>
            Unhookd is a personal tracking tool, not a medical service. Nothing in this app —
            including supplement suggestions, phase guidance, taper schedules, or any other content
            — constitutes medical advice, diagnosis, or treatment.
          </p>
          <p style={{ margin: 0 }}>
            If you are experiencing severe withdrawal symptoms, please seek medical attention.
            Kratom withdrawal can cause significant physical and psychological discomfort. A doctor
            can provide medications (such as clonidine, hydroxyzine, or comfort medications) that
            meaningfully reduce withdrawal severity.
          </p>
        </Section>

        <Section title="Your data stays on your device">
          <p style={{ margin: '0 0 10px 0' }}>
            All of your dose logs, check-ins, and plan data are stored locally on this device. We do
            not collect your name, email address, or any identifying information.
          </p>
          <p style={{ margin: 0 }}>
            Your data is backed up to our servers under your recovery code — a randomly generated
            12-character code that only you hold. Without this code, nobody (including us) can
            access your data. Store it somewhere safe.
          </p>
        </Section>

        <Section title="Anonymous analytics">
          <p style={{ margin: 0 }}>
            We collect anonymous, aggregated usage patterns — things like which features are used,
            how many people complete their taper, and general app performance. This data cannot be
            traced back to any individual. It helps us understand what actually supports kratom
            recovery and improve the app accordingly.
          </p>
        </Section>

        <Section title="Supplement information">
          <p style={{ margin: 0 }}>
            Supplement suggestions in Unhookd are based on community experience and published harm
            reduction research. They are not evaluated by any regulatory authority. Always consult a
            pharmacist or doctor before starting any supplement, especially if you take prescription
            medications, as interactions are possible.
          </p>
        </Section>

        <Section title="Harm reduction">
          <p style={{ margin: 0 }}>
            Unhookd is built on harm reduction principles. We believe that reducing kratom use at
            any pace is better than not reducing at all. We do not judge your choices, your starting
            dose, or how long your journey takes. The app is here to support you, not to shame you.
          </p>
        </Section>

        <Section title="Open source & contact">
          <p style={{ margin: 0 }}>
            If you have questions, feedback, or concerns, you can reach us at{' '}
            <a
              href="mailto:hello@unhookd.app"
              style={{ color: 'var(--primary)', textDecoration: 'none' }}
            >
              hello@unhookd.app
            </a>
            .
          </p>
        </Section>
      </motion.div>
    </div>
  )
}
