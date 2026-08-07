# Nexora-X / Midnight Vote Multiplayer MVP

A mobile-first full-stack realtime PWA MVP for **Midnight Vote**, an original fictional social deduction party game.

## What is included

- Reference-style Incoming Transmission landing flow
- Identify / Re-enter account experience
- Headquarters dashboard experience
- Cinematic animated onboarding experience
- Functional create-account and login flow
- In-memory account/session backend
- Admin account support and functional Control Room panel
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

## How to test the full-stack app

1. Open the app. You can also visit `/headquarters` or `/auth` directly.
2. Begin the Incoming Transmission.
3. Create an account. The first account automatically becomes admin; `admin@midnight.vote` is also treated as an admin demo account.
4. Enter Headquarters.
5. Create a room.
6. Add demo bot players until there are at least 4 players.
7. Ready up and start the game.
8. Play through role reveal, day discussion, voting, night actions, results, and game over.
9. Open the Control Room/Admin Panel from Headquarters when signed in as admin to view users, rooms, room status, and end active rooms.

## Full-stack MVP note

The current backend uses in-memory users, sessions, rooms, and matches. That is enough for the playable MVP and live preview. For production, the next step is replacing in-memory stores with PostgreSQL/Supabase plus Redis for realtime room state and timers.

## Product docs

- Full scope and plan: `docs/product/midnight-vote-scope-plan.md`
- UI mockup contact sheet: `docs/product/ui-mockups/00-full-screen-deck-contact-sheet.png`
- Individual generated UI screens: `docs/product/ui-mockups/`

## Safety note

This is a fictional party game MVP only. It does not implement device locking, coercion, tracking without consent, real threats, or harmful mechanics.
