import { useMemo, type CSSProperties, type FC } from 'react'
import useBreakpoint from '../hooks/useBreakpoint'

type TeamCode = 'A' | 'B'

type TeamResultPlayer = {
  id: string
  name: string
  guessed: number
  isHost: boolean
}

type TeamResult = {
  label: string
  score: number
  players: TeamResultPlayer[]
}

type GameResultScreenProps = {
  winnerTeam?: TeamCode
  teamA?: TeamResult
  teamB?: TeamResult
  canPlayAgain?: boolean
  onPlayAgain?: () => void
  onHome?: () => void
}

const FONT_SANS = 'var(--font-sans)'

const DEFAULT_TEAM_A: TeamResult = {
  label: 'Синяя команда',
  score: 52,
  players: [
    { id: 'a1', name: 'Паша', guessed: 18, isHost: true },
    { id: 'a2', name: 'Дима', guessed: 12, isHost: false },
    { id: 'a3', name: 'Лена', guessed: 9, isHost: false },
  ],
}

const DEFAULT_TEAM_B: TeamResult = {
  label: 'Оранжевая команда',
  score: 47,
  players: [
    { id: 'b1', name: 'Саша', guessed: 15, isHost: true },
    { id: 'b2', name: 'Катя', guessed: 10, isHost: false },
    { id: 'b3', name: 'Олег', guessed: 8, isHost: false },
    { id: 'b4', name: 'Рита', guessed: 6, isHost: false },
  ],
}

type TeamPalette = {
  label: string
  cssColor: string
  deep: string
  rgb: string
  glow: string
  textShadow: string
}

const TEAM_META: Record<TeamCode, TeamPalette> = {
  A: {
    label: 'СИНЯЯ КОМАНДА',
    cssColor: 'var(--color-blue)',
    deep: 'var(--color-blue-deep)',
    rgb: '56,189,248',
    glow: 'rgba(56,189,248,0.6)',
    textShadow: '0 0 24px rgba(56,189,248,0.67), 0 0 60px rgba(56,189,248,0.33)',
  },
  B: {
    label: 'ОРАНЖЕВАЯ КОМАНДА',
    cssColor: 'var(--color-orange)',
    deep: 'var(--color-orange-deep)',
    rgb: '251,146,60',
    glow: 'rgba(251,146,60,0.6)',
    textShadow: '0 0 24px rgba(251,146,60,0.67), 0 0 60px rgba(251,146,60,0.33)',
  },
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/* ── Ambient (win palette) ──────────────────────────────────── */

const Ambient: FC = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      background: [
        'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(56,189,248,0.40), transparent 65%)',
        'radial-gradient(ellipse 60% 50% at 50% 80%, rgba(124,58,237,0.30), transparent 65%)',
      ].join(', '),
    }}
  />
)

/* ── Confetti (CSS keyframe) ────────────────────────────────── */

const CONFETTI_COLORS = [
  'var(--color-blue)',
  'var(--color-orange)',
  'var(--color-accent)',
  'var(--color-warn)',
  'var(--color-success)',
  '#FFFFFF',
]

type ConfettiPiece = {
  id: number
  left: string
  color: string
  size: number
  shape: 'circle' | 'rect'
  duration: number
  delay: number
}

const Confetti: FC<{ pieces: ConfettiPiece[] }> = ({ pieces }) => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 2,
      overflow: 'hidden',
    }}
  >
    {pieces.map((p) => (
      <span
        key={p.id}
        style={{
          position: 'absolute',
          top: -20,
          left: p.left,
          width: p.size,
          height: p.shape === 'circle' ? p.size : Math.round(p.size * 0.6),
          borderRadius: p.shape === 'circle' ? '50%' : 2,
          background: p.color,
          boxShadow: `0 0 6px ${p.color}`,
          animation: `confettiFall ${p.duration}s linear ${p.delay}s infinite`,
        }}
      />
    ))}
  </div>
)

function makeConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${(i * 1.93) % 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + (i % 4) * 2,
    shape: i % 3 === 0 ? 'circle' : 'rect',
    duration: 3 + ((i * 0.13) % 2),
    delay: (i * 0.11) % 5,
  }))
}

