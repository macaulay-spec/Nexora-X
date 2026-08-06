import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

type Page = 'onboarding' | 'auth' | 'home' | 'create' | 'join' | 'lobby' | 'game' | 'admin' | 'rules' | 'profile';
type AuthMode = 'login' | 'register';
type Role = 'Mafia' | 'Citizen' | 'Detective' | 'Doctor';
type Phase = 'roleReveal' | 'dayDiscussion' | 'voting' | 'voteResult' | 'nightActions' | 'nightResult' | 'gameOver';

type User = {
  id: string;
  sessionId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'player';
  avatar: string;
  stats: { wins: number; matches: number; gamesHosted: number };
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
  role: Role | null;
  team: 'Mafia' | 'Citizens' | null;
};

type Message = {
  id: string;
  channel: 'lobby' | 'day' | 'mafia' | 'dead' | 'system';
  senderName: string;
  body: string;
  createdAt: number;
};

type RoomSettings = {
  maxPlayers: number;
  daySeconds: number;
  votingSeconds: number;
  nightSeconds: number;
  anonymousVotes: boolean;
  revealEliminatedRoles: boolean;
  allowSpectators: boolean;
};

type RoomState = {
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
    lastResult: null | {
      type: 'vote' | 'night';
      day: number;
      eliminatedId?: string | null;
      eliminatedName?: string | null;
      eliminatedRole?: Role | null;
      protectedName?: string | null;
      summary: string;
      votesCast?: number;
    };
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

type AdminOverview = {
  stats: { users: number; rooms: number; activeRooms: number; waitingRooms: number; finishedRooms: number };
  rooms: { code: string; status: string; players: number; alive: number; phase: string; day: number; createdAt: number }[];
  users: User[];
};

const TOKEN_KEY = 'midnight-vote-token';
const USER_KEY = 'midnight-vote-user';
const GUEST_SESSION_KEY = 'midnight-vote-guest-session';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const defaultSettings: RoomSettings = {
  maxPlayers: 12,
  daySeconds: 90,
  votingSeconds: 45,
  nightSeconds: 60,
  anonymousVotes: true,
  revealEliminatedRoles: false,
  allowSpectators: true,
};

function getGuestSession() {
  const existing = localStorage.getItem(GUEST_SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  localStorage.setItem(GUEST_SESSION_KEY, created);
  return created;
}

function readStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? (JSON.parse(user) as User) : null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function phaseTitle(phase?: Phase) {
  const titles: Record<Phase, string> = {
    roleReveal: 'Role Reveal',
    dayDiscussion: 'Day Discussion',
    voting: 'Vote Now',
    voteResult: 'Vote Result',
    nightActions: 'Night Actions',
    nightResult: 'Sunrise Report',
    gameOver: 'Game Over',
  };
  return phase ? titles[phase] : 'Lobby';
}

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || 'Request failed.');
  return data as T;
}

