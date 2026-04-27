# Contributing to Unhookd

Thanks for your interest. This is a personal project that others are welcome to build on.

## Getting started

```bash
git clone https://github.com/lukabudik/unhookd.git
cd unhookd
npm install
cp .env.local.example .env.local   # fill in your Firebase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Before you submit a PR

```bash
npm run typecheck   # must pass
npm run lint        # must pass
npm run build       # must succeed
```

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org). Every commit message must follow the format:

```
<type>: <subject>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

Examples:

```
feat: add dose spacing warning in quick-log sheet
fix: phase guidance card not dismissing on iOS
chore: update lucide-react to v2
```

The commit-msg hook enforces this automatically. If your commit is rejected, check the format.

## Stack notes

- **Next.js 16** (App Router) — read the docs in `node_modules/next/dist/docs/` if something behaves unexpectedly
- **Tailwind v4** — CSS-first config, `@import "tailwindcss"` in globals.css
- **Firebase** — anonymous auth + Firestore. Always maintain the localStorage fallback path in `useFirestore.ts`
- **Icons** — Lucide React only, no emojis in UI
- **Mobile-first** — test on real mobile before opening a PR

## Data layer rule

The `useFirestore` hook maintains a dual-path pattern: Firebase first, localStorage fallback. Any change to data operations must preserve this — the app must work fully offline.
