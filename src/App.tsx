import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

type Phase = 'roleReveal' | 'dayDiscussion' | 'voting' | 'voteResult' | 'nightActions' | 'nightResult' | 'gameOver';
type PlayerRole = 'Mafia' | 'Citizen' | 'Detective' | 'Doctor';
type Team = 'Mafia' | 'Citizens';

type RoomSettings = {
  maxPlayers: number;
  daySeconds: number;
  votingSeconds: number;
  nightSeconds: number;
  anonymousVotes: boolean;
  revealEliminatedRoles: boolean;
  allowSpectators: boolean;
};

type Player = {
  id: string;
  name: string;
  color: string;
  host: boolean;
  bot: boolean;
  ready: boolean;
  connected: boolean;
  alive: boolean;
  role: PlayerRole | null;
  team: Team | null;
};

type Message = {
  id: string;
  channel: 'lobby' | 'day' | 'mafia' | 'dead' | 'system';
  senderName: string;
  body: string;
  createdAt: number;
};

type LastResult = {
  type: 'vote' | 'night';
  day: number;
  eliminatedId?: string | null;
  eliminatedName?: string | null;
  eliminatedRole?: PlayerRole | null;
  protectedName?: string | null;
  summary: string;
  votesCast?: number;
  tied?: boolean;
};

type ServerState = {
  room: {
    code: string;
    status: 'waiting' | 'active' | 'finished';
    hostId: string;
    settings: RoomSettings;
    createdAt: number;
  };
  me: Player | null;
  players: Player[];
  game: null | {
    phase: Phase;
    day: number;
    phaseEndsAt: number | null;
    winner: string | null;
    lastResult: LastResult | null;
    votesCast: number;
    aliveCount: number;
    myVote: string | null;
    myAction: null | {
      type: 'mafia' | 'doctor' | 'detective';
      targetId: string | null;
      result?: { targetId: string; targetName: string; alignment: 'Suspicious' | 'Not Suspicious' } | null;
    };
  };
  messages: Message[];
};

type Ack = { ok: boolean; error?: string; code?: string; playerId?: string };

const SESSION_KEY = 'midnight-vote-session-id';
const NAME_KEY = 'midnight-vote-display-name';
const SETTINGS_KEY = 'midnight-vote-room-settings';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const defaultRoomSettings: RoomSettings = {
  maxPlayers: 12,
  daySeconds: 90,
  votingSeconds: 45,
  nightSeconds: 60,
  anonymousVotes: true,
  revealEliminatedRoles: false,
  allowSpectators: true,
};