export default function App() {
  const [page, setPage] = useState<Page>('onboarding');
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const authSession = token || getGuestSession();

  useEffect(() => {
    const client = io(SOCKET_URL, { auth: { sessionId: authSession, token: authSession } });
    setSocket(client);
    client.on('connect', () => setConnected(true));
    client.on('disconnect', () => setConnected(false));
    client.on('room:update', (state: RoomState) => {
      setRoomState(state);
      setPage(state.room.status === 'waiting' ? 'lobby' : 'game');
    });
    client.on('session', ({ sessionId }: { sessionId: string }) => {
      if (!token) localStorage.setItem(GUEST_SESSION_KEY, sessionId);
    });
    return () => {
      client.disconnect();
    };
  }, [authSession, token]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsLeft = useMemo(() => {
    const endsAt = roomState?.game?.phaseEndsAt;
    return endsAt ? Math.max(0, Math.ceil((endsAt - clock) / 1000)) : 0;
  }, [roomState?.game?.phaseEndsAt, clock]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 3200);
  };

  const emitAck = (event: string, payload: Record<string, unknown> = {}) => {
    if (!socket) return Promise.resolve({ ok: false, error: 'Socket is not connected.' });
    return new Promise<Ack>((resolve) => {
      socket.emit(event, payload, (ack: Ack) => {
        if (!ack?.ok) showToast(ack?.error || 'Something went wrong.', 'error');
        else if (!['room:create', 'room:join'].includes(event)) showToast('Action confirmed.');
        resolve(ack);
      });
    });
  };

  const saveAuth = (nextUser: User, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    setToken('');
    setRoomState(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setPage('onboarding');
  };

  return (
    <main className="app-root">
      <CinematicBackdrop />
      <aside className="desktop-panel">
        <Logo />
        <p className="eyebrow">Full-stack cinematic MVP</p>
        <h1>Midnight Vote</h1>
        <p>A functional social deduction web app with auth, realtime rooms, game phases, admin tools, and motion design.</p>
        <div className="desktop-status"><span>Socket</span><strong>{connected ? 'Live' : 'Offline'}</strong></div>
        <nav>
          <button onClick={() => setPage('home')}>Home</button>
          <button onClick={() => setPage('create')}>Create Room</button>
          <button onClick={() => setPage('join')}>Join Room</button>
          <button onClick={() => setPage('rules')}>Rules</button>
          {user?.role === 'admin' && <button onClick={() => setPage('admin')}>Admin Panel</button>}
        </nav>
      </aside>

      <section className="phone-wrap">
        <div className="phone-glow" />
        <div className="phone-screen">
          <StatusBar />
          <div className={`live-pill ${connected ? 'online' : ''}`}>{connected ? 'Live' : 'Offline'}</div>
          <ScreenTransitionKey page={page} phase={roomState?.game?.phase}>
            {page === 'onboarding' && <Onboarding onStart={() => setPage(user ? 'home' : 'auth')} onRules={() => setPage('rules')} />}
            {page === 'auth' && <AuthScreen mode={authMode} setMode={setAuthMode} saveAuth={saveAuth} showToast={showToast} onContinue={() => setPage('home')} />}
            {page === 'home' && <HomeScreen user={user} onAuth={() => setPage('auth')} onCreate={() => setPage('create')} onJoin={() => setPage('join')} onAdmin={() => setPage('admin')} onProfile={() => setPage('profile')} />}
            {page === 'create' && <CreateRoomScreen socketReady={connected} emitAck={emitAck} displayName={user?.displayName || 'Guest'} />}
            {page === 'join' && <JoinRoomScreen emitAck={emitAck} displayName={user?.displayName || 'Guest'} />}
            {page === 'lobby' && roomState && <LobbyScreen state={roomState} emitAck={emitAck} />}
            {page === 'game' && roomState && <GameScreen state={roomState} secondsLeft={secondsLeft} emitAck={emitAck} />}
            {page === 'admin' && <AdminPanel token={token} user={user} showToast={showToast} />}
            {page === 'rules' && <RulesScreen onBack={() => setPage(user ? 'home' : 'onboarding')} />}
            {page === 'profile' && <ProfileScreen user={user} logout={logout} onBack={() => setPage('home')} />}
          </ScreenTransitionKey>
          {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
        </div>
      </section>
    </main>
  );
}

function ScreenTransitionKey({ children, page, phase }: { children: ReactNode; page: Page; phase?: Phase }) {
  return <div key={`${page}-${phase || 'none'}`} className="screen-motion">{children}</div>;
}

function Onboarding({ onStart, onRules }: { onStart: () => void; onRules: () => void }) {
  return (
    <Screen centered className="onboarding">
      <div className="cinematic-bars"><i /><i /></div>
      <div className="moon-orbit"><Logo /></div>
      <p className="eyebrow center">Realtime mystery party game</p>
      <h2 className="hero-title">When night falls, choose wisely.</h2>
      <p className="muted center">Create rooms, reveal secret roles, vote by day, act by night, and survive until one team wins.</p>
      <div className="motion-cards"><span>Role</span><span>Vote</span><span>Night</span></div>
      <button className="primary" onClick={onStart}>Start Game</button>
      <button className="secondary" onClick={onRules}>How It Works</button>
    </Screen>
  );
}

function AuthScreen({ mode, setMode, saveAuth, showToast, onContinue }: { mode: AuthMode; setMode: (mode: AuthMode) => void; saveAuth: (user: User, token: string) => void; showToast: (text: string, type?: 'success' | 'error') => void; onContinue: () => void }) {
  const [displayName, setDisplayName] = useState('Macaulay');
  const [email, setEmail] = useState(mode === 'register' ? 'admin@midnight.vote' : '');
  const [password, setPassword] = useState('midnight');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const data = await api<{ ok: true; user: User; token: string }>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password }),
      });
      saveAuth(data.user, data.token);
      showToast(mode === 'register' ? 'Account created.' : 'Logged in.');
      onContinue();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Auth failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title={mode === 'register' ? 'Create Account' : 'Welcome Back'} kicker="Secure player profile" />
      <div className="auth-switch"><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Create</button><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button></div>
      <div className="form-card">
        {mode === 'register' && <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label>
        <button className="primary" onClick={submit} disabled={loading}>{loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Login'}</button>
      </div>
      <SafetyCard />
      <p className="hint">Tip: the first created account becomes admin. Use admin@midnight.vote to demo admin access.</p>
    </Screen>
  );
}

