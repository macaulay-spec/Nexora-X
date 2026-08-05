import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 5173);
const clientOrigin = process.env.CLIENT_ORIGIN || true;

const PHASES = {
  WAITING: 'waiting',
  ROLE_REVEAL: 'roleReveal',
  DAY_DISCUSSION: 'dayDiscussion',
  VOTING: 'voting',
  VOTE_RESULT: 'voteResult',
  NIGHT_ACTIONS: 'nightActions',
  NIGHT_RESULT: 'nightResult',
  GAME_OVER: 'gameOver',
};

const DEFAULT_SETTINGS = {
  maxPlayers: 12,
  roleRevealSeconds: 12,
  daySeconds: 90,
  votingSeconds: 45,
  voteResultSeconds: 8,
  nightSeconds: 60,
  nightResultSeconds: 10,
  anonymousVotes: true,
  revealEliminatedRoles: false,
  allowSpectators: true,
  tieRule: 'no_elimination',
};

const botNames = ['Hana', 'Minseo', 'Jisoo', 'Dae', 'Yuri', 'Jun', 'Sora', 'Mina', 'Taeyang', 'Nari', 'Eun', 'Rin'];
const colors = ['#c4123d', '#8b1731', '#37456d', '#315f4d', '#2b5d90', '#5a4469', '#6d4c34', '#494e62', '#7b354b', '#3f6b72'];
const rooms = new Map();

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function sanitizeSettings(settings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    maxPlayers: clampNumber(settings.maxPlayers, DEFAULT_SETTINGS.maxPlayers, 4, 20),
    roleRevealSeconds: clampNumber(settings.roleRevealSeconds, DEFAULT_SETTINGS.roleRevealSeconds, 5, 45),
    daySeconds: clampNumber(settings.daySeconds, DEFAULT_SETTINGS.daySeconds, 30, 300),
    votingSeconds: clampNumber(settings.votingSeconds, DEFAULT_SETTINGS.votingSeconds, 20, 120),
    voteResultSeconds: clampNumber(settings.voteResultSeconds, DEFAULT_SETTINGS.voteResultSeconds, 5, 30),
    nightSeconds: clampNumber(settings.nightSeconds, DEFAULT_SETTINGS.nightSeconds, 30, 180),
    nightResultSeconds: clampNumber(settings.nightResultSeconds, DEFAULT_SETTINGS.nightResultSeconds, 5, 30),
    anonymousVotes: settings.anonymousVotes === undefined ? DEFAULT_SETTINGS.anonymousVotes : Boolean(settings.anonymousVotes),
    revealEliminatedRoles: settings.revealEliminatedRoles === undefined ? DEFAULT_SETTINGS.revealEliminatedRoles : Boolean(settings.revealEliminatedRoles),
    allowSpectators: settings.allowSpectators === undefined ? DEFAULT_SETTINGS.allowSpectators : Boolean(settings.allowSpectators),
    tieRule: ['no_elimination', 'random'].includes(settings.tieRule) ? settings.tieRule : DEFAULT_SETTINGS.tieRule,
  };
}

function makeRoomCode() {
  let code = '';
  do {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function now() {
  return Date.now();
}

function makePlayer({ sessionId, name, host = false, bot = false }) {
  const id = sessionId || `bot-${randomUUID()}`;
  return {
    id,
    socketId: null,
    name: cleanName(name) || (bot ? nextBotName() : 'Guest'),
    color: colors[Math.floor(Math.random() * colors.length)],
    host,
    bot,
    ready: bot,
    connected: bot,
    role: null,
    team: null,
    alive: true,
    joinedAt: now(),
  };
}

function cleanName(value) {
  return String(value || '').trim().slice(0, 24);
}

function nextBotName(room) {
  if (!room) return botNames[Math.floor(Math.random() * botNames.length)];
  const taken = new Set([...room.players.values()].map((player) => player.name));
  return botNames.find((name) => !taken.has(name)) || `Player ${room.players.size + 1}`;
}

function systemMessage(room, body) {
  room.messages.push({
    id: randomUUID(),
    channel: 'system',
    senderId: 'system',
    senderName: 'System',
    body,
    createdAt: now(),
  });
  trimMessages(room);
}

function trimMessages(room) {
  if (room.messages.length > 160) room.messages.splice(0, room.messages.length - 160);
}

function findRoomForPlayer(playerId) {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) return room;
  }
  return null;
}

