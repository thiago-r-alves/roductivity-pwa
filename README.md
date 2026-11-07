# Momentum — Personal Productivity PWA

A dark, responsive, local-first productivity workspace built with React, TypeScript and Vite.

## Features

- Dashboard with task totals and completion overview
- Create and complete tasks with due dates and priority
- Create and check daily habits
- Calendar view for tasks with due dates
- Activity history and task archive
- Search tasks
- Export and restore a JSON backup
- IndexedDB persistence in the current browser

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

No account or authentication is required. Tasks, habits and history are stored in IndexedDB in the current browser profile. Export a backup before clearing browser data or moving to another device. Automatic cross-device synchronization is not implemented.

## PWA

The project includes a web app manifest and a service worker for caching the application shell. This is a client-side app; it does not provide server-backed push notifications or cloud synchronization.