function HomeScreen({ user, onAuth, onCreate, onJoin, onAdmin, onProfile }: { user: User | null; onAuth: () => void; onCreate: () => void; onJoin: () => void; onAdmin: () => void; onProfile: () => void }) {
  return (
    <Screen>
      <Header title="Midnight Hub" kicker={user ? `Signed in as ${user.displayName}` : 'Guest mode'} right={user?.role === 'admin' ? 'ADMIN' : 'LIVE'} />
      <button className="profile-strip" onClick={user ? onProfile : onAuth}>
        <Avatar name={user?.displayName || 'Guest'} color="#c4123d" />
        <div><strong>{user?.displayName || 'Guest Player'}</strong><span>{user ? `${user.stats.matches} matches • ${user.stats.gamesHosted} hosted` : 'Create an account to save progress'}</span></div>
      </button>
      <div className="action-grid">
        <button onClick={onCreate}><span>＋</span><strong>Create Room</strong><em>Host a match</em></button>
        <button onClick={onJoin}><span>#</span><strong>Join Room</strong><em>Use a code</em></button>
        <button><span>▶</span><strong>Quick Demo</strong><em>Add bots and test</em></button>
        <button onClick={onAdmin} disabled={user?.role !== 'admin'}><span>◎</span><strong>Admin Panel</strong><em>Monitor rooms</em></button>
      </div>
      <SectionTitle title="Cinematic flow" value="full-stack" />
      <Timeline />
      {!user && <button className="primary" onClick={onAuth}>Create Account / Login</button>}
    </Screen>
  );
}

function CreateRoomScreen({ socketReady, emitAck, displayName }: { socketReady: boolean; emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack>; displayName: string }) {
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings);
  const [roomName, setRoomName] = useState('After Class');
  const createRoom = async () => {
    await emitAck('room:create', { name: displayName, roomName, settings });
  };
  return (
    <Screen>
      <Header title="Create Room" kicker="Host setup" right={socketReady ? 'Ready' : 'Wait'} />
      <div className="form-card"><label>Room name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label></div>
      <div className="settings-card">
        <Stepper label="Max players" value={settings.maxPlayers} min={4} max={20} onChange={(value) => setSettings({ ...settings, maxPlayers: value })} />
        <Stepper label="Day timer" value={settings.daySeconds} min={30} max={300} step={30} suffix="s" onChange={(value) => setSettings({ ...settings, daySeconds: value })} />
        <Stepper label="Vote timer" value={settings.votingSeconds} min={20} max={120} step={5} suffix="s" onChange={(value) => setSettings({ ...settings, votingSeconds: value })} />
        <Stepper label="Night timer" value={settings.nightSeconds} min={30} max={180} step={15} suffix="s" onChange={(value) => setSettings({ ...settings, nightSeconds: value })} />
        <Toggle label="Anonymous votes" active={settings.anonymousVotes} onClick={() => setSettings({ ...settings, anonymousVotes: !settings.anonymousVotes })} />
        <Toggle label="Reveal eliminated roles" active={settings.revealEliminatedRoles} onClick={() => setSettings({ ...settings, revealEliminatedRoles: !settings.revealEliminatedRoles })} />
        <Toggle label="Allow spectators" active={settings.allowSpectators} onClick={() => setSettings({ ...settings, allowSpectators: !settings.allowSpectators })} />
      </div>
      <button className="primary" onClick={createRoom}>Generate Room Code</button>
    </Screen>
  );
}

function JoinRoomScreen({ emitAck, displayName }: { emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack>; displayName: string }) {
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() || '');
  return (
    <Screen centered>
      <Header title="Join Room" kicker="Private invite" />
      <div className="join-card"><span>Room Code</span><input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="R7K2Q" /><p>Paste a code or open an invite link.</p></div>
      <button className="primary" onClick={() => emitAck('room:join', { code, name: displayName })}>Join Waiting Lobby</button>
    </Screen>
  );
}

