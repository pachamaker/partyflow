import { motion } from 'framer-motion'
import useBreakpoint from '../hooks/useBreakpoint'
import C from '../constants/colors'
import GlassPanel from './ui/GlassPanel'

type TeamCode = 'A' | 'B'
type PlayerRole = 'explainer' | 'guesser' | 'spectator'

type TeamPlayer = {
  id: string
  name: string
  connected: boolean
  role: PlayerRole
  isHost?: boolean
}

type SpectatorScreenProps = {
  teamAScore?: number
  teamBScore?: number
  timeRemaining?: number
  word?: string
  explainerName?: string
  guesserName?: string
  spectatorTeam?: TeamCode
  roundNumber?: number
  activeTeam?: TeamCode
  isRoundActive?: boolean
  canStartRound?: boolean
  onStartRound?: () => void
  teamAPlayers?: TeamPlayer[]
  teamBPlayers?: TeamPlayer[]
  roundStats?: {
    guessedWords: string[]
    skippedWords: string[]
  }
}

function ScorePill({ label, score, color, reverse, compact = false }: { label: string; score: number | string; color: string; reverse?: boolean; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px', flexDirection: reverse ? 'row-reverse' : 'row', padding: compact ? '7px 10px' : '8px 16px', borderRadius: compact ? '12px' : '14px', border: `1px solid ${color}30`, background: 'linear-gradient(135deg,rgba(8,8,28,0.88) 0%,rgba(16,8,40,0.92) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: `0 0 0 1px ${color}20,0 4px 20px rgba(0,0,0,0.55),0 0 24px ${color}18,inset 0 1px 0 rgba(255,255,255,0.07)` }}>
      <span style={{ fontSize: compact ? '7px' : '9px', fontWeight: 900, letterSpacing: compact ? '0.12em' : '0.16em', color: `${color}99`, textTransform: 'uppercase', lineHeight: 1 }}>{label}</span>
      <div style={{ width: '1px', height: compact ? '16px' : '18px', background: `${color}28`, flexShrink: 0 }} />
      <span style={{ fontSize: compact ? '20px' : '26px', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 14px ${color}cc,0 0 30px ${color}55` }}>{score}</span>
    </div>
  )
}

function RoundTimerPill({ roundNum, seconds }: { roundNum: number; seconds: number }) {
  const safeSeconds = Math.max(0, seconds)
  const urgent = safeSeconds <= 10
  const tColor = urgent ? C.red : '#fff'
  const mm = Math.floor(safeSeconds / 60)
  const ss = String(safeSeconds % 60).padStart(2, '0')

  return (
    <motion.div animate={urgent ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={urgent ? { repeat: Infinity, duration: 0.65 } : {}} style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: '9999px', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(14,10,44,0.92),rgba(8,6,28,0.96))', border: `1.5px solid ${urgent ? `${C.red}60` : `${C.purple}50`}`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: `0 0 0 1px ${urgent ? C.red : C.purple}20,0 4px 24px rgba(0,0,0,0.5),0 0 30px ${urgent ? C.red : C.purple}20` }}>
      <div style={{ padding: '10px 20px 10px 22px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.purple, textShadow: `0 0 10px ${C.purple}` }}>РАУНД {Math.max(1, roundNum)}</span>
      </div>
      <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)' }} />
      <div style={{ padding: '10px 22px 10px 20px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: tColor, textShadow: `0 0 18px ${urgent ? C.red : '#ffffff80'}` }}>{mm}:{ss}</span>
      </div>
    </motion.div>
  )
}

function BlurredBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#04061a' }} />
      <div style={{ position: 'absolute', top: '-25%', left: '-35%', width: '95%', height: '75%', borderRadius: '50%', background: 'radial-gradient(circle, #2a1472 0%, transparent 68%)', filter: 'blur(65px)', opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: '5%', right: '-25%', width: '75%', height: '65%', borderRadius: '50%', background: 'radial-gradient(circle, #0d3060 0%, transparent 68%)', filter: 'blur(60px)', opacity: 0.8 }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.038, backgroundImage: 'linear-gradient(rgba(140,170,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,255,0.9) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  )
}

function roleEmoji(role: PlayerRole) {
  if (role === 'explainer') return '🎙️'
  if (role === 'guesser') return '🧠'
  return '🎧'
}

function GamePlayerRow({ player, color, roundEnded }: { player: TeamPlayer; color: string; roundEnded?: boolean }) {
  const isExplainer = player.role === 'explainer'
  const visualRole: PlayerRole = roundEnded ? (isExplainer ? 'explainer' : 'spectator') : player.role
  const highlight = isExplainer

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '10px', background: highlight ? `${color}22` : `${color}0d`, border: highlight ? `1px solid ${color}55` : `1px solid ${color}18`, boxShadow: highlight ? `0 0 14px ${color}28` : 'none' }}>
      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: highlight ? `linear-gradient(135deg,${color},${color}aa)` : `linear-gradient(135deg,${color}88,${color}44)`, boxShadow: highlight ? `0 0 10px ${color}80` : `0 0 6px ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{player.name[0]?.toUpperCase() ?? '?'}</div>
      <span style={{ fontSize: '12px', fontWeight: highlight ? 900 : 700, color: highlight ? '#fff' : 'rgba(255,255,255,0.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</span>
      <span style={{ fontSize: '12px', lineHeight: 1 }}>{roleEmoji(visualRole)}</span>
    </div>
  )
}

function WordResultList({ guessed, missed }: { guessed: string[]; missed: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {guessed.map((word, index) => (
        <motion.div key={`g-${word}-${index}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: `${C.green}0f`, border: `1px solid ${C.green}22` }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.green, boxShadow: `0 0 8px ${C.green}`, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.82)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{word}</span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: C.green }}>+1</span>
        </motion.div>
      ))}

      {missed.map((word, index) => (
        <motion.div key={`m-${word}-${index}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (guessed.length + index) * 0.04 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through' }}>{word}</span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'rgba(255,255,255,0.25)' }}>—</span>
        </motion.div>
      ))}
    </div>
  )
}

function SpectatorScreenMobile({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  word = '',
  explainerName = '—',
  activeTeam = 'A',
  isRoundActive = true,
  canStartRound = false,
  onStartRound,
  roundStats,
}: SpectatorScreenProps) {
  const activeTeamColor = activeTeam === 'A' ? C.blue : C.orange
  const guessedWords = roundStats?.guessedWords ?? []
  const skippedWords = roundStats?.skippedWords ?? []
  const guessedCount = guessedWords.length
  const skippedCount = skippedWords.length

  if (isRoundActive) {
    return (
      <div style={{ position: 'relative', height: 'calc(100vh - 108px)', minHeight: '640px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", maxWidth: '430px', margin: '0 auto', borderRadius: '36px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <BlurredBg />
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 14px', gap: '8px' }}>
          <ScorePill label="Команда А" score={teamAScore} color={C.blue} compact />
          <ScorePill label="Время" score={`${Math.floor(timeRemaining / 60)}:${String(Math.max(0, timeRemaining) % 60).padStart(2, '0')}`} color={C.purple} compact />
          <ScorePill label="Команда Б" score={teamBScore} color={C.orange} reverse compact />
        </div>

        <div style={{ position: 'relative', zIndex: 10, padding: '6px 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Ты — наблюдатель</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '9999px', background: `${activeTeamColor}12`, border: `1px solid ${activeTeamColor}35` }}>
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: activeTeamColor, textShadow: `0 0 10px ${activeTeamColor}60` }}>Угадывает команда {activeTeam}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.orange, boxShadow: `0 0 7px ${C.orange}` }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Объясняет:</span>
              <span style={{ fontSize: '11px', fontWeight: 900, color: C.orange }}>{explainerName}</span>
            </div>
          </div>

          <GlassPanel style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
            {[{ label: 'Угадано', val: guessedCount, color: C.green }, { label: 'Пропущено', val: skippedCount, color: 'rgba(255,255,255,0.3)' }].map((entry) => (
              <div key={entry.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: entry.color, boxShadow: entry.color !== 'rgba(255,255,255,0.3)' ? `0 0 8px ${entry.color}` : 'none' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{entry.label}</span>
                <span style={{ fontSize: '22px', fontWeight: 900, color: entry.color, lineHeight: 1 }}>{entry.val}</span>
              </div>
            ))}
          </GlassPanel>
        </div>

        <div style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
            <div style={{ width: '100%', maxWidth: '320px', opacity: 0.55 }}>
              <div style={{ height: '22px' }} />
              <div style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', background: 'linear-gradient(148deg, #5b3dd4 0%, #341ea0 45%, #1d1570 100%)', boxShadow: `0 0 0 1px rgba(255,255,255,0.13), 0 8px 32px rgba(0,0,0,0.62)`, height: '310px' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, transparent 100%)', borderRadius: '28px 28px 0 0', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <h1 style={{ margin: 0, fontSize: 'clamp(1.8rem, 11vw, 3.2rem)', fontWeight: 900, lineHeight: 1.1, textAlign: 'center', color: '#fff', width: '100%', padding: '0 20px' }}>{word || 'Ожидание слова...'}</h1>
                </div>
              </div>
              <div style={{ height: '22px' }} />
            </div>
          </div>
        </div>

        <div style={{ height: '26px' }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 108px)', minHeight: '640px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", maxWidth: '430px', margin: '0 auto', borderRadius: '36px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <BlurredBg />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, overflowY: 'auto', scrollbarWidth: 'none', padding: '24px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ padding: '10px 24px', borderRadius: '9999px', background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,146,60,0.15))', border: `1.5px solid ${C.yellow}55`, boxShadow: `0 0 30px ${C.yellow}30` }}>
            <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.yellow }}>⏱ Раунд завершён</span>
          </div>
        </div>

        <GlassPanel color={`${C.yellow}09`} border={`${C.yellow}30`} style={{ padding: '18px 20px', marginBottom: '12px', boxShadow: `0 0 40px ${C.yellow}15` }}>
          <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${C.yellow}88`, textAlign: 'center', marginBottom: '14px' }}>Итог раунда</div>
          <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: '14px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '56px', fontWeight: 900, lineHeight: 1, color: C.green, textShadow: `0 0 30px ${C.green}` }}>{guessedCount}</span>
              <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: `${C.green}88` }}>Угадано</span>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 16px' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '56px', fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.35)' }}>{skippedCount}</span>
              <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Пропущено</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <div style={{ padding: '6px 16px', borderRadius: '10px', background: `${C.blue}18`, border: `1px solid ${C.blue}35` }}>
              <span style={{ fontSize: '13px', fontWeight: 900, color: C.blue }}>А: {teamAScore}</span>
            </div>
            <div style={{ padding: '6px 16px', borderRadius: '10px', background: `${C.orange}18`, border: `1px solid ${C.orange}35` }}>
              <span style={{ fontSize: '13px', fontWeight: 900, color: C.orange }}>Б: {teamBScore}</span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel style={{ padding: '14px 14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${C.yellow}88` }}>Разбор слов</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ padding: '2px 8px', borderRadius: '6px', background: `${C.green}20`, border: `1px solid ${C.green}35` }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: C.green }}>{guessedCount} ✓</span>
              </div>
              <div style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.35)' }}>{skippedCount} —</span>
              </div>
            </div>
          </div>
          <WordResultList guessed={guessedWords} missed={skippedWords} />
        </GlassPanel>

        <div style={{ marginBottom: '6px', textAlign: 'center' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Следующий ведущий</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '9999px', background: `${C.purple}18`, border: `1px solid ${C.purple}40` }}>
            <span style={{ fontSize: '13px' }}>🎙️</span>
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{explainerName}</span>
          </div>
        </div>

        {canStartRound ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97, y: 3 }}
            whileHover={{ scale: 1.01 }}
            onClick={onStartRound}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: `2px solid ${C.green}60`, background: `linear-gradient(135deg,#22c55e,${C.green},#16a34a)`, boxShadow: `0 7px 0 #15803d,0 10px 35px ${C.green}45,inset 0 1px 0 rgba(255,255,255,0.3)`, cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Начать новый раунд
          </motion.button>
        ) : null}
      </div>
    </div>
  )
}

