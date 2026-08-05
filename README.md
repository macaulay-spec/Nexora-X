# Nexora-X / Midnight Vote Multiplayer MVP

A mobile-first realtime PWA MVP for **Midnight Vote**, an original fictional social deduction party game.

## What is included

- Dark cinematic mobile UI
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

## How to test alone

1. Create a room.
2. Tap **Add Demo Player** until there are at least 4 players.
3. Tap **Ready Up**.
4. Tap **Start Game**.
5. Use Host controls to skip phases quickly while testing.

## Product docs

- Full scope and plan: `docs/product/midnight-vote-scope-plan.md`
- UI mockup contact sheet: `docs/product/ui-mockups/00-full-screen-deck-contact-sheet.png`
- Individual generated UI screens: `docs/product/ui-mockups/`

## Safety note

This is a fictional party game MVP only. It does not implement device locking, coercion, tracking without consent, real threats, or harmful mechanics.
