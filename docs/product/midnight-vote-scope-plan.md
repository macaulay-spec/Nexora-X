# Midnight Vote — Full App Scope, Build Plan, and UI/UX Prompt Pack

> Working title: **Midnight Vote**  
> Genre: real-time mobile social deduction / party game  
> Inspiration level: dark cinematic “school mystery / night vote” energy, but with original branding, original rules, and safe fictional gameplay.

---

## 1. Product Vision

**Midnight Vote** is a real-time multiplayer social deduction app where players join private rooms, receive secret roles, discuss during the day, perform hidden actions at night, vote, survive, deceive, investigate, and win as a team.

The app should feel like a tense phone-based mystery game: countdowns, secret role cards, dramatic announcements, voting pressure, and night actions. It must remain a **fictional party game** only — no device locking, coercion, stalking, real-world threats, or harmful mechanics.

---

## 2. MVP Goal

Build a playable mobile-first web app / PWA where 6–12 players can:

1. Create or join a room.
2. Ready up in a lobby.
3. Receive secret roles.
4. Play through automated Day and Night phases.
5. Vote to eliminate suspected Mafia.
6. Use role-specific night actions.
7. See results and continue until a team wins.

---

## 3. Target Platforms

### Recommended first version
- **Mobile-first web app / PWA**
- Works instantly through a share link or room code.
- Can later be wrapped into React Native / Expo mobile apps.

### Later version
- iOS app
- Android app
- Push notifications
- Voice chat
- Ranked matchmaking

---

## 4. Target Users

- Friend groups playing together.
- School/university social groups.
- Online communities.
- Party game players.
- Streamers who want audience participation.

---

## 5. Core Game Loop

### Waiting Phase
- Host creates room.
- Players join by room code/link.
- Everyone chooses display name/avatar.
- Players mark themselves ready.
- Host starts game.

### Role Reveal Phase
- App privately reveals each player’s role.
- Players confirm they understand their objective.

### Day Phase
- All alive players discuss publicly.
- Timer counts down.
- Players can open voting panel.

### Voting Phase
- Alive players vote for one suspect.
- Voting can be anonymous or public depending on room settings.
- Most-voted player is eliminated.
- Ties follow room rule: no elimination, revote, or random among tied players.

### Night Phase
- Chat becomes restricted.
- Mafia privately choose a target.
- Doctor protects one player.
- Detective investigates one player.
- App resolves actions automatically.

### Result Phase
- App announces night result.
- Eliminated players become dead chat/spectators.
- Win conditions are checked.

### Game Over
- Winning team is announced.
- Final roles are revealed.
- Stats are shown.
- Players can replay or return to lobby.

---

## 6. Roles for MVP

### Mafia
- Knows other Mafia members.
- Has private Mafia chat.
- Chooses one target each night.
- Wins when Mafia count is equal to or greater than non-Mafia count.

### Citizen
- Has no night action.
- Uses discussion and voting to find Mafia.
- Wins when all Mafia are eliminated.

### Detective
- Investigates one player each night.
- Receives private result: Suspicious / Not Suspicious.
- Wins with Citizens.

### Doctor
- Protects one player each night.
- If Mafia attacks protected player, no death occurs.
- Optional rule: cannot protect same player two nights in a row.
- Wins with Citizens.

---

## 7. Future Roles

- **Mayor**: vote counts as 2 after reveal.
- **Jester**: wins if voted out.
- **Spy**: can see fragments of Mafia chat.
- **Bodyguard**: can sacrifice self to protect target.
- **Medium**: can receive one message from dead chat.
- **Silencer**: blocks one player from speaking next day.
- **Framer**: makes innocent player appear suspicious.

---

## 8. Room Settings

- Room name
- Room code
- Player limit: 6–20
- Role distribution
- Day timer
- Night timer
- Voting timer
- Anonymous votes on/off
- Reveal eliminated role on/off
- Allow spectators on/off
- Allow dead chat on/off
- Tie rule
- Host moderation controls

---

## 9. Screen Inventory

The first UI/UX deck includes 12 screens:

1. **Onboarding / Login** — username, room code, enter game, create room.
2. **Create Room Settings** — player limits, roles, timers, toggles.
3. **Lobby Room** — room code, ready statuses, invite, chat, start game.
4. **Role Reveal** — private role card with objective.
5. **Day Discussion** — timer, alive players, public chat, open vote.
6. **Voting Screen** — select suspect, confirm vote, anonymous vote display.
7. **Mafia Night Action** — Mafia target selection and private chat.
8. **Detective Investigation** — choose player and receive private alignment result.
9. **Doctor Protection** — choose player to protect.
10. **Night Result** — sunrise announcement and elimination report.
11. **Game Over** — winning team, final roles, stats, play again.
12. **Host Control Panel** — pause timer, skip phase, manage players, end game.

