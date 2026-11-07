# Momentum — Personal Productivity PWA

A responsive, local-first productivity workspace built with React, TypeScript and Vite.

## Features

- Dashboard with workload summary, completion rate, overdue tasks and today's habit check-ins
- Task creation and editing with category, priority, due date/time and status
- List and Kanban board views, status/priority filters, search, archive and permanent deletion
- Habit creation with daily, weekdays, weekly-target and goal schedules, check-ins and streaks
- Monthly calendar with due-date tasks and upcoming list
- Statistics with weekly task/habit activity and task category chart
- Activity history
- JSON backup and restore, CSV export
- IndexedDB local persistence, responsive UI and PWA manifest/service worker
- Browser notification permission request; scheduled notifications while the browser is fully closed are not guaranteed

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

Framework: Vite. Build command: `npm run build`. Output directory: `dist`.

## Data and privacy

No account or backend is required. Tasks, habits, logs and settings are stored in IndexedDB in the current browser profile. Export a JSON backup before clearing browser data or moving devices. Cross-device sync is not implemented.

Original source snapshots remain in `src/App.tsx.gz` and `src/style.css.gz` as archival copies. The build uses readable TypeScript and CSS files in `src/`.
