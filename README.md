# Momentum — Personal Productivity PWA

A local-first personal productivity workspace built with React, TypeScript, Vite, Tailwind CSS, IndexedDB, Recharts and Lucide.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

Import this repository in Vercel. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.

## Data and privacy

No account or authentication is required. Tasks, habits, logs, settings and history are stored in IndexedDB in the current browser profile. Export a JSON backup in Settings before clearing browser data or moving to another device. No automatic cross-device synchronization is implemented.

## PWA and notifications

The web app manifest and service worker cache the application shell and static assets for offline startup. Browser notification permission can be requested in Settings. This client-only implementation does not provide guaranteed scheduled notifications while the browser is fully closed; reliable closed-app push requires a server-side Web Push service and VAPID credentials.

## Current scope

The app includes dashboard, task list and board views, habit tracking, calendar, statistics, activity history, archive, search, CSV/JSON backup and restore, browser permission testing, responsive navigation and offline shell caching. Advanced recurrence generation, full reminder scheduling, notification inbox/snooze, category CRUD, full streak semantics for weekly-target habits, and exhaustive automated acceptance tests remain future work.