Generated UI files are in:

```text
docs/product/ui-mockups/
```

Main contact sheet:

```text
docs/product/ui-mockups/00-full-screen-deck-contact-sheet.png
```

---

## 10. UX Principles

- **Mobile-first**: every important action must be thumb-friendly.
- **Fast decisions**: voting and night actions should take one or two taps.
- **Private information clarity**: roles and results must be obvious to the intended player only.
- **Timer pressure**: countdowns create tension but should not be confusing.
- **Reconnect safe**: if a player refreshes, they return to the same game state.
- **No accidental votes**: every vote/action needs confirmation.
- **Spectator/dead separation**: dead players cannot affect live gameplay.
- **Host power transparency**: host actions should be logged.

---

## 11. Visual Direction

### Mood
- Cinematic
- Suspenseful
- Minimal
- Dark school mystery / midnight phone alert atmosphere

### Palette
- Background: black, near-black navy, charcoal
- Primary accent: crimson red
- Secondary accents: cold blue for detective, green for doctor
- Text: off-white, muted grey
- Cards: glassmorphism dark panels

### Typography
- Clean sans-serif
- Bold all-caps phase labels
- Large timer numerals
- Small status chips and role tags

### Motion Ideas
- Role card flip animation
- Timer pulse in final 10 seconds
- Red alert flash on result screen
- Smooth bottom-sheet vote confirmation
- Night-to-day background transition

---

## 12. Functional Requirements

### Authentication
MVP can use guest auth:
- Username
- Avatar
- Session ID stored locally

Later:
- Email login
- Social login
- Persistent profile
- Friends list

### Room Management
- Create room
- Join room code
- Leave room
- Host migration if host disconnects
- Player ready status
- Share invite link

### Real-Time Gameplay
- WebSocket connection
- Server-controlled game state
- Server-owned timers
- Phase transition broadcasts
- Reconnection handling
- Anti-duplicate vote/action handling

### Chat
- Lobby chat
- Day public chat
- Mafia private chat
- Dead chat
- System announcements
- Basic moderation/filtering

### Voting
- One vote per alive player
- Change vote before timer ends, if enabled
- Confirm final vote
- Handle abstain/no vote
- Tie handling

### Night Actions
- Mafia target
- Doctor protection
- Detective investigation
- Server-side action resolution
- Private results

### Win Conditions
Citizens win when all Mafia are eliminated.  
Mafia win when Mafia count is equal to or greater than Citizens-aligned players.

---

## 13. Suggested Tech Stack

### Frontend
- Next.js or React + Vite
- TypeScript
- Tailwind CSS
- Zustand or Redux Toolkit for client state
- Socket.io client
- PWA support

### Backend
- Node.js + NestJS or Express/Fastify
- Socket.io / WebSocket gateway
- Game engine service
- REST endpoints for room creation/history

### Database
- PostgreSQL
- Prisma ORM

### Cache / Real-time State
- Redis for timers, rooms, socket presence, rate limits

### Deployment
- Web: Vercel, Render, Railway, Fly.io, or AWS
- DB: Supabase, Neon, Railway Postgres
- Redis: Upstash or Railway Redis

---

## 14. High-Level Data Model

### UserSession
- id
- displayName
- avatar
- createdAt

### Room
- id
- code
- hostPlayerId
- status: waiting / active / finished
- settings
- createdAt

### Player
- id
- roomId
- sessionId
- displayName
- avatar
- role
- team
- alive
- ready
- connected

### Game
- id
- roomId
- phase
- dayNumber
- timerEndsAt
- winner

### Vote
- id
- gameId
- roundNumber
- voterPlayerId
- targetPlayerId

### NightAction
- id
- gameId
- nightNumber
- actorPlayerId
- actionType
- targetPlayerId

### ChatMessage
- id
- roomId
- channel
- senderPlayerId
- body
- createdAt

---

## 15. Game State Machine

```text
WAITING
  -> ROLE_REVEAL
  -> DAY_DISCUSSION
  -> VOTING
  -> VOTE_RESULT
  -> NIGHT_ACTIONS
  -> NIGHT_RESULT
  -> CHECK_WIN
      -> GAME_OVER
      -> DAY_DISCUSSION
```

Server must be the authority for:
- Role assignment
- Phase changes
- Timer deadlines
- Vote counts
- Night action resolution
- Win checking

---

## 16. Safety and Legal Boundaries

This app should not:
- Lock phones or prevent leaving.
- Send real threats.
- Track users without consent.
- Use copyrighted show names, logos, or exact UI.
- Encourage real-world harm.
- Display gore or real violence.

