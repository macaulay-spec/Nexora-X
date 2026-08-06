# Nexora-X / Midnight Vote Multiplayer MVP

A mobile-first frontend preview and realtime PWA MVP for **Midnight Vote**, an original fictional social deduction party game.

## What is included

- Full dark cinematic frontend preview with 28 app screens
- Desktop design workbench with screen navigator
- Mobile preview with an All Screens map and mini previews
- Socket.io realtime rooms on the same origin as the app
- Guest sessions with reconnect support by local session ID
- Create/join room with shareable room code
- Waiting lobby with ready states
- Demo bot players for solo testing
- Server-side role assignment
- Server-controlled phase timers
- Day discussion chat
- Anonymous voting and vote resolution
- Mafia night target action and private Mafia chat
- Detective investigation action
- Doctor protection action
- Automatic night resolution
- Win/loss checks for Mafia and Citizens
- Host controls to skip phases or end a match
- PWA manifest and icon
- Generated UI/UX mockups and full product scope docs

## Run locally

```bash
npm install
npm run dev
```

Open the Vite/Express URL shown in the terminal.

## Production build

```bash
npm run build
npm run start
```

## Deployment notes

This repo includes `vercel.json` so Vercel builds the frontend as a **Vite** app instead of trying to detect Next.js.

For the full realtime Socket.io multiplayer server, deploy the Node server to a WebSocket-capable host such as Railway, Render, Fly.io, or a VPS. Vercel can serve the static frontend, but standard Vercel serverless deployments are not ideal for long-lived in-memory Socket.io game rooms.

### Option A — One WebSocket-capable host

Deploy this whole repo to Render/Railway/Fly and run:

```bash
npm run build
npm run start
```

The Node server serves both the built frontend and Socket.io backend on the same origin.

### Option B — Vercel frontend + separate backend

1. Deploy the backend to Render/Railway/Fly.
2. Set backend env:

```bash
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
```

3. Set Vercel env:

```bash
VITE_SOCKET_URL=https://your-backend-url.example.com
```

4. Redeploy Vercel.

See `.env.example` and `render.yaml`.

## How to preview the frontend

Run the app and use the left-side screen navigator on desktop, or tap **Map** on mobile. The preview includes every designed screen: splash, welcome, auth, home, room creation, lobby, room settings, role reveal, day discussion, player profile sheet, voting, vote result, night intro, Mafia action, Detective action, Doctor action, Citizen night, dead chat, night result, game over, host controls, match history, rules, profile, notifications, reconnect, and empty states.

## Realtime MVP note

The backend game engine is still included. This latest iteration focuses the visible app on the full UI/UX frontend preview, while the Socket.io server remains available for continuing the multiplayer implementation path.

## Product docs

- Full scope and plan: `docs/product/midnight-vote-scope-plan.md`
- UI mockup contact sheet: `docs/product/ui-mockups/00-full-screen-deck-contact-sheet.png`
- Individual generated UI screens: `docs/product/ui-mockups/`

## Safety note

This is a fictional party game MVP only. It does not implement device locking, coercion, tracking without consent, real threats, or harmful mechanics.
