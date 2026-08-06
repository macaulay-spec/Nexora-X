import { useMemo, useState } from 'react';

type AppScreen =
  | 'splash'
  | 'welcome'
  | 'auth'
  | 'home'
  | 'createRoom'
  | 'joinRoom'
  | 'lobby'
  | 'roleReveal'
  | 'dayDiscussion'
  | 'playerProfile'
  | 'vote'
  | 'voteResult'
  | 'nightIntro'
  | 'mafiaAction'
  | 'detectiveAction'
  | 'doctorAction'
  | 'citizenNight'
  | 'deadChat'
  | 'nightResult'
  | 'gameOver'
  | 'hostControls'
  | 'roomSettings'
  | 'matchHistory'
  | 'rules'
  | 'profile'
  | 'notifications'
  | 'reconnect'
  | 'emptyState';

type PlayerRole = 'Mafia' | 'Citizen' | 'Detective' | 'Doctor';

type Player = {
  id: string;
  name: string;
  role: PlayerRole;
  avatar: string;
  color: string;
  status: 'ready' | 'waiting' | 'alive' | 'eliminated' | 'offline';
  suspicion: number;
  votes: number;
};

const screens: { id: AppScreen; label: string; group: string }[] = [
  { id: 'splash', label: 'Splash', group: 'Entry' },
  { id: 'welcome', label: 'Welcome', group: 'Entry' },
  { id: 'auth', label: 'Login / Guest', group: 'Entry' },
  { id: 'home', label: 'Home Dashboard', group: 'Entry' },
  { id: 'createRoom', label: 'Create Room', group: 'Room' },
  { id: 'joinRoom', label: 'Join Room', group: 'Room' },
  { id: 'lobby', label: 'Lobby', group: 'Room' },
  { id: 'roomSettings', label: 'Room Settings', group: 'Room' },
  { id: 'roleReveal', label: 'Role Reveal', group: 'Game' },
  { id: 'dayDiscussion', label: 'Day Discussion', group: 'Game' },
  { id: 'playerProfile', label: 'Player Profile Sheet', group: 'Game' },
  { id: 'vote', label: 'Vote', group: 'Game' },
  { id: 'voteResult', label: 'Vote Result', group: 'Game' },
  { id: 'nightIntro', label: 'Night Intro', group: 'Night' },
  { id: 'mafiaAction', label: 'Mafia Action', group: 'Night' },
  { id: 'detectiveAction', label: 'Detective Action', group: 'Night' },
  { id: 'doctorAction', label: 'Doctor Action', group: 'Night' },
  { id: 'citizenNight', label: 'Citizen Night', group: 'Night' },
  { id: 'deadChat', label: 'Dead Chat', group: 'Night' },
  { id: 'nightResult', label: 'Night Result', group: 'Results' },
  { id: 'gameOver', label: 'Game Over', group: 'Results' },
  { id: 'hostControls', label: 'Host Controls', group: 'Admin' },
  { id: 'matchHistory', label: 'Match History', group: 'Account' },
  { id: 'rules', label: 'Rules', group: 'Account' },
  { id: 'profile', label: 'Profile', group: 'Account' },
  { id: 'notifications', label: 'Notifications', group: 'System' },
  { id: 'reconnect', label: 'Reconnect', group: 'System' },
  { id: 'emptyState', label: 'Empty State', group: 'System' },
];

const players: Player[] = [
  { id: 'you', name: 'You', role: 'Mafia', avatar: 'M', color: '#c4123d', status: 'alive', suspicion: 18, votes: 0 },
  { id: 'hana', name: 'Hana', role: 'Mafia', avatar: 'H', color: '#8b1731', status: 'alive', suspicion: 29, votes: 1 },
  { id: 'minseo', name: 'Minseo', role: 'Citizen', avatar: 'M', color: '#37456d', status: 'alive', suspicion: 72, votes: 4 },
  { id: 'jisoo', name: 'Jisoo', role: 'Doctor', avatar: 'J', color: '#315f4d', status: 'alive', suspicion: 43, votes: 2 },
  { id: 'dae', name: 'Dae', role: 'Detective', avatar: 'D', color: '#2b5d90', status: 'waiting', suspicion: 31, votes: 0 },
  { id: 'yuri', name: 'Yuri', role: 'Citizen', avatar: 'Y', color: '#5a4469', status: 'alive', suspicion: 56, votes: 1 },
  { id: 'jun', name: 'Jun', role: 'Citizen', avatar: 'J', color: '#6d4c34', status: 'offline', suspicion: 24, votes: 0 },
  { id: 'sora', name: 'Sora', role: 'Citizen', avatar: 'S', color: '#494e62', status: 'eliminated', suspicion: 39, votes: 0 },
];