function getLivePlayers(room) {
  return [...room.players.values()].filter((player) => player.alive);
}

function getMafia(room) {
  return [...room.players.values()].filter((player) => player.alive && player.role === 'Mafia');
}

function getCitizens(room) {
  return [...room.players.values()].filter((player) => player.alive && player.role !== 'Mafia');
}

function isHost(room, playerId) {
  const player = room.players.get(playerId);
  return Boolean(player?.host);
}

function assignRoles(room) {
  const players = [...room.players.values()];
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const mafiaCount = Math.max(1, Math.floor(players.length / 4));
  const roles = [];

  for (let index = 0; index < mafiaCount; index += 1) roles.push('Mafia');
  if (players.length >= 5) roles.push('Detective');
  if (players.length >= 6) roles.push('Doctor');
  while (roles.length < players.length) roles.push('Citizen');

  shuffled.forEach((player, index) => {
    player.role = roles[index];
    player.team = roles[index] === 'Mafia' ? 'Mafia' : 'Citizens';
    player.alive = true;
    player.ready = false;
  });
}

function createGame() {
  return {
    phase: PHASES.ROLE_REVEAL,
    day: 1,
    phaseEndsAt: null,
    winner: null,
    lastResult: null,
    votes: {},
    nightActions: {
      mafiaVotes: {},
      doctor: {},
      detective: {},
      detectiveResults: {},
    },
  };
}

function clearPhaseTimer(room) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);
  room.phaseTimer = null;
}

function setPhase(room, phase, durationSeconds = 0) {
  clearPhaseTimer(room);
  if (!room.game) return;

  room.game.phase = phase;
  room.game.phaseEndsAt = durationSeconds > 0 ? now() + durationSeconds * 1000 : null;

  if (phase === PHASES.VOTING) {
    room.game.votes = {};
    systemMessage(room, `Voting has opened for Day ${room.game.day}.`);
  }

  if (phase === PHASES.NIGHT_ACTIONS) {
    room.game.nightActions = {
      mafiaVotes: {},
      doctor: {},
      detective: {},
      detectiveResults: {},
    };
    systemMessage(room, `Night ${room.game.day} has begun. Night actions are open.`);
  }

  emitRoom(room);

  if (durationSeconds > 0) {
    room.phaseTimer = setTimeout(() => advancePhase(room), durationSeconds * 1000 + 150);
  }
}

function advancePhase(room) {
  if (!room.game || room.game.phase === PHASES.GAME_OVER) return;
  const phase = room.game.phase;

  if (phase === PHASES.ROLE_REVEAL) {
    return setPhase(room, PHASES.DAY_DISCUSSION, room.settings.daySeconds);
  }
  if (phase === PHASES.DAY_DISCUSSION) {
    return setPhase(room, PHASES.VOTING, room.settings.votingSeconds);
  }
  if (phase === PHASES.VOTING) {
    resolveVotes(room);
    return setPhase(room, PHASES.VOTE_RESULT, room.settings.voteResultSeconds);
  }
  if (phase === PHASES.VOTE_RESULT) {
    if (checkWin(room)) return;
    return setPhase(room, PHASES.NIGHT_ACTIONS, room.settings.nightSeconds);
  }
  if (phase === PHASES.NIGHT_ACTIONS) {
    resolveNight(room);
    return setPhase(room, PHASES.NIGHT_RESULT, room.settings.nightResultSeconds);
  }
  if (phase === PHASES.NIGHT_RESULT) {
    if (checkWin(room)) return;
    room.game.day += 1;
    return setPhase(room, PHASES.DAY_DISCUSSION, room.settings.daySeconds);
  }
}