function SpectatorScreenDesktop({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  word = '',
  roundNumber = 1,
  activeTeam = 'A',
  isRoundActive = true,
  canStartRound = false,
  onStartRound,
  teamAPlayers = [],
  teamBPlayers = [],
  roundStats,
}: SpectatorScreenProps) {
  const roundEnded = !isRoundActive
  const safeWord = word || 'Ожидание слова...'

  const teamAStatus = roundEnded ? 'Ожидают' : activeTeam === 'A' ? 'Играют' : 'Ожидают'
  const teamBStatus = roundEnded ? 'Ожидают' : activeTeam === 'B' ? 'Играют' : 'Ожидают'
  const guessedWords = roundStats?.guessedWords ?? []
  const skippedWords = roundStats?.skippedWords ?? []
  const guessedCount = guessedWords.length
  const skippedCount = skippedWords.length

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '640px', marginLeft: 'calc(50% - 50vw)', display: 'flex', overflow: 'hidden', fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      <BlurredBg />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px 1fr', gap: 0, alignItems: 'stretch', paddingTop: roundEnded ? '60px' : 0, transition: 'padding-top 0.3s' }}>
        <div style={{ padding: '20px 16px 20px 36px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          <GlassPanel color={`${C.blue}09`} border={`${C.blue}40`} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue, textShadow: `0 0 12px ${C.blue}` }}>Team A</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: `${C.blue}70`, textTransform: 'uppercase' }}>{teamAStatus}</span>
            </div>
            <div style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{teamAScore}</div>
            {teamAPlayers.map((player) => (
              <GamePlayerRow key={player.id} player={player} color={C.blue} roundEnded={roundEnded} />
            ))}
          </GlassPanel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: roundEnded ? 'flex-start' : 'center', padding: '20px 12px', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {roundEnded ? (
            <div style={{ padding: '8px 22px', borderRadius: '9999px', background: `linear-gradient(135deg,${C.yellow}30,${C.orange}20)`, border: `1px solid ${C.yellow}50`, boxShadow: `0 0 24px ${C.yellow}30` }}>
              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.yellow }}>Раунд завершен</span>
            </div>
          ) : (
            <>
              <RoundTimerPill roundNum={Math.max(1, roundNumber)} seconds={timeRemaining} />
              <div style={{ padding: '5px 16px', borderRadius: '9999px', background: `${activeTeam === 'A' ? C.blue : C.orange}18`, border: `1px solid ${activeTeam === 'A' ? C.blue : C.orange}35` }}>
                <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', color: activeTeam === 'A' ? C.blue : C.orange, textTransform: 'uppercase' }}>Играет Team {activeTeam}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Ты – Наблюдатель</span>
              </div>
              <div style={{ opacity: 0.5, width: '100%', maxWidth: '250px' }}>
                <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', background: 'linear-gradient(148deg,#5b3dd4 0%,#341ea0 45%,#1d1570 100%)', boxShadow: `0 0 0 1px rgba(255,255,255,0.13),0 8px 32px rgba(0,0,0,0.62),0 0 70px ${C.purple}30`, height: '220px' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg,rgba(255,255,255,0.13) 0%,transparent 100%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '34px', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>{safeWord}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {roundEnded ? (
            <>
              <GlassPanel color={`${C.yellow}12`} border={`${C.yellow}40`} style={{ width: '100%', padding: '16px 18px', textAlign: 'center', boxShadow: `0 0 40px ${C.yellow}20` }}>
                <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${C.yellow}88`, marginBottom: '12px' }}>Итог раунда</div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '52px', fontWeight: 900, color: C.green, textShadow: `0 0 24px ${C.green}` }}>{guessedCount}</div>
                    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${C.green}aa` }}>Угадано</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.12)' }} />
                  <div>
                    <div style={{ fontSize: '52px', fontWeight: 900, color: 'rgba(255,255,255,0.42)' }}>{skippedCount}</div>
                    <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>Пропущено</div>
                  </div>
                </div>
              </GlassPanel>

              {canStartRound ? (
                <motion.button type="button" whileTap={{ scale: 0.97, y: 3 }} whileHover={{ scale: 1.01 }} onClick={onStartRound} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: `2px solid ${C.green}60`, background: `linear-gradient(135deg,#22c55e,${C.green},#16a34a)`, boxShadow: `0 6px 0 #15803d,0 10px 30px ${C.green}45,inset 0 1px 0 rgba(255,255,255,0.3)`, cursor: 'pointer', color: '#fff', fontSize: '13px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Начать новый раунд
                </motion.button>
              ) : null}

              <GlassPanel color={`${C.yellow}08`} border={`${C.yellow}25`} style={{ width: '100%', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: `${C.yellow}88`, textTransform: 'uppercase' }}>Разбор слов</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px', background: `${C.green}20`, border: `1px solid ${C.green}35`, color: C.green }}>{guessedCount} ✓</span>
                    <span style={{ fontSize: '9px', fontWeight: 900, padding: '2px 7px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)' }}>{skippedCount} —</span>
                  </div>
                </div>
                <WordResultList guessed={guessedWords} missed={skippedWords} />
              </GlassPanel>
            </>
          ) : null}
        </div>

        <div style={{ padding: '20px 36px 20px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', scrollbarWidth: 'none' }}>
          <GlassPanel color={`${C.orange}09`} border={`${C.orange}40`} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.orange, textShadow: `0 0 12px ${C.orange}` }}>Team B</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: `${C.orange}70`, textTransform: 'uppercase' }}>{teamBStatus}</span>
            </div>
            <div style={{ fontSize: '44px', fontWeight: 900, lineHeight: 1, color: '#fff', textAlign: 'center', textShadow: `0 0 30px ${C.orange}` }}>{teamBScore}</div>
            {teamBPlayers.map((player) => (
              <GamePlayerRow key={player.id} player={player} color={C.orange} roundEnded={roundEnded} />
            ))}
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}

export default function SpectatorScreen(props: SpectatorScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <SpectatorScreenDesktop {...props} /> : <SpectatorScreenMobile {...props} />
}

export type { SpectatorScreenProps }