const groupedScreens = screens.reduce<Record<string, typeof screens>>((acc, screen) => {
  acc[screen.group] ||= [];
  acc[screen.group].push(screen);
  return acc;
}, {});

function getScreenIndex(screen: AppScreen) {
  return screens.findIndex((item) => item.id === screen);
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('splash');
  const [showAllScreens, setShowAllScreens] = useState(false);
  const activeIndex = getScreenIndex(activeScreen);
  const screenMeta = screens[activeIndex];

  const next = () => setActiveScreen(screens[Math.min(activeIndex + 1, screens.length - 1)].id);
  const prev = () => setActiveScreen(screens[Math.max(activeIndex - 1, 0)].id);

  return (
    <main className="design-workbench">
      <aside className="design-sidebar">
        <div className="side-brand">
          <Logo />
          <div>
            <p className="eyebrow">Full front-end preview</p>
            <h1>Midnight Vote</h1>
          </div>
        </div>
        <p className="side-copy">
          Every major page of the app is now visible from this design navigator. Select any screen to preview the full mobile UI.
        </p>
        <div className="screen-count-card">
          <span>Total screens</span>
          <strong>{screens.length}</strong>
          <em>{screenMeta.group} / {screenMeta.label}</em>
        </div>
        <nav className="screen-list" aria-label="App screens">
          {Object.entries(groupedScreens).map(([group, items]) => (
            <div key={group} className="screen-group">
              <p>{group}</p>
              {items.map((item, index) => (
                <button key={item.id} className={activeScreen === item.id ? 'active' : ''} onClick={() => setActiveScreen(item.id)}>
                  <span>{String(screens.findIndex((screen) => screen.id === item.id) + 1).padStart(2, '0')}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <section className="preview-stage">
        <div className="stage-header">
          <div>
            <p className="eyebrow">{screenMeta.group}</p>
            <h2>{screenMeta.label}</h2>
          </div>
          <div className="stage-actions">
            <button onClick={prev} disabled={activeIndex === 0}>Previous</button>
            <button onClick={() => setShowAllScreens(true)}>All Screens</button>
            <button onClick={next} disabled={activeIndex === screens.length - 1}>Next</button>
          </div>
        </div>

        <div className="phone-frame">
          <div className="phone-glow" />
          <div className="phone-screen">
            <StatusBar />
            <button className="floating-map" onClick={() => setShowAllScreens(true)}>Map</button>
            <ScreenRenderer screen={activeScreen} setScreen={setActiveScreen} />
          </div>
        </div>
      </section>

      {showAllScreens && <AllScreensOverlay active={activeScreen} onClose={() => setShowAllScreens(false)} onSelect={(screen) => { setActiveScreen(screen); setShowAllScreens(false); }} />}
    </main>
  );
}

function ScreenRenderer({ screen, setScreen }: { screen: AppScreen; setScreen: (screen: AppScreen) => void }) {
  const props = { setScreen };
  switch (screen) {
    case 'splash': return <SplashScreen {...props} />;
    case 'welcome': return <WelcomeScreen {...props} />;
    case 'auth': return <AuthScreen {...props} />;
    case 'home': return <HomeScreen {...props} />;
    case 'createRoom': return <CreateRoomScreen {...props} />;
    case 'joinRoom': return <JoinRoomScreen {...props} />;
    case 'lobby': return <LobbyScreen {...props} />;
    case 'roleReveal': return <RoleRevealScreen {...props} />;
    case 'dayDiscussion': return <DayDiscussionScreen {...props} />;
    case 'playerProfile': return <PlayerProfileSheet {...props} />;
    case 'vote': return <VoteScreen {...props} />;
    case 'voteResult': return <VoteResultScreen {...props} />;
    case 'nightIntro': return <NightIntroScreen {...props} />;
    case 'mafiaAction': return <MafiaActionScreen {...props} />;
    case 'detectiveAction': return <DetectiveActionScreen {...props} />;
    case 'doctorAction': return <DoctorActionScreen {...props} />;
    case 'citizenNight': return <CitizenNightScreen {...props} />;
    case 'deadChat': return <DeadChatScreen {...props} />;
    case 'nightResult': return <NightResultScreen {...props} />;
    case 'gameOver': return <GameOverScreen {...props} />;
    case 'hostControls': return <HostControlsScreen {...props} />;
    case 'roomSettings': return <RoomSettingsScreen {...props} />;
    case 'matchHistory': return <MatchHistoryScreen {...props} />;
    case 'rules': return <RulesScreen {...props} />;
    case 'profile': return <ProfileScreen {...props} />;
    case 'notifications': return <NotificationsScreen {...props} />;
    case 'reconnect': return <ReconnectScreen {...props} />;
    case 'emptyState': return <EmptyStateScreen {...props} />;
  }
}

function SplashScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell className="splash-screen" centered>
      <div className="moon-orbit large"><Logo /></div>
      <p className="eyebrow center">A fictional social deduction game</p>
      <h1 className="app-title">Midnight Vote</h1>
      <p className="muted center">When night falls, every choice becomes evidence.</p>
      <div className="loading-bar"><i /></div>
      <button className="primary" onClick={() => setScreen('welcome')}>Enter Prototype</button>
    </ScreenShell>
  );
}

function WelcomeScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <div className="hero-card tall">
        <Logo />
        <p className="eyebrow">Private room mystery</p>
        <h2>Play the vote. Hide your role. Survive the night.</h2>
        <p>Invite friends into a dark realtime party game where every day brings accusations and every night brings secret actions.</p>
      </div>
      <div className="feature-grid">
        <MiniFeature icon="☾" title="Secret roles" text="Mafia, Doctor, Detective, Citizens" />
        <MiniFeature icon="⌛" title="Live phases" text="Server-timed day and night rounds" />
        <MiniFeature icon="◉" title="Private rooms" text="Join by link or room code" />
      </div>
      <button className="primary" onClick={() => setScreen('auth')}>Get Started</button>
      <button className="secondary" onClick={() => setScreen('rules')}>View Rules</button>
    </ScreenShell>
  );
}

function AuthScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Enter Game" kicker="Guest access" />
      <div className="form-card deluxe">
        <label>Display name<input defaultValue="Macaulay" /></label>
        <label>Avatar style<select defaultValue="shadow"><option value="shadow">Shadow</option><option value="moon">Moon</option><option value="signal">Signal</option></select></label>
        <button className="primary" onClick={() => setScreen('home')}>Continue as Guest</button>
        <button className="secondary">Sign in Later</button>
      </div>
      <SafetyCard />
    </ScreenShell>
  );
}

function HomeScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Midnight Hub" kicker="Tonight's rooms" right="LVL 4" />
      <div className="profile-strip">
        <Avatar name="Macaulay" color="#c4123d" />
        <div><strong>Macaulay</strong><span>7 wins • 18 matches • 62% deception rate</span></div>
      </div>
      <div className="home-actions">
        <button onClick={() => setScreen('createRoom')}><span>＋</span><strong>Create Room</strong><em>Host your own match</em></button>
        <button onClick={() => setScreen('joinRoom')}><span>#</span><strong>Join Room</strong><em>Use invite code</em></button>
      </div>
      <SectionTitle title="Recent rooms" value="3 active" />
      <RoomPreview name="After Class" code="R7K2Q" players="8/12" status="Lobby open" onClick={() => setScreen('lobby')} />
      <RoomPreview name="Midnight Club" code="M9X4A" players="11/12" status="Voting now" onClick={() => setScreen('dayDiscussion')} />
      <button className="secondary" onClick={() => setScreen('matchHistory')}>View Match History</button>
    </ScreenShell>
  );
}

function CreateRoomScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Create Room" kicker="Host setup" />
      <div className="form-card deluxe">
        <label>Room name<input defaultValue="After Class" /></label>
        <label>Theme<select defaultValue="classic"><option value="classic">Classic Crimson</option><option value="school">School Mystery</option><option value="eclipse">Eclipse</option></select></label>
      </div>
      <div className="setting-panel">
        <NumberRow label="Max players" value="12" />
        <NumberRow label="Mafia" value="2" danger />
        <NumberRow label="Detective" value="1" blue />
        <NumberRow label="Doctor" value="1" green />
        <SliderRow label="Day discussion" value="05:00" percent={78} />
        <SliderRow label="Night actions" value="02:00" percent={42} />
        <ToggleRow label="Anonymous votes" active />
        <ToggleRow label="Reveal eliminated roles" />
      </div>
      <button className="primary" onClick={() => setScreen('lobby')}>Generate Room Code</button>
    </ScreenShell>
  );
}

function JoinRoomScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Join Room" kicker="Private invite" />
      <div className="join-code-card">
        <span>Room Code</span>
        <strong>R7K2Q</strong>
        <p>Ask your host for the five-character code or open an invite link.</p>
      </div>
      <div className="code-keypad">
        {'R7K2Q'.split('').map((char) => <button key={char}>{char}</button>)}
      </div>
      <button className="primary" onClick={() => setScreen('lobby')}>Join Waiting Lobby</button>
      <button className="secondary" onClick={() => setScreen('home')}>Back Home</button>
    </ScreenShell>
  );
}

function LobbyScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Waiting Lobby" kicker="Room code" right="R7K2Q" />
      <div className="invite-card wide">
        <div><span>Invite link</span><strong>midnight.vote/R7K2Q</strong></div>
        <button>Copy</button>
      </div>
      <div className="lobby-progress"><span>6 of 8 ready</span><i><b style={{ width: '75%' }} /></i></div>
      <SectionTitle title="Players" value="8/12" />
      <div className="player-list compact-list">
        {players.map((player) => <PlayerRow key={player.id} player={player} lobby />)}
      </div>
      <ChatBox channel="Lobby chat" />
      <div className="dual-actions"><button className="secondary" onClick={() => setScreen('roomSettings')}>Settings</button><button className="primary" onClick={() => setScreen('roleReveal')}>Start Game</button></div>
    </ScreenShell>
  );
}

function RoomSettingsScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Room Settings" kicker="Host controls" />
      <div className="setting-panel spacious">
        <ToggleRow label="Anonymous votes" active />
        <ToggleRow label="Allow spectators" active />
        <ToggleRow label="Dead chat" active />
        <ToggleRow label="Reveal roles on death" />
        <NumberRow label="Tie rule" value="Revote" />
        <NumberRow label="Minimum players" value="6" />
        <SliderRow label="Day phase" value="05:00" percent={78} />
        <SliderRow label="Voting phase" value="00:45" percent={34} />
        <SliderRow label="Night phase" value="02:00" percent={45} />
      </div>
      <button className="primary" onClick={() => setScreen('lobby')}>Save Settings</button>
    </ScreenShell>
  );
}

function RoleRevealScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell className="role-reveal-page">
      <Header title="Role Reveal" kicker="Private information" right="00:12" />
      <div className="role-card mafia">
        <span>☾</span>
        <p>YOUR ROLE</p>
        <h2>MAFIA</h2>
        <em>At night, choose one player to eliminate.</em>
      </div>
      <InfoCard label="Objective" text="Blend in during the day. Control the vote. Outnumber the Citizens." />
      <div className="team-card"><span>Mafia Team</span><div>{players.filter((p) => p.role === 'Mafia').map((p) => <Avatar key={p.id} name={p.name} color={p.color} />)}</div></div>
      <button className="primary" onClick={() => setScreen('dayDiscussion')}>I Understand</button>
    </ScreenShell>
  );
}

function DayDiscussionScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="DAY 1" kicker="Discuss and investigate" right="04:31" />
      <PhaseBanner title="Public chat is open" text="Find contradictions. Watch who pushes the vote." />
      <SectionTitle title="Alive players" value="7 left" />
      <div className="player-grid">
        {players.filter((p) => p.status !== 'eliminated').slice(0, 6).map((player) => <PlayerCard key={player.id} player={player} onClick={() => setScreen('playerProfile')} />)}
      </div>
      <ChatBox channel="Public discussion" />
      <button className="primary sticky-button" onClick={() => setScreen('vote')}>Open Vote</button>
    </ScreenShell>
  );
}

