'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        strokeLinejoin="round"
        fill={active ? 'rgba(232,168,124,0.15)' : 'none'}
      />
    </svg>
  )
}

function LogIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        fill={active ? 'rgba(232,168,124,0.15)' : 'none'}
      />
      <path
        d="M12 8V16M8 12H16"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="3"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        fill={active ? 'rgba(232,168,124,0.15)' : 'none'}
      />
      <path
        d="M3 9H21"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
      />
      <path
        d="M8 2V6M16 2V6"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M7 13H9M11 13H13M15 13H17M7 17H9M11 17H13"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlanIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 6H20M4 12H20M4 18H20"
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle
        cx="8"
        cy="6"
        r="2.5"
        fill={active ? 'var(--primary)' : 'var(--bg)'}
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
      />
      <circle
        cx="16"
        cy="12"
        r="2.5"
        fill={active ? 'var(--primary)' : 'var(--bg)'}
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
      />
      <circle
        cx="10"
        cy="18"
        r="2.5"
        fill={active ? 'var(--primary)' : 'var(--bg)'}
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.5"
      />
    </svg>
  )
}

function InsightsIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="3"
        y="12"
        width="4"
        height="9"
        rx="1.5"
        fill={active ? 'rgba(232,168,124,0.3)' : 'none'}
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
      />
      <rect
        x="10"
        y="7"
        width="4"
        height="14"
        rx="1.5"
        fill={active ? 'rgba(232,168,124,0.3)' : 'none'}
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
      />
      <rect
        x="17"
        y="3"
        width="4"
        height="18"
        rx="1.5"
        fill={active ? 'rgba(232,168,124,0.3)' : 'none'}
        stroke={active ? 'var(--primary)' : 'var(--text-secondary)'}
        strokeWidth="1.75"
      />
    </svg>
  )
}

const tabs = [
  { href: '/', label: 'Today', Icon: HomeIcon },
  { href: '/log', label: 'Log', Icon: LogIcon },
  { href: '/history', label: 'History', Icon: HistoryIcon },
  { href: '/insights', label: 'Insights', Icon: InsightsIcon },
  { href: '/plan', label: 'Plan', Icon: PlanIcon },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 430,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
        }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '10px 8px',
                textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
            >
              <Icon active={isActive} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  letterSpacing: '0.03em',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