/* ── PlayerRow (MVP + counter) ──────────────────────────────── */

const PlayerRow: FC<{
  player: TeamResultPlayer
  team: TeamPalette
  isMvp: boolean
}> = ({ player, team, isMvp }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${team.cssColor}, ${team.deep})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        fontWeight: 700,
        color: '#0A0E1F',
        flexShrink: 0,
      }}
    >
      {getInitial(player.name)}
    </div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--color-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {player.name}
      </span>
      {isMvp ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-warn)',
            padding: '2px 8px',
            borderRadius: 6,
            background: 'rgba(250,204,21,0.15)',
            border: '1px solid rgba(250,204,21,0.3)',
            flexShrink: 0,
            letterSpacing: 0.4,
          }}
        >
          MVP
        </span>
      ) : null}
    </div>
    <span
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-text-sec)',
        flexShrink: 0,
      }}
    >
      {player.guessed} слов
    </span>
  </div>
)

/* ── TeamCard ───────────────────────────────────────────────── */

const TeamCard: FC<{
  team: TeamPalette
  result: TeamResult
  isWinner: boolean
  showMvp: boolean
  scoreFontSize: number
  padding: number
  variant: 'winner' | 'loser'
}> = ({ team, result, isWinner, showMvp, scoreFontSize, padding, variant }) => {
  const isWinnerVariant = variant === 'winner'
  const ranked = useMemo(
    () => [...result.players].sort((l, r) => r.guessed - l.guessed),
    [result.players],
  )
  const maxGuessed = ranked[0]?.guessed ?? 0
  const mvpId = showMvp && maxGuessed > 0 ? ranked[0]?.id : null

  const borderAlpha = isWinnerVariant ? 0.33 : 0.19
  const shadow = isWinnerVariant ? `0 24px 60px rgba(${team.rgb},0.13)` : 'none'

  return (
    <div
      style={{
        padding,
        borderRadius: 28,
        background: `linear-gradient(180deg, rgba(${team.rgb},0.14), transparent)`,
        border: `1.5px solid rgba(${team.rgb},${borderAlpha})`,
        boxShadow: shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: FONT_SANS,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: team.cssColor,
            boxShadow: `0 0 10px ${team.cssColor}`,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: team.cssColor,
            letterSpacing: 1,
            textTransform: 'uppercase',
            textShadow: `0 0 12px ${team.glow}`,
          }}
        >
          {team.label}
        </span>
        {isWinner && isWinnerVariant ? (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--color-warn)',
              padding: '3px 8px',
              borderRadius: 6,
              background: 'rgba(250,204,21,0.15)',
              border: '1px solid rgba(250,204,21,0.3)',
              letterSpacing: 0.4,
            }}
          >
            ★ Победа
          </span>
        ) : null}
      </div>

      <div
        style={{
          fontSize: scoreFontSize,
          fontWeight: 900,
          color: 'var(--color-text)',
          letterSpacing: -3,
          lineHeight: 1,
        }}
      >
        {result.score}
      </div>

      <div style={{ height: 1, background: `rgba(${team.rgb},0.13)` }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {ranked.map((player) => (
          <PlayerRow key={player.id} player={player} team={team} isMvp={mvpId === player.id} />
        ))}
      </div>
    </div>
  )
}

/* ── Buttons ────────────────────────────────────────────────── */