function PlayerProfileSheet({ setScreen }: ScreenProps) {
  const player = players[2];
  return (
    <ScreenShell>
      <Header title="Player Details" kicker="Suspicion profile" />
      <div className="profile-detail-card">
        <Avatar name={player.name} color={player.color} large />
        <h2>{player.name}</h2>
        <span>Alive • Role hidden</span>
        <div className="suspicion-ring"><strong>{player.suspicion}%</strong><em>Suspicion</em></div>
      </div>
      <div className="setting-panel">
        <InfoRow label="Votes received" value="4" />
        <InfoRow label="Last voted for" value="Hana" />
        <InfoRow label="Chat activity" value="High" />
        <InfoRow label="Status" value="Online" />
      </div>
      <button className="primary" onClick={() => setScreen('vote')}>Vote for Minseo</button>
      <button className="secondary" onClick={() => setScreen('dayDiscussion')}>Back to Day</button>
    </ScreenShell>
  );
}

function VoteScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="VOTE NOW" kicker="Choose one suspect" right="00:46" />
      <div className="vote-list">
        {players.filter((p) => p.id !== 'you' && p.status !== 'eliminated').map((player) => (
          <button key={player.id} className={player.id === 'minseo' ? 'selected' : ''}>
            <Avatar name={player.name} color={player.color} />
            <div><strong>{player.name}</strong><span>Votes hidden in anonymous mode</span></div>
            <em>{player.id === 'minseo' ? '✓' : '?'}</em>
          </button>
        ))}
      </div>
      <div className="bottom-sheet"><span>Confirm vote</span><strong>Vote for Minseo?</strong><div className="dual-actions"><button className="secondary">Cancel</button><button className="primary" onClick={() => setScreen('voteResult')}>Confirm</button></div></div>
    </ScreenShell>
  );
}

function VoteResultScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell centered>
      <Header title="Vote Result" kicker="Server resolved" right="00:08" />
      <div className="alert-symbol">!</div>
      <h2 className="result-title">Minseo was eliminated by vote.</h2>
      <p className="muted center">Their role remains hidden by room settings.</p>
      <div className="result-stack"><span>8 votes cast</span><span>4 votes against Minseo</span><span>Night begins next</span></div>
      <button className="primary" onClick={() => setScreen('nightIntro')}>Continue</button>
    </ScreenShell>
  );
}

function NightIntroScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell className="night-intro" centered>
      <div className="moon-orbit large"><span className="moon-symbol">☾</span></div>
      <p className="eyebrow center">Night 1</p>
      <h2 className="result-title">Night has fallen.</h2>
      <p className="muted center">Special roles must act before sunrise. Public chat is now closed.</p>
      <button className="primary" onClick={() => setScreen('mafiaAction')}>Preview Mafia Action</button>
    </ScreenShell>
  );
}

function MafiaActionScreen({ setScreen }: ScreenProps) {
  return <NightActionLayout title="Mafia Action" kicker="Private Mafia panel" timer="01:22" accent="red" instruction="Choose a target before sunrise." cta="Lock Target" selected="Jisoo" onNext={() => setScreen('detectiveAction')} />;
}

function DetectiveActionScreen({ setScreen }: ScreenProps) {
  return <NightActionLayout title="Detective Action" kicker="Private investigation" timer="01:10" accent="blue" instruction="Investigate one player's alignment." cta="Investigate Hana" selected="Hana" onNext={() => setScreen('doctorAction')} result="Hana appears Suspicious." />;
}

function DoctorActionScreen({ setScreen }: ScreenProps) {
  return <NightActionLayout title="Doctor Action" kicker="Private protection" timer="01:05" accent="green" instruction="Protect one player from tonight's attack." cta="Confirm Protection" selected="Minseo" onNext={() => setScreen('citizenNight')} result="You cannot protect the same target twice in a row." />;
}

function CitizenNightScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell centered>
      <Header title="Night Falls" kicker="Citizen view" right="01:05" />
      <div className="alert-symbol moon">☾</div>
      <h2 className="result-title">You have no night action.</h2>
      <p className="muted center">Stay quiet and wait for the sunrise report.</p>
      <button className="primary" onClick={() => setScreen('nightResult')}>Skip to Sunrise</button>
    </ScreenShell>
  );
}

function DeadChatScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Dead Chat" kicker="Spectator mode" right="Ghost" />
      <div className="phase-banner ghost"><strong>You are eliminated.</strong><span>You can watch the game, but cannot vote or act.</span></div>
      <ChatBox channel="Dead players" ghost />
      <button className="secondary" onClick={() => setScreen('nightResult')}>Watch Sunrise Report</button>
    </ScreenShell>
  );
}

function NightResultScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell centered>
      <Header title="Sunrise Report" kicker="Night resolved" right="00:10" />
      <div className="sunrise-card"><span>☀</span><strong>One player was eliminated last night.</strong></div>
      <div className="eliminated-card"><Avatar name="Jisoo" color="#315f4d" /><div><strong>Jisoo</strong><span>Role hidden</span></div></div>
      <div className="result-stack"><span>Doctor protected Minseo</span><span>Detective received a private result</span><span>Day 2 begins next</span></div>
      <button className="primary" onClick={() => setScreen('gameOver')}>Continue</button>
    </ScreenShell>
  );
}

function GameOverScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell className="game-over">
      <div className="victory-moon">☾</div>
      <h2 className="victory-title">MAFIA WINS</h2>
      <p className="muted center">The city sleeps. The shadows remain.</p>
      <div className="mvp-card"><span>Best Deceiver</span><strong>Hana</strong><p>Convinced 4 players to vote wrong.</p></div>
      <div className="role-reveal-grid">{players.slice(0, 6).map((player) => <div key={player.id}><strong>{player.name}</strong><span className={player.role === 'Mafia' ? 'danger-text' : ''}>{player.role}</span></div>)}</div>
      <div className="dual-actions"><button className="secondary" onClick={() => setScreen('matchHistory')}>Stats</button><button className="primary" onClick={() => setScreen('lobby')}>Play Again</button></div>
    </ScreenShell>
  );
}

function HostControlsScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Host Controls" kicker="Live moderation" right="03:12" />
      <PhaseBanner title="Day 2 is active" text="Host actions are shown in game history." />
      <div className="host-grid"><button>Ⅱ<span>Pause Timer</span></button><button>»<span>Skip Phase</span></button><button>☷<span>Manage Players</span></button><button className="danger-action">×<span>End Game</span></button></div>
      <div className="inactive-card"><Avatar name="Dae" color="#2b5d90" /><div><strong>Dae is inactive</strong><span>No response for 02:34</span></div><button>Warn</button></div>
      <div className="activity-log"><span>03:14 Host paused timer</span><span>03:10 Hana returned online</span><span>02:58 Vote phase scheduled</span></div>
      <button className="primary" onClick={() => setScreen('dayDiscussion')}>Return to Game</button>
    </ScreenShell>
  );
}

function MatchHistoryScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Match History" kicker="Your record" right="18" />
      <div className="stats-row"><Stat value="7" label="Wins" /><Stat value="18" label="Matches" /><Stat value="62%" label="Reads" /></div>
      {['Mafia win • After Class', 'Citizen win • Midnight Club', 'Mafia win • Room R7K2Q', 'Citizen win • Final Bell'].map((item, index) => <HistoryRow key={item} title={item} meta={`${index + 1} nights • ${index + 6} players`} />)}
      <button className="secondary" onClick={() => setScreen('home')}>Back Home</button>
    </ScreenShell>
  );
}

function RulesScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="How to Play" kicker="Rules guide" />
      <RuleCard number="01" title="Day" text="Everyone talks. Use evidence, lies, and voting pressure to find the Mafia." />
      <RuleCard number="02" title="Vote" text="Alive players vote for one suspect. The top-voted player is eliminated." />
      <RuleCard number="03" title="Night" text="Mafia attack. Doctor protects. Detective investigates privately." />
      <RuleCard number="04" title="Win" text="Citizens win by removing all Mafia. Mafia win when they equal or outnumber Citizens." />
      <button className="primary" onClick={() => setScreen('home')}>Got It</button>
    </ScreenShell>
  );
}

function ProfileScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Profile" kicker="Player identity" />
      <div className="profile-detail-card"><Avatar name="Macaulay" color="#c4123d" large /><h2>Macaulay</h2><span>Shadow strategist</span></div>
      <div className="setting-panel"><InfoRow label="Favorite role" value="Mafia" /><InfoRow label="Win rate" value="44%" /><InfoRow label="Best streak" value="3" /><InfoRow label="Region" value="Lagos" /></div>
      <button className="secondary" onClick={() => setScreen('notifications')}>Notification Settings</button>
      <button className="primary" onClick={() => setScreen('home')}>Save Profile</button>
    </ScreenShell>
  );
}

function NotificationsScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell>
      <Header title="Notifications" kicker="Alerts" />
      <div className="setting-panel spacious"><ToggleRow label="Room invites" active /><ToggleRow label="Phase started" active /><ToggleRow label="Vote reminder" active /><ToggleRow label="Night action reminder" active /><ToggleRow label="Marketing updates" /></div>
      <SafetyCard />
      <button className="primary" onClick={() => setScreen('profile')}>Save Alerts</button>
    </ScreenShell>
  );
}

function ReconnectScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell centered>
      <div className="alert-symbol pulse">↻</div>
      <h2 className="result-title">Reconnecting to room...</h2>
      <p className="muted center">We are restoring your session and current game state.</p>
      <div className="loading-bar"><i /></div>
      <button className="secondary" onClick={() => setScreen('dayDiscussion')}>Return to Game</button>
    </ScreenShell>
  );
}

function EmptyStateScreen({ setScreen }: ScreenProps) {
  return (
    <ScreenShell centered>
      <div className="empty-illustration">☾</div>
      <h2 className="result-title">No rooms yet.</h2>
      <p className="muted center">Create a private room and send the invite link to your friends.</p>
      <button className="primary" onClick={() => setScreen('createRoom')}>Create First Room</button>
    </ScreenShell>
  );
}

function NightActionLayout({ title, kicker, timer, accent, instruction, cta, selected, result, onNext }: { title: string; kicker: string; timer: string; accent: 'red' | 'blue' | 'green'; instruction: string; cta: string; selected: string; result?: string; onNext: () => void }) {
  return (
    <ScreenShell className={`night-action ${accent}`}>
      <Header title={title} kicker={kicker} right={timer} />
      <PhaseBanner title={instruction} text="Select a player and confirm before the timer reaches zero." />
      <div className="vote-list">
        {players.filter((p) => p.status !== 'eliminated' && p.name !== 'You').slice(0, 6).map((player) => (
          <button key={player.id} className={player.name === selected ? `selected ${accent}` : ''}>
            <Avatar name={player.name} color={player.color} />
            <div><strong>{player.name}</strong><span>{player.name === selected ? 'Selected target' : 'Available'}</span></div>
            <em>{player.name === selected ? '✓' : ''}</em>
          </button>
        ))}
      </div>
      {result && <InfoCard label="Private result" text={result} />}
      <button className={`primary ${accent === 'blue' ? 'blue-button' : accent === 'green' ? 'green-button' : ''}`} onClick={onNext}>{cta}</button>
    </ScreenShell>
  );
}