function LobbyScreen({ state, emitAck }: { state: RoomState; emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack> }) {
  const invite = `${location.origin}${location.pathname}?room=${state.room.code}`;
  const readyCount = state.players.filter((player) => player.ready).length;
  return (
    <Screen>
      <Header title="Waiting Lobby" kicker="Room code" right={state.room.code} />
      <div className="invite-card"><div><span>Invite link</span><strong>{invite.replace(/^https?:\/\//, '')}</strong></div><button onClick={() => navigator.clipboard?.writeText(invite)}>Copy</button></div>
      <div className="progress-card"><span>{readyCount}/{state.players.length} ready</span><i><b style={{ width: `${(readyCount / Math.max(1, state.players.length)) * 100}%` }} /></i></div>
      <div className="player-list">{state.players.map((player) => <PlayerRow key={player.id} player={player} />)}</div>
      <ChatPanel state={state} channel="lobby" />
      <div className="split-buttons"><button className="secondary" onClick={() => emitAck('player:ready', { ready: !state.me?.ready })}>{state.me?.ready ? 'Not Ready' : 'Ready Up'}</button>{state.me?.host && <button className="secondary" onClick={() => emitAck('room:addBot')}>Add Bot</button>}</div>
      {state.me?.host && <button className="primary sticky" onClick={() => emitAck('game:start')}>Start Game</button>}
    </Screen>
  );
}

function GameScreen({ state, secondsLeft, emitAck }: { state: RoomState; secondsLeft: number; emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack> }) {
  const phase = state.game?.phase;
  if (!state.game || !state.me) return null;
  if (phase === 'roleReveal') return <RoleReveal state={state} secondsLeft={secondsLeft} />;
  if (phase === 'dayDiscussion') return <DayDiscussion state={state} secondsLeft={secondsLeft} emitAck={emitAck} />;
  if (phase === 'voting') return <Voting state={state} secondsLeft={secondsLeft} emitAck={emitAck} />;
  if (phase === 'voteResult') return <ResultPage state={state} secondsLeft={secondsLeft} title="Vote Result" />;
  if (phase === 'nightActions') return <NightActions state={state} secondsLeft={secondsLeft} emitAck={emitAck} />;
  if (phase === 'nightResult') return <ResultPage state={state} secondsLeft={secondsLeft} title="Sunrise Report" />;
  return <GameOver state={state} />;
}

function RoleReveal({ state, secondsLeft }: { state: RoomState; secondsLeft: number }) {
  const me = state.me!;
  return (
    <Screen centered className="role-page">
      <Header title="Role Reveal" kicker="Private card" right={formatTime(secondsLeft)} />
      <div className={`role-card ${me.role?.toLowerCase()}`}><span>{roleIcon(me.role)}</span><p>YOUR ROLE</p><h2>{me.role}</h2><em>{roleCopy(me.role)}</em></div>
      {me.role === 'Mafia' && <div className="team-card"><span>Mafia Team</span><div>{state.players.filter((p) => p.role === 'Mafia').map((p) => <Avatar key={p.id} name={p.name} color={p.color} />)}</div></div>}
      <p className="hint center">Day begins automatically after the countdown.</p>
    </Screen>
  );
}

function DayDiscussion({ state, secondsLeft, emitAck }: { state: RoomState; secondsLeft: number; emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack> }) {
  const alive = state.players.filter((player) => player.alive);
  return (
    <Screen>
      <Header title={`DAY ${state.game?.day}`} kicker="Discuss and find Mafia" right={formatTime(secondsLeft)} />
      <PhaseBanner title="Public chat is open" text="Accuse, defend, and track contradictions before voting starts." />
      <div className="player-grid">{alive.map((player) => <PlayerCard key={player.id} player={player} />)}</div>
      <ChatPanel state={state} channel="day" />
      {state.me?.host && <button className="primary sticky" onClick={() => emitAck('host:skipPhase')}>Skip to Vote</button>}
    </Screen>
  );
}

function Voting({ state, secondsLeft, emitAck }: { state: RoomState; secondsLeft: number; emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack> }) {
  const candidates = state.players.filter((player) => player.alive && player.id !== state.me?.id);
  const [target, setTarget] = useState(state.game?.myVote || candidates[0]?.id || '');
  return (
    <Screen>
      <Header title="VOTE NOW" kicker={`${state.game?.votesCast || 0} votes cast`} right={formatTime(secondsLeft)} />
      <div className="vote-list">{candidates.map((player) => <button key={player.id} className={target === player.id ? 'selected' : ''} onClick={() => setTarget(player.id)}><Avatar name={player.name} color={player.color} /><div><strong>{player.name}</strong><span>{state.room.settings.anonymousVotes ? 'Anonymous vote mode' : 'Public vote mode'}</span></div><em>{state.game?.myVote === player.id ? 'Voted' : target === player.id ? '✓' : '?'}</em></button>)}</div>
      <div className="bottom-sheet"><span>Confirm vote</span><strong>Vote for {state.players.find((player) => player.id === target)?.name || 'player'}?</strong><button className="primary" onClick={() => emitAck('vote:cast', { targetId: target })}>Confirm Vote</button></div>
    </Screen>
  );
}

function NightActions({ state, secondsLeft, emitAck }: { state: RoomState; secondsLeft: number; emitAck: (event: string, payload?: Record<string, unknown>) => Promise<Ack> }) {
  const me = state.me!;
  if (!me.alive || me.role === 'Citizen') return <SleepScreen state={state} secondsLeft={secondsLeft} />;
  const candidates = state.players.filter((player) => player.alive && (me.role !== 'Mafia' || player.role !== 'Mafia') && (me.role !== 'Detective' || player.id !== me.id));
  const [target, setTarget] = useState(state.game?.myAction?.targetId || candidates[0]?.id || '');
  const accent = me.role === 'Detective' ? 'blue' : me.role === 'Doctor' ? 'green' : 'red';
  return (
    <Screen className={`night-screen ${accent}`}>
      <Header title={`${me.role} Action`} kicker={`Night ${state.game?.day}`} right={formatTime(secondsLeft)} />
      <PhaseBanner title={roleNightInstruction(me.role)} text="Choose and confirm before sunrise. You may change your action until the timer ends." />
      <div className="vote-list">{candidates.map((player) => <button key={player.id} className={target === player.id ? `selected ${accent}` : ''} onClick={() => setTarget(player.id)}><Avatar name={player.name} color={player.color} /><div><strong>{player.name}</strong><span>{target === player.id ? 'Selected' : 'Available'}</span></div><em>{state.game?.myAction?.targetId === player.id ? 'Locked' : target === player.id ? '✓' : ''}</em></button>)}</div>
      {me.role === 'Mafia' && <ChatPanel state={state} channel="mafia" />}
      {me.role === 'Detective' && state.game?.myAction?.result && <div className="info-card"><span>Private result</span><strong>{state.game.myAction.result.targetName} appears {state.game.myAction.result.alignment}.</strong></div>}
      <button className={`primary ${accent === 'blue' ? 'blue-button' : accent === 'green' ? 'green-button' : ''}`} onClick={() => emitAck('night:action', { targetId: target })}>Confirm Action</button>
    </Screen>
  );
}

function SleepScreen({ state, secondsLeft }: { state: RoomState; secondsLeft: number }) {
  return (
    <Screen centered className="night-sleep">
      <Header title={state.me?.alive ? 'Night Falls' : 'Dead Chat'} kicker="Waiting for sunrise" right={formatTime(secondsLeft)} />
      <div className="alert-symbol moon">☾</div>
      <h2 className="result-title">{state.me?.alive ? 'Your role has no night action.' : 'You are eliminated.'}</h2>
      <p className="muted center">Watch the countdown. The server will resolve the night automatically.</p>
    </Screen>
  );
}

function ResultPage({ state, secondsLeft, title }: { state: RoomState; secondsLeft: number; title: string }) {
  const result = state.game?.lastResult;
  return (
    <Screen centered className="result-page">
      <Header title={title} kicker="Server resolved" right={formatTime(secondsLeft)} />
      <div className="alert-symbol">!</div>
      <h2 className="result-title">{result?.summary || 'Resolving result...'}</h2>
      {result?.eliminatedName && <div className="eliminated-card"><Avatar name={result.eliminatedName} color="#315f4d" /><div><strong>{result.eliminatedName}</strong><span>{result.eliminatedRole || 'Role hidden'}</span></div></div>}
      <div className="result-stack"><span>Day {state.game?.day}</span>{result?.votesCast !== undefined && <span>{result.votesCast} votes cast</span>}<span>Next phase starts automatically</span></div>
    </Screen>
  );
}

function GameOver({ state }: { state: RoomState }) {
  return (
    <Screen className="game-over">
      <div className="victory-moon">☾</div>
      <h2 className="victory-title">{(state.game?.winner || 'Unknown').toUpperCase()} WINS</h2>
      <p className="muted center">The final roles are revealed. The match has ended.</p>
      <div className="role-grid">{state.players.map((player) => <div key={player.id}><strong>{player.name}</strong><span className={player.role === 'Mafia' ? 'danger' : ''}>{player.role}</span></div>)}</div>
      <div className="stats-row"><Stat value={String(state.players.length)} label="Players" /><Stat value={String(state.game?.day || 1)} label="Days" /><Stat value={String(state.players.filter((p) => p.alive).length)} label="Alive" /></div>
    </Screen>
  );
}

function AdminPanel({ token, user, showToast }: { token: string; user: User | null; showToast: (text: string, type?: 'success' | 'error') => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api<{ ok: true } & AdminOverview>('/api/admin/overview', {}, token);
      setOverview(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Admin request failed.', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [token]);
  if (user?.role !== 'admin') return <Screen centered><Header title="Admin Locked" kicker="Permission required" /><p className="muted center">Create the first account or use admin@midnight.vote to access admin tools.</p></Screen>;
  return (
    <Screen>
      <Header title="Admin Panel" kicker="Live operations" right={loading ? 'SYNC' : 'ADMIN'} />
      <div className="stats-row"><Stat value={String(overview?.stats.users || 0)} label="Users" /><Stat value={String(overview?.stats.rooms || 0)} label="Rooms" /><Stat value={String(overview?.stats.activeRooms || 0)} label="Active" /></div>
      <SectionTitle title="Rooms" value={`${overview?.rooms.length || 0} total`} />
      <div className="admin-list">{overview?.rooms.map((room) => <div key={room.code} className="admin-row"><div><strong>{room.code}</strong><span>{room.status} • {room.phase} • {room.players} players</span></div><button onClick={async () => { await api(`/api/admin/rooms/${room.code}/end`, { method: 'POST' }, token); showToast('Room ended.'); load(); }}>End</button></div>) || <p className="hint">No rooms yet.</p>}</div>
      <SectionTitle title="Users" value={`${overview?.users.length || 0} total`} />
      <div className="admin-list">{overview?.users.map((item) => <div key={item.id} className="admin-row"><div><strong>{item.displayName}</strong><span>{item.email} • {item.role}</span></div><em>{item.stats.matches} matches</em></div>)}</div>
      <button className="secondary" onClick={load}>Refresh Admin Data</button>
    </Screen>
  );
}

function RulesScreen({ onBack }: { onBack: () => void }) {
  return <Screen><Header title="How to Play" kicker="Game rules" /><Rule number="01" title="Day" text="Everyone discusses and searches for contradictions." /><Rule number="02" title="Vote" text="Alive players vote to eliminate one suspect." /><Rule number="03" title="Night" text="Mafia attack. Doctor protects. Detective investigates." /><Rule number="04" title="Win" text="Citizens win by removing all Mafia. Mafia win by outnumbering Citizens." /><button className="primary" onClick={onBack}>Got It</button></Screen>;
}

function ProfileScreen({ user, logout, onBack }: { user: User | null; logout: () => void; onBack: () => void }) {
  return <Screen><Header title="Profile" kicker="Account" /><div className="profile-card"><Avatar name={user?.displayName || 'Guest'} color="#c4123d" large /><h2>{user?.displayName || 'Guest'}</h2><span>{user?.email || 'No account yet'}</span></div>{user && <div className="stats-row"><Stat value={String(user.stats.matches)} label="Matches" /><Stat value={String(user.stats.gamesHosted)} label="Hosted" /><Stat value={user.role} label="Role" /></div>}<button className="secondary" onClick={onBack}>Back</button>{user && <button className="primary danger-button" onClick={logout}>Logout</button>}</Screen>;
}

function ChatPanel({ state, channel }: { state: RoomState; channel: Message['channel'] }) {
  const [body, setBody] = useState('');
  const messages = state.messages.filter((message) => message.channel === channel || message.channel === 'system').slice(-5);
  const send = () => {
    if (!body.trim()) return;
    const socket = io(SOCKET_URL, { auth: { sessionId: state.me?.id }, autoConnect: false });
    socket.connect();
    socket.emit('chat:send', { channel, body }, () => { setBody(''); socket.disconnect(); });
  };
  return <div className="chat-card"><div className="chat-title">{channel === 'mafia' ? 'Mafia private chat' : channel === 'lobby' ? 'Lobby chat' : 'Public chat'}</div>{messages.map((message) => <p className="message" key={message.id}><strong>{message.senderName}</strong><span>{message.body}</span></p>)}<div className="chat-input"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Send message..." /><button onClick={send}>Send</button></div></div>;
}

function CinematicBackdrop() { return <div className="cinematic-bg"><span /><span /><span /><i /></div>; }
function Screen({ children, centered = false, className = '' }: { children: ReactNode; centered?: boolean; className?: string }) { return <section className={`screen ${centered ? 'centered' : ''} ${className}`}>{children}</section>; }
function StatusBar() { return <div className="status-bar"><span>21:09</span><span>5G ▰▰</span></div>; }
function Logo() { return <div className="logo"><span>☾</span></div>; }
function Header({ title, kicker, right }: { title: string; kicker?: string; right?: string }) { return <header className="header"><div>{kicker && <p className="eyebrow">{kicker}</p>}<h2>{title}</h2></div>{right && <em>{right}</em>}</header>; }
function Avatar({ name, color, large = false }: { name: string; color: string; large?: boolean }) { return <span className={`avatar ${large ? 'large' : ''}`} style={{ background: color }}>{name.slice(0, 1).toUpperCase()}</span>; }
function SafetyCard() { return <div className="safety"><strong>Safe fictional game</strong><span>No device locking, threats, coercion, or harmful real-world mechanics.</span></div>; }
function Timeline() { return <div className="timeline"><span>Onboard</span><span>Room</span><span>Role</span><span>Vote</span><span>Night</span><span>Win</span></div>; }
function SectionTitle({ title, value }: { title: string; value?: string }) { return <div className="section-title"><strong>{title}</strong>{value && <span>{value}</span>}</div>; }
function Stepper({ label, value, min, max, step = 1, suffix = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (value: number) => void }) { const clamp = (n: number) => Math.min(max, Math.max(min, n)); return <div className="stepper"><span>{label}</span><div><button onClick={() => onChange(clamp(value - step))}>−</button><strong>{value}{suffix}</strong><button onClick={() => onChange(clamp(value + step))}>+</button></div></div>; }
function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button className="toggle" onClick={onClick}><span>{label}</span><i className={active ? 'active' : ''}><b /></i></button>; }
function PlayerRow({ player }: { player: Player }) { return <div className="player-row"><Avatar name={player.name} color={player.color} /><div><strong>{player.name}{player.bot ? ' · Bot' : ''}</strong><span>{player.host ? 'Host' : player.connected ? 'Online' : 'Offline'}</span></div><em className={player.ready ? 'ready' : ''}>{player.ready ? 'Ready' : 'Waiting'}</em></div>; }
function PlayerCard({ player }: { player: Player }) { return <div className="player-card"><Avatar name={player.name} color={player.color} /><strong>{player.name}</strong><span>{player.role || (player.connected ? 'Online' : 'Offline')}</span></div>; }
function PhaseBanner({ title, text }: { title: string; text: string }) { return <div className="phase-banner"><strong>{title}</strong><span>{text}</span></div>; }
function Stat({ value, label }: { value: string; label: string }) { return <div className="stat"><strong>{value}</strong><span>{label}</span></div>; }
function Rule({ number, title, text }: { number: string; title: string; text: string }) { return <div className="rule"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
function roleIcon(role: Role | null) { return role === 'Mafia' ? '☾' : role === 'Detective' ? '?' : role === 'Doctor' ? '🛡' : '✦'; }
function roleCopy(role: Role | null) { return role === 'Mafia' ? 'Secretly choose one player at night.' : role === 'Detective' ? 'Investigate one player every night.' : role === 'Doctor' ? 'Protect one player from attack.' : 'Use discussion and voting to find Mafia.'; }
function roleNightInstruction(role: Role | null) { return role === 'Mafia' ? 'Choose a target to attack.' : role === 'Detective' ? 'Investigate one player’s alignment.' : role === 'Doctor' ? 'Protect one player tonight.' : 'Wait for sunrise.'; }