function loadRoomSettings(): RoomSettings {
  try {
    return { ...defaultRoomSettings, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return defaultRoomSettings;
  }
}

let activeSocket: Socket | null = null;

function getSessionId() {
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function phaseLabel(phase?: Phase) {
  const labels: Record<Phase, string> = {
    roleReveal: 'Role Reveal',
    dayDiscussion: 'Day Discussion',
    voting: 'Vote Now',
    voteResult: 'Vote Result',
    nightActions: 'Night Actions',
    nightResult: 'Sunrise Report',
    gameOver: 'Game Over',
  };
  return phase ? labels[phase] : 'Lobby';
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<ServerState | null>(null);
  const [displayName, setDisplayName] = useState(() => window.localStorage.getItem(NAME_KEY) || 'Macaulay');
  const [roomCode, setRoomCode] = useState(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '');
  const [settings, setSettings] = useState<RoomSettings>(() => loadRoomSettings());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showHost, setShowHost] = useState(false);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const client = io(SOCKET_URL, { auth: { sessionId: getSessionId() } });
    activeSocket = client;
    setSocket(client);

    client.on('connect', () => setConnected(true));
    client.on('disconnect', () => setConnected(false));
    client.on('session', ({ sessionId }: { sessionId: string }) => window.localStorage.setItem(SESSION_KEY, sessionId));
    client.on('room:update', (payload: ServerState) => {
      setState(payload);
      setShowHost(false);
    });

    return () => {
      activeSocket = null;
      client.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(NAME_KEY, displayName);
  }, [displayName]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const secondsLeft = useMemo(() => {
    const endsAt = state?.game?.phaseEndsAt;
    if (!endsAt) return 0;
    return Math.max(0, Math.ceil((endsAt - clock) / 1000));
  }, [clock, state?.game?.phaseEndsAt]);

  const emitAck = (event: string, payload: Record<string, unknown> = {}): Promise<Ack> => {
    if (!socket) return Promise.resolve({ ok: false, error: 'Socket is not connected yet.' });
    setError('');
    return new Promise<Ack>((resolve) => {
      socket.emit(event, payload, (ack: Ack) => {
        if (!ack?.ok) setError(ack?.error || 'Something went wrong.');
        else if (event !== 'room:create' && event !== 'room:join') setNotice('Action confirmed.');
        resolve(ack);
      });
    });
  };

  const createRoom = async () => {
    const ack = await emitAck('room:create', { name: displayName, settings });
    if (ack.ok && ack.code) setRoomCode(ack.code);
  };

  const joinRoom = async () => {
    await emitAck('room:join', { code: roomCode.trim().toUpperCase(), name: displayName });
  };

  return (
    <main className="app-shell">
      <section className="prototype-info" aria-label="Prototype information">
        <div className="brand-row desktop-only">
          <Logo />
          <div>
            <p className="eyebrow">Realtime MVP</p>
            <h1>Midnight Vote</h1>
          </div>
        </div>
        <p className="desktop-copy">
          Multiplayer rooms, Socket.io live updates, server-side timers, role assignment, voting, night actions,
          chat, and win conditions are now active.
        </p>
        <div className="desktop-card">
          <span>Current mode</span>
          <strong>{state?.game ? phaseLabel(state.game.phase) : state?.room ? 'Waiting Lobby' : 'Create or join a room'}</strong>
        </div>
      </section>

      <section className="phone" aria-label="Midnight Vote mobile app">
        <div className="phone-glow" />
        <div className="screen">
          <StatusBar />
          <div className={`connection-pill ${connected ? 'online' : ''}`}>{connected ? 'Live' : 'Offline'}</div>
          {state?.me?.host && state.game && state.game.phase !== 'gameOver' && (
            <button className="screen-map-button" onClick={() => setShowHost(true)}>Host</button>
          )}

          {!state?.room && (
            <Onboarding
              displayName={displayName}
              setDisplayName={setDisplayName}
              roomCode={roomCode}
              setRoomCode={setRoomCode}
              onCreate={createRoom}
              onJoin={joinRoom}
              settings={settings}
              setSettings={setSettings}
            />
          )}

          {state?.room.status === 'waiting' && state.me && (
            <Lobby
              state={state}
              onReady={(ready) => emitAck('player:ready', { ready })}
              onAddBot={() => emitAck('room:addBot')}
              onStart={() => emitAck('game:start')}
              onUpdateSettings={(nextSettings) => emitAck('room:updateSettings', { settings: nextSettings })}
            />
          )}

          {state?.game && state.me && !showHost && (
            <GameScreens
              state={state}
              secondsLeft={secondsLeft}
              emitAck={emitAck}
            />
          )}

          {state?.game && state.me && showHost && (
            <HostControls
              state={state}
              secondsLeft={secondsLeft}
              onSkip={() => emitAck('host:skipPhase')}
              onEnd={() => emitAck('host:endGame')}
              onClose={() => setShowHost(false)}
            />
          )}

          {(error || notice) && (
            <div className={`toast ${error ? 'error' : ''}`} onAnimationEnd={() => { setError(''); setNotice(''); }}>
              {error || notice}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function GameScreens({
  state,
  secondsLeft,
  emitAck,
}: {
  state: ServerState;
  secondsLeft: number;
  emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack>;
}) {
  const phase = state.game?.phase;
  if (!state.game || !state.me) return null;

  if (phase === 'roleReveal') return <RoleReveal state={state} secondsLeft={secondsLeft} />;
  if (phase === 'dayDiscussion') return <DayDiscussion state={state} secondsLeft={secondsLeft} emitAck={emitAck} />;
  if (phase === 'voting') return <Voting state={state} secondsLeft={secondsLeft} emitAck={emitAck} />;
  if (phase === 'voteResult') return <ResultScreen state={state} secondsLeft={secondsLeft} title="Vote Result" />;
  if (phase === 'nightActions') return <NightActions state={state} secondsLeft={secondsLeft} emitAck={emitAck} />;
  if (phase === 'nightResult') return <ResultScreen state={state} secondsLeft={secondsLeft} title="Sunrise Report" />;
  return <GameOver state={state} />;
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span>21:09</span>
      <span>5G ▰▰</span>
    </div>
  );
}

function Logo() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <span>☾</span>
    </div>
  );
}

function PageHeader({ title, kicker, timer, right }: { title: string; kicker?: string; timer?: number; right?: string }) {
  return (
    <header className="page-header">
      <div>
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h2>{title}</h2>
      </div>
      {typeof timer === 'number' ? <div className="timer">{formatTime(timer)}</div> : right ? <div className="header-chip">{right}</div> : null}
    </header>
  );
}

function Onboarding({
  displayName,
  setDisplayName,
  roomCode,
  setRoomCode,
  onCreate,
  onJoin,
  settings,
  setSettings,
}: {
  displayName: string;
  setDisplayName: (value: string) => void;
  roomCode: string;
  setRoomCode: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  settings: RoomSettings;
  setSettings: (settings: RoomSettings) => void;
}) {
  return (
    <div className="content onboarding-screen">
      <div className="hero-orbit"><Logo /></div>
      <p className="eyebrow center">Realtime fictional party game</p>
      <h2 className="hero-title">When night falls, choose wisely.</h2>
      <p className="hero-copy">Create a private room, invite friends, receive secret roles, vote, and survive.</p>
      <div className="form-card">
        <label>
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" />
        </label>
        <label>
          Room code
          <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="R7K2Q" />
        </label>
        <button className="primary" onClick={onJoin}>Join Room</button>
        <button className="secondary" onClick={onCreate}>Create Room</button>
      </div>
      <div className="quick-settings">
        <div className="section-title"><span>Host quick settings</span><em>Used when creating</em></div>
        <NumberStepper label="Max players" value={settings.maxPlayers} min={4} max={20} onChange={(value) => setSettings({ ...settings, maxPlayers: value })} />
        <NumberStepper label="Day timer" value={settings.daySeconds} min={30} max={300} step={30} suffix="s" onChange={(value) => setSettings({ ...settings, daySeconds: value })} />
        <NumberStepper label="Night timer" value={settings.nightSeconds} min={30} max={180} step={15} suffix="s" onChange={(value) => setSettings({ ...settings, nightSeconds: value })} />
        <ToggleSetting label="Anonymous votes" active={settings.anonymousVotes} onChange={(value) => setSettings({ ...settings, anonymousVotes: value })} />
        <ToggleSetting label="Reveal eliminated roles" active={settings.revealEliminatedRoles} onChange={(value) => setSettings({ ...settings, revealEliminatedRoles: value })} />
      </div>
      <p className="safety-note">Safe fictional gameplay only — no device locking, threats, or harmful mechanics.</p>
    </div>
  );
}

function Lobby({
  state,
  onReady,
  onAddBot,
  onStart,
  onUpdateSettings,
}: {
  state: ServerState;
  onReady: (ready: boolean) => void;
  onAddBot: () => void;
  onStart: () => void;
  onUpdateSettings: (settings: RoomSettings) => void;
}) {
  const readyCount = state.players.filter((player) => player.ready).length;
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${state.room.code}`;
  const copyInvite = () => navigator.clipboard?.writeText(inviteUrl);
  const updateSetting = <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => onUpdateSettings({ ...state.room.settings, [key]: value });
  return (
    <div className="content scrollable">
      <PageHeader title="Waiting Lobby" kicker="Room code" right={state.room.code} />
      <div className="invite-card">
        <div>
          <span>Invite code</span>
          <strong>{state.room.code}</strong>
        </div>
        <button className="tiny-button" onClick={copyInvite}>Copy Invite</button>
      </div>
      <div className="settings-summary">
        <span>{state.room.settings.maxPlayers} max</span>
        <span>{state.room.settings.daySeconds}s day</span>
        <span>{state.room.settings.nightSeconds}s night</span>
        <span>{state.room.settings.anonymousVotes ? 'Anonymous votes' : 'Public votes'}</span>
      </div>
      {state.me?.host && (
        <div className="lobby-settings-card">
          <div className="section-title"><span>Room settings</span><em>Before start</em></div>
          <NumberStepper label="Max players" value={state.room.settings.maxPlayers} min={4} max={20} onChange={(value) => updateSetting('maxPlayers', value)} />
          <NumberStepper label="Day timer" value={state.room.settings.daySeconds} min={30} max={300} step={30} suffix="s" onChange={(value) => updateSetting('daySeconds', value)} />
          <NumberStepper label="Voting timer" value={state.room.settings.votingSeconds} min={20} max={120} step={5} suffix="s" onChange={(value) => updateSetting('votingSeconds', value)} />
          <NumberStepper label="Night timer" value={state.room.settings.nightSeconds} min={30} max={180} step={15} suffix="s" onChange={(value) => updateSetting('nightSeconds', value)} />
          <ToggleSetting label="Anonymous votes" active={state.room.settings.anonymousVotes} onChange={(value) => updateSetting('anonymousVotes', value)} />
          <ToggleSetting label="Reveal eliminated roles" active={state.room.settings.revealEliminatedRoles} onChange={(value) => updateSetting('revealEliminatedRoles', value)} />
          <ToggleSetting label="Allow spectators" active={state.room.settings.allowSpectators} onChange={(value) => updateSetting('allowSpectators', value)} />
        </div>
      )}
      <div className="section-title"><span>Players</span><em>{readyCount}/{state.players.length} ready</em></div>
      <div className="player-list">
        {state.players.map((player) => <PlayerRow key={player.id} player={player} />)}
      </div>
      <ChatPanel state={state} defaultChannel="lobby" />
      <div className="button-pair lobby-actions">
        <button className="secondary" onClick={() => onReady(!state.me?.ready)}>{state.me?.ready ? 'Not Ready' : 'Ready Up'}</button>
        {state.me?.host ? <button className="secondary" onClick={onAddBot}>Add Demo Player</button> : <button className="secondary" disabled>Waiting for host</button>}
      </div>
      {state.me?.host && <button className="primary sticky-action" onClick={onStart}>Start Game</button>}
    </div>
  );
}

function RoleReveal({ state, secondsLeft }: { state: ServerState; secondsLeft: number }) {
  const me = state.me!;
  const mafiaTeam = state.players.filter((player) => player.role === 'Mafia');
  return (
    <div className="content role-screen">
      <PageHeader title="Role Reveal" kicker="Private information" timer={secondsLeft} />
      <div className={`role-card ${me.role === 'Mafia' ? 'mafia-card' : ''}`}>
        <span className="role-icon">{roleIcon(me.role)}</span>
        <p>YOUR ROLE</p>
        <h2>{me.role}</h2>
        <span className="role-subtitle">{roleDescription(me.role)}</span>
      </div>
      <div className="objective-card">
        <span>Objective</span>
        <strong>{me.team === 'Mafia' ? 'Blend in, control the vote, and outnumber the Citizens.' : 'Find every Mafia player before they take over the room.'}</strong>
      </div>
      {me.role === 'Mafia' && (
        <div className="team-card">
          <span>Mafia Team</span>
          <div className="mini-avatars">{mafiaTeam.map((player) => <Avatar key={player.id} name={player.name} color={player.color} />)}</div>
        </div>
      )}
      <p className="safety-note">The next phase starts automatically when the timer reaches zero.</p>
    </div>
  );
}

function DayDiscussion({
  state,
  secondsLeft,
  emitAck,
}: {
  state: ServerState;
  secondsLeft: number;
  emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack>;
}) {
  const alive = state.players.filter((player) => player.alive);
  return (
    <div className="content scrollable">
      <PageHeader title={`DAY ${state.game?.day}`} kicker="Discuss and find the Mafia" timer={secondsLeft} />
      <div className="phase-banner day-banner">
        <strong>Public chat is open.</strong>
        <span>Talk, accuse, defend, and prepare for the vote.</span>
      </div>
      <div className="section-title"><span>Alive Players</span><em>{alive.length} left</em></div>
      <div className="player-grid">
        {alive.map((player) => (
          <div className="player-card" key={player.id}>
            <Avatar name={player.name} color={player.color} />
            <strong>{player.name}</strong>
            <span>{player.role ? player.role : player.connected ? 'Online' : 'Disconnected'}</span>
          </div>
        ))}
      </div>
      <ChatPanel state={state} defaultChannel="day" />
      {state.me?.host && <button className="primary sticky-action" onClick={() => emitAck('host:skipPhase')}>Skip to Vote</button>}
    </div>
  );
}

function Voting({
  state,
  secondsLeft,
  emitAck,
}: {
  state: ServerState;
  secondsLeft: number;
  emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack>;
}) {
  const candidates = state.players.filter((player) => player.alive && player.id !== state.me?.id);
  const [selected, setSelected] = useState(state.game?.myVote || candidates[0]?.id || '');
  const selectedName = state.players.find((player) => player.id === selected)?.name || 'player';
  return (
    <div className="content scrollable vote-screen">
      <PageHeader title="VOTE NOW" kicker={`${state.game?.votesCast || 0} votes cast`} timer={secondsLeft} />
      <div className="vote-list">
        {candidates.map((player) => (
          <button key={player.id} className={`vote-row ${selected === player.id ? 'selected' : ''}`} onClick={() => setSelected(player.id)}>
            <Avatar name={player.name} color={player.color} />
            <div>
              <strong>{player.name}</strong>
              <span>{state.room.settings.anonymousVotes ? 'Votes hidden until result' : 'Public vote mode'}</span>
            </div>
            <em>{state.game?.myVote === player.id ? 'Voted' : selected === player.id ? '✓' : '?'}</em>
          </button>
        ))}
      </div>
      <ChatPanel state={state} defaultChannel="day" compact />
      <div className="bottom-sheet">
        <span>Confirm vote</span>
        <strong>Vote for {selectedName}?</strong>
        <div className="button-pair compact">
          <button className="secondary" onClick={() => setSelected(state.game?.myVote || '')}>Reset</button>
          <button className="primary" onClick={() => emitAck('vote:cast', { targetId: selected })}>Confirm Vote</button>
        </div>
      </div>
    </div>
  );
}

function NightActions({
  state,
  secondsLeft,
  emitAck,
}: {
  state: ServerState;
  secondsLeft: number;
  emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack>;
}) {
  const me = state.me!;
  if (!me.alive) return <SleepScreen state={state} secondsLeft={secondsLeft} title="Dead Chat" text="You are eliminated. You can watch the match and chat with eliminated players." />;
  if (me.role === 'Citizen') return <SleepScreen state={state} secondsLeft={secondsLeft} title="Night Falls" text="Your role has no night action. Wait for sunrise." />;

  const actionCopy = {
    Mafia: ['Mafia Action', 'Choose a target before sunrise.', 'Lock Target'],
    Detective: ['Detective Action', 'Investigate one player’s alignment.', 'Investigate'],
    Doctor: ['Doctor Action', 'Protect one player tonight.', 'Confirm Protection'],
  } as const;

  const candidates = state.players.filter((player) => {
    if (!player.alive) return false;
    if (me.role === 'Mafia') return player.role !== 'Mafia';
    if (me.role === 'Detective') return player.id !== me.id;
    return true;
  });
  const [selected, setSelected] = useState(state.game?.myAction?.targetId || candidates[0]?.id || '');
  const [title, instruction, cta] = actionCopy[me.role as 'Mafia' | 'Detective' | 'Doctor'];
  const accent = me.role === 'Detective' ? 'blue-selected' : me.role === 'Doctor' ? 'green-selected' : 'selected';

  return (
    <div className="content scrollable night-screen">
      <PageHeader title={title} kicker={`Night ${state.game?.day}`} timer={secondsLeft} />
      <div className="phase-banner night-banner">
        <strong>{instruction}</strong>
        <span>{state.game?.myAction?.targetId ? 'Your action is locked. You can change it before the timer ends.' : 'Select a player and confirm your action.'}</span>
      </div>
      <div className="vote-list compact-list">
        {candidates.map((player) => (
          <button key={player.id} className={`vote-row ${selected === player.id ? accent : ''}`} onClick={() => setSelected(player.id)}>
            <Avatar name={player.name} color={player.color} />
            <div>
              <strong>{player.name}</strong>
              <span>{player.role || (player.connected ? 'Online' : 'Disconnected')}</span>
            </div>
            <em>{state.game?.myAction?.targetId === player.id ? 'Locked' : selected === player.id ? '✓' : ''}</em>
          </button>
        ))}
      </div>
      {me.role === 'Mafia' && <ChatPanel state={state} defaultChannel="mafia" compact />}
      {me.role === 'Detective' && state.game?.myAction?.result && (
        <div className="result-panel blue-panel">
          <span>Private result</span>
          <strong>{state.game.myAction.result.targetName} appears {state.game.myAction.result.alignment}.</strong>
        </div>
      )}
      <button className={`primary ${me.role === 'Detective' ? 'blue-button' : me.role === 'Doctor' ? 'green-button' : ''}`} onClick={() => emitAck('night:action', { targetId: selected })}>
        {cta}
      </button>
    </div>
  );
}

function SleepScreen({ state, secondsLeft, title, text }: { state: ServerState; secondsLeft: number; title: string; text: string }) {
  return (
    <div className="content centered-result">
      <PageHeader title={title} kicker={`Night ${state.game?.day}`} timer={secondsLeft} />
      <div className="alert-symbol">☾</div>
      <h2>{text}</h2>
      <ChatPanel state={state} defaultChannel={state.me?.alive ? 'system' : 'dead'} compact />
    </div>
  );
}

function ResultScreen({ state, secondsLeft, title }: { state: ServerState; secondsLeft: number; title: string }) {
  const result = state.game?.lastResult;
  return (
    <div className="content centered-result sunrise-screen">
      <PageHeader title={title} kicker="Server resolved" timer={secondsLeft} />
      <div className="alert-symbol">!</div>
      <h2>{result?.summary || 'Result is being prepared.'}</h2>
      {result?.eliminatedName && (
        <div className="eliminated-card">
          <Avatar name={result.eliminatedName} color="#315f4d" />
          <div>
            <strong>{result.eliminatedName}</strong>
            <span>{result.eliminatedRole ? result.eliminatedRole : 'Role hidden'}</span>
          </div>
        </div>
      )}
      <div className="result-timeline">
        <span>Day {state.game?.day} resolved</span>
        {result?.votesCast !== undefined && <span>{result.votesCast} votes cast</span>}
        {result?.protectedName && <span>{result.protectedName} was protected</span>}
        <span>Next phase starts automatically</span>
      </div>
    </div>
  );
}

function GameOver({ state }: { state: ServerState }) {
  const winner = state.game?.winner || 'Unknown';
  return (
    <div className="content scrollable gameover-screen">
      <div className="victory-moon">☾</div>
      <h2 className="victory-title">{winner.toUpperCase()} WINS</h2>
      <p className="hero-copy">Final roles are now revealed.</p>
      <div className="role-reveal-grid">
        {state.players.map((player) => (
          <div key={player.id}>
            <strong>{player.name}</strong>
            <span className={player.role === 'Mafia' ? 'danger-text' : ''}>{player.role}</span>
          </div>
        ))}
      </div>
      <div className="stats-grid">
        <Stat number={String(state.players.length)} label="Players" />
        <Stat number={String(state.game?.day || 1)} label="Days" />
        <Stat number={String(state.players.filter((player) => player.alive).length)} label="Alive" />
      </div>
      <ChatPanel state={state} defaultChannel="system" compact />
    </div>
  );
}

function HostControls({
  state,
  secondsLeft,
  onSkip,
  onEnd,
  onClose,
}: {
  state: ServerState;
  secondsLeft: number;
  onSkip: () => void;
  onEnd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="content scrollable">
      <PageHeader title="Host Controls" kicker="Actions are logged" timer={secondsLeft} />
      <div className="phase-banner">
        <strong>{phaseLabel(state.game?.phase)} is active</strong>
        <span>Use these controls only for moderation or demo testing.</span>
      </div>
      <div className="host-grid">
        <button onClick={onSkip}>» <span>Skip Phase</span></button>
        <button onClick={onClose}>↩ <span>Return</span></button>
        <button disabled>Ⅱ <span>Pause Soon</span></button>
        <button className="danger-action" onClick={onEnd}>× <span>End Game</span></button>
      </div>
      <div className="activity-log">
        {state.messages.filter((message) => message.channel === 'system').slice(-6).map((message) => (
          <span key={message.id}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {message.body}</span>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ state, defaultChannel, compact = false }: { state: ServerState; defaultChannel: Message['channel'] | 'system'; compact?: boolean }) {
  const [body, setBody] = useState('');
  const canSend = defaultChannel !== 'system' && !(defaultChannel === 'day' && state.game?.phase !== 'dayDiscussion' && state.game?.phase !== 'voting');
  const messages = state.messages.filter((message) => defaultChannel === 'system' ? message.channel === 'system' : message.channel === defaultChannel || message.channel === 'system').slice(compact ? -4 : -8);

  const send = () => {
    const trimmed = body.trim();
    if (!trimmed || !activeSocket) return;
    activeSocket.emit('chat:send', { channel: defaultChannel, body: trimmed }, () => setBody(''));
  };

  return (
    <div className={`chat-card ${compact ? 'compact-chat' : ''}`}>
      <div className="chat-title"><span>{defaultChannel === 'mafia' ? 'Mafia private chat' : defaultChannel === 'dead' ? 'Dead chat' : defaultChannel === 'lobby' ? 'Lobby chat' : defaultChannel === 'system' ? 'System log' : 'Public chat'}</span></div>
      {messages.length === 0 && <p className="message system"><strong>System</strong><span>No messages yet.</span></p>}
      {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
      {canSend && (
        <div className="chat-input">
          <input value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send(); }} placeholder="Send message..." />
          <button onClick={send}>Send</button>
        </div>
      )}
    </div>
  );
}


function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="number-stepper">
      <span>{label}</span>
      <div>
        <button onClick={() => onChange(clamp(value - step))}>−</button>
        <strong>{value}{suffix}</strong>
        <button onClick={() => onChange(clamp(value + step))}>+</button>
      </div>
    </div>
  );
}

function ToggleSetting({ label, active, onChange }: { label: string; active: boolean; onChange: (active: boolean) => void }) {
  return (
    <button className="toggle-setting" onClick={() => onChange(!active)}>
      <span>{label}</span>
      <i className={active ? 'active' : ''}><b /></i>
    </button>
  );
}

function ChatMessage({ message }: { message: Message }) {
  return (
    <p className={`message ${message.channel === 'system' ? 'system' : ''}`}>
      <strong>{message.senderName}</strong>
      <span>{message.body}</span>
    </p>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="player-row">
      <Avatar name={player.name} color={player.color} />
      <div>
        <strong>{player.name}{player.bot ? ' · Bot' : ''}</strong>
        <span>{player.host ? 'Host' : player.connected ? 'Online' : 'Disconnected'}</span>
      </div>
      <em className={player.ready ? 'ready' : ''}>{player.ready ? 'Ready' : 'Not ready'}</em>
    </div>
  );
}

function Avatar({ name, color }: { name: string; color: string }) {
  return <span className="avatar" style={{ background: color }}>{name.slice(0, 1).toUpperCase()}</span>;
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <strong>{number}</strong>
      <span>{label}</span>
    </div>
  );
}

function roleIcon(role: PlayerRole | null) {
  if (role === 'Mafia') return '☾';
  if (role === 'Detective') return '?';
  if (role === 'Doctor') return '🛡';
  return '✦';
}

function roleDescription(role: PlayerRole | null) {
  if (role === 'Mafia') return 'At night, choose one player to eliminate.';
  if (role === 'Detective') return 'Investigate one player every night.';
  if (role === 'Doctor') return 'Protect one player from a night attack.';
  return 'Use discussion and voting to find the Mafia.';
}