function resolveVotes(room) {
  const game = room.game;
  if (!game) return;
  const alive = getLivePlayers(room);

  // Bot and disconnected fallback voting keeps the MVP playable in a demo room.
  alive.forEach((voter) => {
    if (game.votes[voter.id]) return;
    if (!voter.bot && voter.connected) return;
    const candidates = alive.filter((player) => player.id !== voter.id);
    if (candidates.length) game.votes[voter.id] = candidates[Math.floor(Math.random() * candidates.length)].id;
  });

  const tally = new Map();
  Object.values(game.votes).forEach((targetId) => tally.set(targetId, (tally.get(targetId) || 0) + 1));
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  let eliminated = null;
  let tied = false;

  if (sorted.length > 0) {
    tied = sorted.length > 1 && sorted[0][1] === sorted[1][1];
    if (!tied || room.settings.tieRule !== 'no_elimination') {
      const targetId = tied ? sorted[Math.floor(Math.random() * sorted.filter((entry) => entry[1] === sorted[0][1]).length)][0] : sorted[0][0];
      eliminated = room.players.get(targetId) || null;
      if (eliminated) eliminated.alive = false;
    }
  }

  game.lastResult = {
    type: 'vote',
    day: game.day,
    eliminatedId: eliminated?.id || null,
    eliminatedName: eliminated?.name || null,
    eliminatedRole: eliminated?.role || null,
    tied,
    summary: eliminated
      ? `${eliminated.name} was eliminated by vote.`
      : tied
        ? 'The vote ended in a tie. No one was eliminated.'
        : 'No valid votes were cast. No one was eliminated.',
    votesCast: Object.keys(game.votes).length,
  };
  systemMessage(room, game.lastResult.summary);
}

function mostVotedTarget(votes) {
  const tally = new Map();
  Object.values(votes).forEach((targetId) => tally.set(targetId, (tally.get(targetId) || 0) + 1));
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}

function resolveNight(room) {
  const game = room.game;
  if (!game) return;
  const alive = getLivePlayers(room);
  const mafia = getMafia(room);
  const nonMafia = alive.filter((player) => player.role !== 'Mafia');

  mafia.forEach((player) => {
    if (game.nightActions.mafiaVotes[player.id]) return;
    const target = nonMafia[Math.floor(Math.random() * nonMafia.length)];
    if (target) game.nightActions.mafiaVotes[player.id] = target.id;
  });

  alive.filter((player) => player.role === 'Doctor').forEach((doctor) => {
    if (game.nightActions.doctor[doctor.id]) return;
    const target = alive[Math.floor(Math.random() * alive.length)];
    if (target) game.nightActions.doctor[doctor.id] = target.id;
  });

  alive.filter((player) => player.role === 'Detective').forEach((detective) => {
    if (game.nightActions.detective[detective.id]) return;
    const target = alive.filter((player) => player.id !== detective.id)[Math.floor(Math.random() * Math.max(1, alive.length - 1))];
    if (target) game.nightActions.detective[detective.id] = target.id;
  });

  const targetId = mostVotedTarget(game.nightActions.mafiaVotes);
  const protectedIds = new Set(Object.values(game.nightActions.doctor));
  const target = targetId ? room.players.get(targetId) : null;
  let eliminated = null;
  let protectedPlayer = null;

  if (target && protectedIds.has(target.id)) {
    protectedPlayer = target;
  } else if (target) {
    target.alive = false;
    eliminated = target;
  }

  Object.entries(game.nightActions.detective).forEach(([detectiveId, investigatedId]) => {
    const investigated = room.players.get(investigatedId);
    if (!investigated) return;
    game.nightActions.detectiveResults[detectiveId] = {
      targetId: investigated.id,
      targetName: investigated.name,
      alignment: investigated.role === 'Mafia' ? 'Suspicious' : 'Not Suspicious',
    };
  });

  game.lastResult = {
    type: 'night',
    day: game.day,
    eliminatedId: eliminated?.id || null,
    eliminatedName: eliminated?.name || null,
    eliminatedRole: eliminated?.role || null,
    protectedId: protectedPlayer?.id || null,
    protectedName: protectedPlayer?.name || null,
    summary: eliminated
      ? `${eliminated.name} was eliminated during the night.`
      : protectedPlayer
        ? `${protectedPlayer.name} was attacked, but survived.`
        : 'The night ended quietly. No one was eliminated.',
  };
  systemMessage(room, game.lastResult.summary);
}

