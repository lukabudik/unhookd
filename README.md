# Unhookd

**A personal taper companion for reducing kratom — warm, steady, one day at a time.**

> Built for the real experience of quitting: the cravings at 2am, the flat weeks after you hit zero, the days when staying on plan takes genuine effort.

---

## The Story

Kratom is easy to start and genuinely hard to stop. Unlike most substances, it hits both opioid and stimulant receptors — so withdrawal is exhausting *and* anxious at the same time. The physical peak passes in about a week. The psychological flatness can drag on for months. Most people relapse not during the hard part, but 4–6 weeks in, when life feels gray and they don't know why.

I built Unhookd because the tools that existed felt clinical — dose trackers, habit apps, generic step-count widgets. None of them understood the actual shape of what quitting kratom feels like. This one tries to.

It's a mobile-first PWA designed to be installed on your phone and used daily. Everything runs locally by default — no account, no server, just your data on your device. Firebase sync is optional for backup and cross-device recovery.

---

## Features

### Daily Tracking
- **Progress ring** — visual arc showing today's dose vs. your daily target
- **Quick-log bottom sheet** — log a dose in 2 taps from the home screen; preset amounts scale with your target
- **Full log page** — custom amounts, mood tracking, notes, and backdating for missed entries
- **Dose editing** — tap any logged dose to correct it; delete is there too

### Taper Plan
- **Linear taper calculator** — set your starting dose, goal, and timeline; the app calculates your daily target automatically
- **Hold mode** — pause the taper for 7 days when you need a breather, then resume smoothly from where you left off
- **Weekly schedule preview** — see exactly what each week of your taper looks like before you commit
- **Reasons field** — write down why you're doing this; it shows up inside the craving modal when you need it most

### Craving Support
- **Craving SOS** — guided breathing modal with animated orb, contextual message using your personal reasons and current streak
- **HALT check** — when you're about to log over your daily target, a non-judgmental prompt surfaces: Hungry, Anxious, Lonely, Tired?
- **Resistance tracking** — log when you rode out a craving; counts are tracked in Insights

### Daily Check-in
- **5-level mood scale** — quick emoji check-in each day
- **Symptom tracker** — log sleep quality, anxiety, restlessness, and GI symptoms with fine/mild/bad severity
- **Movement tracker** — simple yes/no for daily exercise (more effective for withdrawal than most people expect)
- **Free-text note** — 140 characters of whatever's on your mind

### Phase-Aware Guidance
- **Kratom-specific phase content** — 8 distinct phases from early taper through PAWS (post-acute withdrawal syndrome), each with copy written for that specific stage of recovery
- **Symptom-to-supplement engine** — reads your recent check-in data, scores 11 evidence-based supplements by symptom relevance, and surfaces the top 3 with dose guidance and plain-language explanations
- **Post-zero mode** — when you complete your taper, the home screen shifts to a days-clean counter with PAWS-specific guidance

### History & Insights
- **30-day history** — tap any day to drill into individual doses, edit or delete entries, or add a missed dose
- **7-day bar chart** — dose vs. target at a glance
- **Insights page** — week-over-week averages, mood breakdown, dose timing patterns, craving resistance, symptom trends, and movement days
- **Milestones** — streak, journey, and taper progress milestones with celebration modals

### PWA & Notifications
- **Installable PWA** — add to home screen on iOS (Safari) or Android (Chrome)
- **Daily reminders** — configurable reminder time via browser notification API
- **Firebase Cloud Messaging** — optional server-push notifications that work when the app is fully closed
- **Data export** — download everything as JSON from Settings
- **Full reset** — wipe all data with a confirmation modal

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| State | Zustand |
| Data | Firebase (Firestore + Anonymous Auth) + localStorage fallback |
| Notifications | Web Notification API + Firebase Cloud Messaging |
| PWA | Custom service worker + Web App Manifest |
| Date handling | date-fns |
| Deployment | Vercel |

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

> **Note:** Use `npm run dev`, not `pnpm dev`. The project uses npm — pnpm will cause module resolution issues if you have other pnpm projects elsewhere on your machine.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Home screen
│   ├── log/              # Full dose logger
│   ├── history/          # 30-day history with day drill-down
│   ├── insights/         # Analytics and trends
│   ├── plan/             # Taper plan setup and hold mode
│   └── settings/         # Notifications, export, reset
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
    ├── utils.ts       # Taper calculations, date utilities
    ├── phases.ts      # Phase detection + supplement scoring engine
    └── milestones.ts  # Milestone definitions and checks
```

---

## Data & Privacy

Your data is yours. By default:

- Everything is stored in your browser's `localStorage`
- Nothing is sent to any server
- No analytics, no tracking, no account required

If you configure Firebase, data syncs to your own Firestore database under anonymous auth. Each user's data is isolated by their UID via Firestore security rules.

You can export all your data as JSON at any time from Settings.

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Add your Firebase env vars in the Vercel dashboard under **Settings → Environment Variables**, then redeploy. Done.

---

## A Note on Supplement Guidance

The supplement suggestions in this app are based on community experience and general nutritional science. They are **not medical advice**. Kratom withdrawal is real but rarely dangerous — however, for high-dose or long-term use, medical supervision is appropriate. Prescription options like clonidine (autonomic symptoms) and hydroxyzine (sleep/anxiety) are effective and underused; worth asking a doctor about.

---

## License

MIT — use it, fork it, make it yours.

---

*Built with [Claude Code](https://claude.ai/code).*