const PrimaryButton: FC<{ label: string; onClick?: () => void; style?: CSSProperties }> = ({
  label,
  onClick,
  style,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      height: 60,
      borderRadius: 22,
      background: 'var(--color-accent)',
      color: '#fff',
      border: 'none',
      boxShadow: 'var(--shadow-btn-primary)',
      fontFamily: FONT_SANS,
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: 0.1,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {label}
  </button>
)

const GhostButton: FC<{ label: string; onClick?: () => void; style?: CSSProperties }> = ({
  label,
  onClick,
  style,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      height: 60,
      borderRadius: 22,
      background: 'transparent',
      color: 'var(--color-text)',
      border: '1.5px solid var(--color-border-hi)',
      fontFamily: FONT_SANS,
      fontSize: 17,
      fontWeight: 700,
      letterSpacing: 0.1,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}
  >
    {label}
  </button>
)

/* ── Mode / palette helpers ─────────────────────────────────── */

type Mode =
  | { kind: 'winner'; winner: TeamCode; loser: TeamCode }
  | { kind: 'tie' }

function resolveMode(winnerTeam: TeamCode | undefined, a: TeamResult, b: TeamResult): Mode {
  if (!winnerTeam || a.score === b.score) return { kind: 'tie' }
  const loser: TeamCode = winnerTeam === 'A' ? 'B' : 'A'
  return { kind: 'winner', winner: winnerTeam, loser }
}

const NEUTRAL_HEADLINE_SHADOW =
  '0 0 24px rgba(124,58,237,0.45), 0 0 60px rgba(56,189,248,0.25)'

/* ── Mobile ─────────────────────────────────────────────────── */

function GameResultScreenMobile({
  winnerTeam,
  teamA = DEFAULT_TEAM_A,
  teamB = DEFAULT_TEAM_B,
  canPlayAgain = false,
  onPlayAgain,
  onHome,
}: GameResultScreenProps) {
  const mode = resolveMode(winnerTeam, teamA, teamB)
  const confettiPieces = useMemo(makeConfettiPieces, [])

  const winnerResult = mode.kind === 'winner' ? (mode.winner === 'A' ? teamA : teamB) : null
  const loserResult = mode.kind === 'winner' ? (mode.loser === 'A' ? teamA : teamB) : null
  const winnerMeta = mode.kind === 'winner' ? TEAM_META[mode.winner] : null
  const loserMeta = mode.kind === 'winner' ? TEAM_META[mode.loser] : null

  const kicker = mode.kind === 'winner' ? '★ ПОБЕДА ★' : '★ НИЧЬЯ ★'
  const kickerColor = mode.kind === 'winner' ? 'var(--color-warn)' : 'var(--color-text-mute)'
  const headline =
    mode.kind === 'winner' && winnerResult ? winnerResult.label : 'Игра окончена'
  const headlineShadow = winnerMeta ? winnerMeta.textShadow : NEUTRAL_HEADLINE_SHADOW
  const subtext =
    mode.kind === 'winner' && winnerResult && loserResult
      ? `Со счётом ${winnerResult.score} : ${loserResult.score}`
      : `${teamA.score} : ${teamB.score}`

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-bg-deep)',
        fontFamily: FONT_SANS,
        color: 'var(--color-text)',
      }}
    >
      <Ambient />
      {mode.kind === 'winner' ? <Confetti pieces={confettiPieces} /> : null}

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          padding: '60px 20px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Headline */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: kickerColor,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            {kicker}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 60,
              fontWeight: 900,
              color: 'var(--color-text)',
              letterSpacing: -2,
              lineHeight: 1,
              textShadow: headlineShadow,
            }}
          >
            {headline}
          </h1>
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-sec)',
            }}
          >
            {subtext}
          </div>
        </div>

        {/* Winner card */}
        {mode.kind === 'winner' && winnerMeta && winnerResult ? (
          <TeamCard
            team={winnerMeta}
            result={winnerResult}
            isWinner
            showMvp
            scoreFontSize={72}
            padding={24}
            variant="winner"
          />
        ) : null}

        {/* Loser card (winner mode) */}
        {mode.kind === 'winner' && loserMeta && loserResult ? (
          <TeamCard
            team={loserMeta}
            result={loserResult}
            isWinner={false}
            showMvp={false}
            scoreFontSize={40}
            padding={16}
            variant="loser"
          />
        ) : null}

        {/* Tie mode: show both as loser variant (no MVP, no winner badge) */}
        {mode.kind === 'tie' ? (
          <>
            <TeamCard
              team={TEAM_META.A}
              result={teamA}
              isWinner={false}
              showMvp={false}
              scoreFontSize={56}
              padding={20}
              variant="loser"
            />
            <TeamCard
              team={TEAM_META.B}
              result={teamB}
              isWinner={false}
              showMvp={false}
              scoreFontSize={56}
              padding={20}
              variant="loser"
            />
          </>
        ) : null}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {canPlayAgain ? (
            <PrimaryButton
              label="Сыграть снова"
              onClick={onPlayAgain}
              style={{ width: '100%' }}
            />
          ) : null}
          <GhostButton label="На главную" onClick={onHome} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Desktop ────────────────────────────────────────────────── */