This app should clearly present itself as:
- A fictional party game.
- Voluntary to join and leave.
- Moderated when played online.

---

## 17. MVP Build Milestones

### Phase 1 — Product Foundation
- Confirm rules.
- Confirm screen list.
- Create UI design system.
- Create database schema.

### Phase 2 — Lobby and Rooms
- Guest login.
- Create room.
- Join room.
- Ready state.
- Basic lobby chat.

### Phase 3 — Game Engine
- Role assignment.
- Phase timers.
- Server-owned state machine.
- Reconnection support.

### Phase 4 — Voting and Results
- Day discussion.
- Voting screen.
- Vote resolution.
- Elimination handling.

### Phase 5 — Night Actions
- Mafia action.
- Doctor action.
- Detective action.
- Night result resolution.

### Phase 6 — Polish
- Animations.
- Sound effects.
- Better empty/loading/error states.
- PWA install support.
- Test with real users.

---

## 18. Copy-Paste Build Prompt for a Coding Agent

Use this prompt to start implementation:

```text
Build a mobile-first real-time multiplayer social deduction PWA called Midnight Vote. It is a fictional party game with dark cinematic UI, not connected to any copyrighted show. Players can create or join private rooms with a room code, ready up in a lobby, receive secret roles, discuss during day phases, vote to eliminate suspects, perform night actions, and continue until Mafia or Citizens win.

Tech stack: Next.js, TypeScript, Tailwind CSS, Node/Socket.io server, PostgreSQL with Prisma, Redis for realtime room state and timers if available. Start with guest sessions only.

MVP roles: Mafia, Citizen, Detective, Doctor. Server must control role assignment, timers, phase changes, voting, night action resolution, and win checks. Support reconnecting to current room/game state. Include lobby chat, day public chat, Mafia private chat, and dead chat.

Implement screens: onboarding/login, create room settings, lobby, role reveal, day discussion, voting, Mafia night action, Detective investigation, Doctor protection, night result, game over, and host control panel.

Design direction: black/navy background, crimson primary accent, glassmorphism cards, large countdown timers, role reveal cards, bottom-sheet confirmations, dramatic but safe fictional notification copy. Do not implement device locking, coercive mechanics, real threats, stalking, or gore.
```

---

## 19. UI Image Generation Prompt Pack

These are the prompts used or recommended for the UI deck.

### Master Style Prompt

```text
Mobile app UI screenshot, 390x844 portrait, dark cinematic original social deduction party game app called “Midnight Vote”. Black and deep navy gradient background, crimson red accents, glassmorphism cards, clean premium Figma-style typography, tense mystery atmosphere, fictional game only, no gore, no copyrighted show branding, no real celebrity faces.
```

### Screen Prompts

1. **Onboarding/Login**  
Mobile onboarding/login screen with logo, headline “When night falls, choose wisely,” guest username field, room code field, Enter Game button, Create Room button, and safety copy “A fictional party game.”

2. **Create Room Settings**  
Create room screen with room name, player limit, role chips for Mafia, Detective, Doctor, Citizens, phase timer sliders, toggles for Anonymous Votes, Reveal Roles, Allow Spectators, and Generate Room Code CTA.

3. **Lobby Room**  
Waiting lobby with room code, copy icon, player list, ready/not-ready chips, host badge, chat preview, Share Invite button, and Start Game CTA.

4. **Role Reveal**  
Secret role reveal with crimson glowing role card, masked icon, “YOUR ROLE: MAFIA,” objective text, Mafia team info, countdown, and I Understand button.

5. **Day Discussion**  
Day phase screen with “DAY 1,” countdown timer, public chat feed, alive player grid, suspicion meters, and Open Vote button.

6. **Voting Screen**  
Voting screen with timer, instruction, alive player list, selected player highlighted, anonymous vote indicators, and bottom confirmation sheet.

7. **Mafia Night Action**  
Night phase for Mafia with target list, private Mafia chat tab, selected target highlighted red, and Lock Target button.

8. **Detective Investigation**  
Detective action screen with blue accent, player cards, selected investigation target, result placeholder, and Investigate button.

9. **Doctor Protection**  
Doctor action screen with green shield accent, player list, selected protected player, protection rule note, and Confirm Protection button.

10. **Night Result**  
Sunrise report screen with dramatic announcement card, eliminated player card, role hidden/revealed setting, event timeline, and Continue to Day 2 button.

11. **Game Over**  
Game over screen with “MAFIA WINS,” final roles revealed, MVP card, match stats, Play Again button, and Back to Lobby button.

12. **Host Control Panel**  
Host controls screen with current phase timer, Pause Timer, Skip Phase, Manage Players, End Game, inactive player modal, and activity log.
```
