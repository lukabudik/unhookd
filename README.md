# Unhookd

**A personal taper companion for reducing kratom — warm, steady, one day at a time.**

> Built for the real experience of quitting: the cravings at 2am, the flat weeks after you hit zero, the days when staying on plan takes genuine effort.

**[→ unhookd.health](https://unhookd.health)**

[![CI](https://github.com/lukabudik/unhookd/actions/workflows/ci.yml/badge.svg)](https://github.com/lukabudik/unhookd/actions/workflows/ci.yml)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black?logo=vercel)](https://unhookd.health)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## The Story

Kratom is easy to start and genuinely hard to stop. Unlike most substances, it hits both opioid and stimulant receptors — so withdrawal is exhausting _and_ anxious at the same time. The physical peak passes in about a week. The psychological flatness can drag on for months. Most people relapse not during the hard part, but 4–6 weeks in, when life feels gray and they don't know why.

I built Unhookd because the tools that existed felt clinical — dose trackers, habit apps, generic step-count widgets. None of them understood the actual shape of what quitting kratom feels like. This one tries to.

It's a mobile-first PWA designed to be installed on your phone and used daily. Everything runs locally by default — no account, no server, just your data on your device. Firebase sync is optional for backup and cross-device recovery.

---

## Features

### Daily Tracking

- **Progress ring** — visual arc showing today's dose vs. your daily target
- **Quick-log bottom sheet** — log a dose in 2 taps from the home screen; preset amounts scale with your target
- **Hold quick action** — pause the taper for 7 days directly from the home screen when you need a breather
- **Dose editing** — tap any logged dose to correct or delete it

### Taper Plan

- **Guided plan wizard** — answer two questions (current dose, goal); the app generates a personalised taper with four pace options (Gentle / Steady / Fast / Cold turkey), all derived from a single formula rather than hardcoded tiers
- **Customisable review step** — after choosing a pace, adjust the weekly drop live and watch the milestone schedule update in real time
- **Taper trajectory chart** — shows your full planned curve with actual logged dots and a "you are here" marker
- **Hold mode** — pause the taper for 7 days, then resume smoothly from where you left off
- **Reasons & emergency contact** — write down why you're doing this and optionally set a person to call; both appear inside the craving SOS

### Craving Support

- **Craving SOS** — guided breathing modal with contextual message using your personal reasons and current streak
- **Emergency contact** — one-tap call button inside the SOS modal
- **Resistance tracking** — log when you rode out a craving; counts are tracked in Insights

### Daily Check-in

- **5-level mood scale** — quick check-in each day
- **Symptom tracker** — log sleep quality, anxiety, restlessness, and GI symptoms with fine/mild/bad severity
- **Movement tracker** — simple yes/no for daily exercise
- **Free-text note** — optional note for the day

### Phase-Aware Guidance

- **Kratom-specific phase content** — 8 distinct phases from early taper through PAWS, each with copy written for that specific stage
- **Symptom-to-supplement engine** — reads recent check-in data, scores 11 evidence-based supplements by symptom relevance, surfaces the top suggestions with dose guidance and plain-language explanations. Shown on Today (when recent symptoms logged) and Insights
- **Post-zero mode** — home screen shifts to a days-clean counter with PAWS-specific guidance

### History & Insights

- **History from plan start** — tap any day to drill into individual doses, edit or delete entries, or add a missed dose; date range starts from when you began your plan, not an arbitrary 30-day lookback
- **"X of 7 days" streak** — weekly on-target metric, less punishing than consecutive-day streaks
- **Insights page** — week-over-week averages, plan-relative pace sentence, mood breakdown, dose timing patterns, craving resistance, symptom trends, and movement days; all charts use a dynamic window that matches how long you've been using the app
- **Milestones** — streak, journey, and taper progress milestones with celebration modals

### PWA & Installation

- **Installable PWA** — works like a native app; no App Store needed
- **`/install` page** — shareable link with platform-specific installation instructions (iOS Safari steps, Android one-tap install, desktop QR code)
- **Daily reminders** — enable once; the app handles the rest
- **Data export** — download everything as JSON from Settings
- **Full reset** — wipe all data with a confirmation modal

---

## Tech Stack

| Layer         | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)                            |
| Language      | TypeScript (strict)                                           |
| Styling       | Tailwind CSS v4                                               |
| Animation     | Framer Motion                                                 |
| State         | Zustand                                                       |
| Data          | Firebase (Firestore + Anonymous Auth) + localStorage fallback |
| Notifications | Web Notification API + Firebase Cloud Messaging               |
| PWA           | Custom service worker + Web App Manifest                      |
| Date handling | date-fns                                                      |
| Deployment    | Vercel (unhookd.health)                                       |

The app is **offline-first** — all data lives in `localStorage` by default. Firebase is an optional sync layer: if credentials are configured, data mirrors to Firestore automatically. If not, everything still works.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project (for cloud sync and push notifications — optional)

### Installation

```bash
git clone https://github.com/lukabudik/unhookd.git
cd unhookd
npm install
```

### Environment Variables

Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key
```

The app works without these — data stays in your browser's localStorage.

### Firebase Setup (optional)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Anonymous Authentication**
3. Create a **Firestore database** in production mode with these security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Generate a Web Push certificate under **Cloud Messaging → Web Push certificates** for the VAPID key

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Home screen
│   ├── history/          # History from plan start with day drill-down
│   ├── insights/         # Analytics, trends, supplement suggestions
│   ├── plan/             # Guided plan wizard + overview + hold mode
│   ├── install/          # PWA install instructions (platform-aware)
│   ├── privacy/          # Privacy policy & disclaimer
│   └── settings/         # Notifications, recovery code, export, reset
├── components/
│   ├── TaperProgress.tsx          # SVG arc progress ring
│   ├── DoseLogger.tsx             # Full-featured dose form
│   ├── QuickLogSheet.tsx          # 2-tap bottom sheet logger
│   ├── CravingModal.tsx           # Breathing + SOS modal
│   ├── DailyCheckIn.tsx           # Mood, symptoms, movement
│   ├── PhaseGuidanceCard.tsx      # Phase-aware guidance
│   └── SymptomSuggestionsCard.tsx # Supplement suggestions
├── hooks/
│   ├── useFirestore.ts    # Firebase + localStorage data layer
│   └── useNotifications.ts
└── lib/
    ├── store.ts       # Zustand global state
    ├── utils.ts       # Taper calculations, date utilities, plan generation
    ├── phases.ts      # Phase detection + supplement scoring engine
    └── milestones.ts  # Milestone definitions and checks
```

---

## Data & Privacy

**On-device first.** All logs are stored in your browser's `localStorage`. No name, email address, or personally identifying information is ever collected. The app assigns a random recovery code and knows nothing else about you.

**Cloud backup.** When Firebase is configured, your data syncs to Firestore under your anonymous recovery code. Only you hold that code — without it, nobody (including us) can access your data. Each user's Firestore data is isolated by their anonymous UID via security rules.

**Your exports, your control.** Download all your data as JSON at any time from Settings, and wipe everything with a single tap.

---

## Feedback

Using Unhookd? We'd love to hear what's working and what's not.

**[→ Share feedback (anonymous, 2 minutes)](https://tally.so/r/aQj1BZ)**

---

## A Note on Supplement Guidance

The supplement suggestions in this app are based on community experience and general nutritional science. They are **not medical advice**. Kratom withdrawal is real but rarely dangerous — however, for high-dose or long-term use, medical supervision is appropriate. Prescription options like clonidine (autonomic symptoms) and hydroxyzine (sleep/anxiety) are effective and underused; worth asking a doctor about.

---

## License

MIT — use it, fork it, make it yours.

---

_Built with [Claude Code](https://claude.ai/code)._
