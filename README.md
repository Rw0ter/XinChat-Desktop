# XinChat

Electron + Vite + Vue desktop chat app with a local Node/Express backend.

❤love from DGITC (Dongguan Information Technology college)❤.

## Overview

- Desktop UI: Electron + Vue 3
- Local backend: Express + WebSocket
- Local storage: JSON for users, SQLite (sql.js) for chat history

## Features

- Login and local user profiles
- Friend list, friend requests, presence
- 1:1 chat with WebSocket updates
- Profile editor with avatar upload and crop

## Repository Structure

- `src/electron/`: Electron main process and preload
- `src/renderer/`: Vite renderer entry points
  - `index.html`: main app
  - `login.html`: login/register page
  - `vue/`: Vue app source
- `backend/`: Express server (auth, friends, chat, ws)
- `configs/vite/`: Vite configs for dev/prod
- `scripts/`: local dev bootstrap

## Requirements

- Node.js 18+ recommended

## Development

1. Install deps:
   ```bash
   npm install
   ```
2. Start backend (port 3001 by default):
   ```bash
   npm run backend
   ```
3. Start Electron + Vite dev:
   ```bash
   npm run dev
   ```

The dev script uses `configs/vite/vite.config.dev.js`.

## Production

Build renderer + package:
```bash
npm run build
```

Start packaged app:
```bash
npm run start
```

The build uses `configs/vite/vite.config.prod.js`.

## Configuration

- API base URL is set in `src/renderer/vue/utils/api.js`.
- Backend default port is `3001` (see `backend/index.js`).

## Backend Notes

The backend is a local service intended to run on the same machine as the app.
It exposes REST endpoints under `/api` and a WebSocket at `/ws`.

## License

ISC (see `LICENSE`).
