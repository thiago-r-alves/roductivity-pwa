# Momentum — Personal Productivity PWA

A full local-first productivity workspace built with React, TypeScript and Vite.

## Features

- Dashboard with task overview and progress metrics
- Task management with priority, status, due dates and archive
- Kanban board and list view
- Habit tracking, daily check-ins and streak calculations
- Calendar with task and habit activity
- Statistics charts and completion trends
- Activity history, search and filters
- JSON backup/restore and CSV export
- IndexedDB persistence, responsive layout and PWA offline shell
- Browser notification permission controls (scheduled notifications while the app is fully closed are not guaranteed)

## Full source restoration

The complete original app and stylesheet are included as gzip files at `src/App.tsx.gz` and `src/style.css.gz`. The npm lifecycle automatically restores them before running Vite:

```bash
npm install
npm run dev
npm run build
```

You do not need to unpack these files manually. If editing the restored source, note that the next `npm run dev` or `npm run build` restores the committed compressed originals again.

## Data and privacy

No account or backend is required. Data is stored in IndexedDB in the current browser profile. Use the JSON backup before clearing browser data or moving to another device. Cross-device synchronization is not implemented.

## Deploy to Vercel

Import this repository. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.

## Current scope notes

Advanced recurrence generation, persistent scheduled push notifications, notification inbox/snooze, cross-device sync, and full automated acceptance coverage remain future work.