function AllScreensOverlay({ active, onClose, onSelect }: { active: AppScreen; onClose: () => void; onSelect: (screen: AppScreen) => void }) {
  return (
    <div className="all-screens-overlay">
      <div className="all-screens-panel">
        <div className="all-screens-header"><div><p className="eyebrow">Preview map</p><h2>All App Pages</h2></div><button onClick={onClose}>Close</button></div>
        <div className="all-screen-grid">
          {screens.map((screen, index) => (
            <div
              key={screen.id}
              className={`screen-thumbnail ${active === screen.id ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(screen.id)}
              onKeyDown={(event) => { if (event.key === 'Enter') onSelect(screen.id); }}
            >
              <div className="mini-phone-thumb" aria-hidden="true">
                <div className="mini-phone-inner"><ScreenRenderer screen={screen.id} setScreen={() => undefined} /></div>
              </div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{screen.label}</strong>
              <em>{screen.group}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type ScreenProps = { setScreen: (screen: AppScreen) => void };

function ScreenShell({ children, className = '', centered = false }: { children: React.ReactNode; className?: string; centered?: boolean }) {
  return <section className={`app-screen ${className} ${centered ? 'centered' : ''}`}>{children}</section>;
}

function StatusBar() {
  return <div className="status-bar"><span>21:09</span><span>5G ▰▰</span></div>;
}

function Logo() {
  return <div className="logo-mark"><span>☾</span></div>;
}

function Header({ title, kicker, right }: { title: string; kicker?: string; right?: string }) {
  return <header className="page-header"><div>{kicker && <p className="eyebrow">{kicker}</p>}<h2>{title}</h2></div>{right && <span className="header-chip">{right}</span>}</header>;
}

function Avatar({ name, color, large = false }: { name: string; color: string; large?: boolean }) {
  return <span className={`avatar ${large ? 'large' : ''}`} style={{ background: color }}>{name.slice(0, 1).toUpperCase()}</span>;
}

function MiniFeature({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="mini-feature"><span>{icon}</span><strong>{title}</strong><em>{text}</em></div>;
}

function SafetyCard() {
  return <div className="safety-card"><strong>Safety boundary</strong><span>Fictional game only. No device locking, coercion, tracking without consent, threats, or harmful mechanics.</span></div>;
}

function SectionTitle({ title, value }: { title: string; value?: string }) {
  return <div className="section-title"><span>{title}</span>{value && <em>{value}</em>}</div>;
}

function RoomPreview({ name, code, players: count, status, onClick }: { name: string; code: string; players: string; status: string; onClick: () => void }) {
  return <button className="room-preview" onClick={onClick}><div><strong>{name}</strong><span>{status}</span></div><em>{code}</em><b>{count}</b></button>;
}

function PlayerRow({ player, lobby = false }: { player: Player; lobby?: boolean }) {
  return <div className="player-row"><Avatar name={player.name} color={player.color} /><div><strong>{player.name}</strong><span>{lobby ? player.status : player.role}</span></div><em className={player.status === 'ready' || player.status === 'alive' ? 'ready' : ''}>{lobby ? player.status : `${player.votes} votes`}</em></div>;
}

function PlayerCard({ player, onClick }: { player: Player; onClick: () => void }) {
  return <button className="player-card" onClick={onClick}><Avatar name={player.name} color={player.color} /><strong>{player.name}</strong><span>{player.status}</span><div className="meter"><i style={{ width: `${player.suspicion}%` }} /></div></button>;
}

function ChatBox({ channel, ghost = false }: { channel: string; ghost?: boolean }) {
  const messages = ghost ? [['Sora', 'I knew it was Hana.'], ['Mina', 'Don’t say anything to living players.'], ['System', 'Dead chat cannot affect votes.']] : [['Hana', 'Why did Minseo avoid the first vote?'], ['Minseo', 'I was watching Dae.'], ['Dae', 'Track who changed late.']];
  return <div className="chat-card"><div className="chat-title"><span>{channel}</span></div>{messages.map(([name, text]) => <p className={`message ${name === 'System' ? 'system' : ''}`} key={name + text}><strong>{name}</strong><span>{text}</span></p>)}<div className="chat-input"><input placeholder="Send message..." /><button>Send</button></div></div>;
}

function PhaseBanner({ title, text }: { title: string; text: string }) {
  return <div className="phase-banner"><strong>{title}</strong><span>{text}</span></div>;
}

function InfoCard({ label, text }: { label: string; text: string }) {
  return <div className="info-card"><span>{label}</span><strong>{text}</strong></div>;
}

function NumberRow({ label, value, danger, blue, green }: { label: string; value: string; danger?: boolean; blue?: boolean; green?: boolean }) {
  return <div className={`number-row ${danger ? 'danger' : ''} ${blue ? 'blue' : ''} ${green ? 'green' : ''}`}><span>{label}</span><div><button>−</button><strong>{value}</strong><button>+</button></div></div>;
}

function SliderRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return <div className="slider-row"><div><span>{label}</span><strong>{value}</strong></div><i><b style={{ width: `${percent}%` }} /></i></div>;
}

function ToggleRow({ label, active = false }: { label: string; active?: boolean }) {
  return <div className="toggle-row"><span>{label}</span><i className={active ? 'active' : ''}><b /></i></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="info-row"><span>{label}</span><strong>{value}</strong></div>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function HistoryRow({ title, meta }: { title: string; meta: string }) {
  return <div className="history-row"><div><strong>{title}</strong><span>{meta}</span></div><em>View</em></div>;
}

function RuleCard({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rule-card"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}