function GameResultScreenDesktop({
  winnerTeam,
  teamA = DEFAULT_TEAM_A,
  teamB = DEFAULT_TEAM_B,
  canPlayAgain = false,
  onPlayAgain,
  onHome,
}: GameResultScreenProps) {
  const mode = resolveMode(winnerTeam, teamA, teamB)
  const confettiPieces = useMemo(makeConfettiPieces, [])

  const winnerResult = mode.kind === 'winner' ? (mode.winner === 'A' ? teamA : teamB) : null
  const loserResult = mode.kind === 'winner' ? (mode.loser === 'A' ? teamA : teamB) : null
  const winnerMeta = mode.kind === 'winner' ? TEAM_META[mode.winner] : null
  const loserMeta = mode.kind === 'winner' ? TEAM_META[mode.loser] : null

  const kicker = mode.kind === 'winner' ? '★ ПОБЕДА ★' : '★ НИЧЬЯ ★'
  const kickerColor = mode.kind === 'winner' ? 'var(--color-warn)' : 'var(--color-text-mute)'
  const headline =
    mode.kind === 'winner' && winnerResult ? winnerResult.label : 'Игра окончена'
  const headlineShadow = winnerMeta ? winnerMeta.textShadow : NEUTRAL_HEADLINE_SHADOW
  const subtext =
    mode.kind === 'winner' && winnerResult && loserResult
      ? `Со счётом ${winnerResult.score} : ${loserResult.score}`
      : `${teamA.score} : ${teamB.score}`

  // Tie: A on left, B on right. Winner: winner on left, loser on right.
  const leftMeta = mode.kind === 'winner' ? winnerMeta : TEAM_META.A
  const leftResult = mode.kind === 'winner' ? winnerResult : teamA
  const rightMeta = mode.kind === 'winner' ? loserMeta : TEAM_META.B
  const rightResult = mode.kind === 'winner' ? loserResult : teamB

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        minHeight: '100vh',
        marginLeft: 'calc(50% - 50vw)',
        background: 'var(--color-bg-deep)',
        overflow: 'hidden',
        fontFamily: FONT_SANS,
        color: 'var(--color-text)',
      }}
    >
      <Ambient />
      {mode.kind === 'winner' ? <Confetti pieces={confettiPieces} /> : null}

      <div
        style={{
          position: 'relative',
          zIndex: 3,
          padding: 60,
          minHeight: '100vh',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        {/* Left column */}
        {leftMeta && leftResult ? (
          <TeamCard
            team={leftMeta}
            result={leftResult}
            isWinner={mode.kind === 'winner'}
            showMvp={mode.kind === 'winner'}
            scoreFontSize={96}
            padding={32}
            variant={mode.kind === 'winner' ? 'winner' : 'loser'}
          />
        ) : (
          <div />
        )}

        {/* Center column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: kickerColor,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            {kicker}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 96,
              fontWeight: 900,
              color: 'var(--color-text)',
              letterSpacing: -3,
              lineHeight: 1,
              textShadow: headlineShadow,
            }}
          >
            {headline}
          </h1>
          <div
            style={{
              marginTop: 12,
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--color-text-sec)',
            }}
          >
            {subtext}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 40,
            }}
          >
            {canPlayAgain ? (
              <PrimaryButton
                label="Сыграть снова"
                onClick={onPlayAgain}
                style={{ width: 240 }}
              />
            ) : null}
            <GhostButton label="На главную" onClick={onHome} style={{ width: 240 }} />
          </div>
        </div>

        {/* Right column */}
        {rightMeta && rightResult ? (
          <TeamCard
            team={rightMeta}
            result={rightResult}
            isWinner={false}
            showMvp={false}
            scoreFontSize={60}
            padding={32}
            variant="loser"
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}

export default function GameResultScreen(props: GameResultScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <GameResultScreenDesktop {...props} /> : <GameResultScreenMobile {...props} />
}

export type { GameResultScreenProps, TeamCode, TeamResult, TeamResultPlayer }