function checkWin(room) {
  const game = room.game;
  if (!game) return false;
  const mafia = getMafia(room).length;
  const citizens = getCitizens(room).length;
  let winner = null;

  if (mafia === 0) winner = 'Citizens';
  else if (mafia >= citizens) winner = 'Mafia';

  if (!winner) return false;
  clearPhaseTimer(room);
  game.phase = PHASES.GAME_OVER;
  game.phaseEndsAt = null;
  game.winner = winner;
  room.status = 'finished';
  systemMessage(room, `${winner} win the match.`);
  emitRoom(room);
  return true;
}

function publicState(room, viewerId) {
  const viewer = room.players.get(viewerId);
  const game = room.game;
  const viewerIsMafia = viewer?.role === 'Mafia';
  const gameOver = game?.phase === PHASES.GAME_OVER;
  const canSeeDeadRoles = gameOver || room.settings.revealEliminatedRoles;

  const visibleChannels = new Set(['system']);
  if (room.status === 'waiting') visibleChannels.add('lobby');
  if (game?.phase === PHASES.DAY_DISCUSSION || game?.phase === PHASES.VOTING) visibleChannels.add('day');
  if (viewerIsMafia) visibleChannels.add('mafia');
  if (viewer && !viewer.alive) visibleChannels.add('dead');

  const meAction = getMyAction(room, viewerId);

  return {
    room: {
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      settings: room.settings,
      createdAt: room.createdAt,
    },
    me: viewer
      ? {
          id: viewer.id,
          name: viewer.name,
          color: viewer.color,
          host: viewer.host,
          ready: viewer.ready,
          connected: viewer.connected,
          alive: viewer.alive,
          role: viewer.role,
          team: viewer.team,
          bot: viewer.bot,
        }
      : null,
    players: [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      host: player.host,
      bot: player.bot,
      ready: player.ready,
      connected: player.connected,
      alive: player.alive,
      role:
        gameOver || player.id === viewerId || (viewerIsMafia && player.role === 'Mafia') || (!player.alive && canSeeDeadRoles)
          ? player.role
          : null,
      team: gameOver || player.id === viewerId || (viewerIsMafia && player.role === 'Mafia') ? player.team : null,
    })),
    game: game
      ? {
          phase: game.phase,
          day: game.day,
          phaseEndsAt: game.phaseEndsAt,
          winner: game.winner,
          lastResult: game.lastResult,
          votesCast: Object.keys(game.votes).length,
          aliveCount: getLivePlayers(room).length,
          mafiaCount: gameOver ? getMafia(room).length : undefined,
          citizenCount: gameOver ? getCitizens(room).length : undefined,
          myVote: game.votes[viewerId] || null,
          myAction: meAction,
        }
      : null,
    messages: room.messages.filter((message) => visibleChannels.has(message.channel)).slice(-60),
  };
}

function getMyAction(room, viewerId) {
  const player = room.players.get(viewerId);
  const game = room.game;
  if (!player || !game) return null;
  if (player.role === 'Mafia') return { type: 'mafia', targetId: game.nightActions.mafiaVotes[player.id] || null };
  if (player.role === 'Doctor') return { type: 'doctor', targetId: game.nightActions.doctor[player.id] || null };
  if (player.role === 'Detective') {
    return {
      type: 'detective',
      targetId: game.nightActions.detective[player.id] || null,
      result: game.nightActions.detectiveResults[player.id] || null,
    };
  }
  return null;
}

function emitRoom(room) {
  for (const player of room.players.values()) {
    if (!player.socketId) continue;
    io.to(player.socketId).emit('room:update', publicState(room, player.id));
  }
}

function ackError(ack, message) {
  if (typeof ack === 'function') ack({ ok: false, error: message });
}

function ackOk(ack, payload = {}) {
  if (typeof ack === 'function') ack({ ok: true, ...payload });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: clientOrigin, credentials: true },
});

app.use((req, res, next) => {
  if (clientOrigin && clientOrigin !== true) {
    res.setHeader('Access-Control-Allow-Origin', clientOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

io.on('connection', (socket) => {
  const sessionId = String(socket.handshake.auth?.sessionId || randomUUID());
  socket.emit('session', { sessionId });

  socket.on('room:create', (payload = {}, ack) => {
    const code = makeRoomCode();
    const player = makePlayer({ sessionId, name: payload.name, host: true });
    player.socketId = socket.id;
    player.connected = true;

    const room = {
      code,
      hostId: player.id,
      status: 'waiting',
      settings: sanitizeSettings(payload.settings || {}),
      players: new Map([[player.id, player]]),
      messages: [],
      game: null,
      phaseTimer: null,
      createdAt: now(),
    };

    rooms.set(code, room);
    socket.join(code);
    systemMessage(room, `${player.name} created the room.`);
    ackOk(ack, { code, playerId: player.id });
    emitRoom(room);
  });

  socket.on('room:join', (payload = {}, ack) => {
    const code = String(payload.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return ackError(ack, 'Room not found. Check the code and try again.');

    let player = room.players.get(sessionId);
    if (!player) {
      if (room.players.size >= room.settings.maxPlayers) return ackError(ack, 'Room is full.');
      if (room.status !== 'waiting' && !room.settings.allowSpectators) return ackError(ack, 'This match is already in progress.');
      player = makePlayer({ sessionId, name: payload.name });
      if (room.status !== 'waiting') {
        player.alive = false;
        player.ready = false;
      }
      room.players.set(player.id, player);
      systemMessage(room, room.status === 'waiting' ? `${player.name} joined the room.` : `${player.name} joined as a spectator.`);
    }

    player.name = cleanName(payload.name) || player.name;
    player.socketId = socket.id;
    player.connected = true;
    socket.join(code);
    ackOk(ack, { code, playerId: player.id });
    emitRoom(room);
  });

  socket.on('player:ready', (payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room || room.status !== 'waiting') return ackError(ack, 'You are not in a waiting room.');
    const player = room.players.get(sessionId);
    player.ready = Boolean(payload.ready);
    ackOk(ack);
    emitRoom(room);
  });

  socket.on('room:updateSettings', (payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room || !isHost(room, sessionId)) return ackError(ack, 'Only the host can update room settings.');
    if (room.status !== 'waiting') return ackError(ack, 'Settings can only be changed before the game starts.');
    const nextSettings = sanitizeSettings({ ...room.settings, ...(payload.settings || {}) });
    if (nextSettings.maxPlayers < room.players.size) return ackError(ack, `Max players cannot be below the current player count (${room.players.size}).`);
    room.settings = nextSettings;
    systemMessage(room, 'Room settings were updated.');
    ackOk(ack);
    emitRoom(room);
  });

  socket.on('room:addBot', (_payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room || !isHost(room, sessionId)) return ackError(ack, 'Only the host can add demo players.');
    if (room.status !== 'waiting') return ackError(ack, 'Demo players can only be added before the game starts.');
    if (room.players.size >= room.settings.maxPlayers) return ackError(ack, 'Room is full.');
    const bot = makePlayer({ sessionId: `bot-${randomUUID()}`, name: nextBotName(room), bot: true });
    room.players.set(bot.id, bot);
    systemMessage(room, `${bot.name} joined as a demo player.`);
    ackOk(ack);
    emitRoom(room);
  });

  socket.on('game:start', (_payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room || !isHost(room, sessionId)) return ackError(ack, 'Only the host can start the game.');
    if (room.status !== 'waiting') return ackError(ack, 'Game has already started.');
    if (room.players.size < 4) return ackError(ack, 'At least 4 players are required. Add demo players to test solo.');
    assignRoles(room);
    room.status = 'active';
    room.game = createGame();
    systemMessage(room, 'Roles have been assigned. The match has started.');
    ackOk(ack);
    setPhase(room, PHASES.ROLE_REVEAL, room.settings.roleRevealSeconds);
  });

  socket.on('chat:send', (payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room) return ackError(ack, 'Join a room before chatting.');
    const player = room.players.get(sessionId);
    const body = String(payload.body || '').trim().slice(0, 240);
    if (!body) return ackError(ack, 'Message cannot be empty.');

    const requested = String(payload.channel || 'day');
    const channel = allowedChatChannel(room, player, requested);
    if (!channel) return ackError(ack, 'You cannot send to that chat right now.');

    room.messages.push({
      id: randomUUID(),
      channel,
      senderId: player.id,
      senderName: player.name,
      body,
      createdAt: now(),
    });
    trimMessages(room);
    ackOk(ack);
    emitRoom(room);
  });

  socket.on('vote:cast', (payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    const player = room?.players.get(sessionId);
    const game = room?.game;
    if (!room || !player || !game || game.phase !== PHASES.VOTING) return ackError(ack, 'Voting is not open.');
    if (!player.alive) return ackError(ack, 'Eliminated players cannot vote.');
    const target = room.players.get(String(payload.targetId));
    if (!target || !target.alive || target.id === player.id) return ackError(ack, 'Choose a valid living target.');
    game.votes[player.id] = target.id;
    ackOk(ack);
    emitRoom(room);
  });

  socket.on('night:action', (payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    const player = room?.players.get(sessionId);
    const game = room?.game;
    if (!room || !player || !game || game.phase !== PHASES.NIGHT_ACTIONS) return ackError(ack, 'Night actions are not open.');
    if (!player.alive) return ackError(ack, 'Eliminated players cannot act.');
    const target = room.players.get(String(payload.targetId));
    if (!target || !target.alive) return ackError(ack, 'Choose a valid living target.');

    if (player.role === 'Mafia') {
      if (target.role === 'Mafia') return ackError(ack, 'Mafia cannot target another Mafia member.');
      game.nightActions.mafiaVotes[player.id] = target.id;
    } else if (player.role === 'Doctor') {
      game.nightActions.doctor[player.id] = target.id;
    } else if (player.role === 'Detective') {
      if (target.id === player.id) return ackError(ack, 'Detectives cannot investigate themselves.');
      game.nightActions.detective[player.id] = target.id;
    } else {
      return ackError(ack, 'Your role has no night action.');
    }

    ackOk(ack);
    emitRoom(room);
  });

  socket.on('host:skipPhase', (_payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room || !isHost(room, sessionId)) return ackError(ack, 'Only the host can skip phases.');
    ackOk(ack);
    advancePhase(room);
  });

  socket.on('host:endGame', (_payload = {}, ack) => {
    const room = findRoomForPlayer(sessionId);
    if (!room || !isHost(room, sessionId) || !room.game) return ackError(ack, 'Only the host can end an active game.');
    clearPhaseTimer(room);
    room.status = 'finished';
    room.game.phase = PHASES.GAME_OVER;
    room.game.winner = 'Host Ended';
    systemMessage(room, 'The host ended the match.');
    ackOk(ack);
    emitRoom(room);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.players.get(sessionId);
      if (!player || player.socketId !== socket.id) continue;
      player.connected = false;
      player.socketId = null;
      systemMessage(room, `${player.name} disconnected.`);
      emitRoom(room);
    }
  });
});

function allowedChatChannel(room, player, requested) {
  if (!player) return null;
  if (room.status === 'waiting') return 'lobby';
  if (!player.alive) return 'dead';
  if (requested === 'mafia' && player.role === 'Mafia') return 'mafia';
  if (room.game?.phase === PHASES.DAY_DISCUSSION || room.game?.phase === PHASES.VOTING) return 'day';
  return null;
}

if (isProduction) {
  app.use(express.static(path.join(root, 'dist')));
  app.use((_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const vite = await createViteServer({
    root,
    server: {
      middlewareMode: true,
      allowedHosts: true,
      hmr: { server: httpServer },
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Midnight Vote server listening on http://0.0.0.0:${port}`);
});
