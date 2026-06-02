import { useMemo, type CSSProperties, type FC, type ReactNode } from 'react'
import useBreakpoint from '../hooks/useBreakpoint'
import QRCodeUi from './ui/QRCode'

type LobbyPlayer = {
  name: string
  isHost: boolean
}

type LobbyScreenProps = {
  roomCode?: string
  teamA?: LobbyPlayer[]
  teamB?: LobbyPlayer[]
  maxPlayers?: number
  isHost?: boolean
  wordsExhausted?: boolean
  onStart?: () => void
}

export type { LobbyPlayer, LobbyScreenProps }

const FONT_SANS = 'var(--font-sans)'
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, monospace'

type Team = 'blue' | 'orange'

const TEAM_COLORS: Record<Team, { solid: string; deep: string; rgb: string }> = {
  blue: { solid: '#38BDF8', deep: '#0EA5E9', rgb: '56,189,248' },
  orange: { solid: '#FB923C', deep: '#F97316', rgb: '251,146,60' },
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function copyToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(value).catch(() => undefined)
  }
}

/* ── Ambient background ─────────────────────────────────────── */

const AmbientBg: FC<{ variant: 'mix' | 'win' }> = ({ variant }) => {
  const gradients =
    variant === 'win'
      ? [
          'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(56,189,248,0.40), transparent 65%)',
          'radial-gradient(ellipse 60% 50% at 50% 80%, rgba(124,58,237,0.30), transparent 65%)',
        ]
      : [
          'radial-gradient(ellipse 60% 40% at 20% 0%, rgba(124,58,237,0.35), transparent 60%)',
          'radial-gradient(ellipse 50% 35% at 90% 25%, rgba(56,189,248,0.18), transparent 60%)',
          'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(251,146,60,0.10), transparent 60%)',
        ]
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        background: gradients.join(', '),
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

/* ── Header (kicker + monospace code + kebab) ───────────────── */

const LobbyHeader: FC<{ code: string; onMenu?: () => void }> = ({ code, onMenu }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--color-text-mute)',
          letterSpacing: 1.6,
          textTransform: 'uppercase',
        }}
      >
        Комната
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--color-text)',
          marginTop: 2,
          fontFamily: FONT_MONO,
          letterSpacing: 1.5,
        }}
      >
        {code}
      </div>
    </div>
    <button
      type="button"
      onClick={onMenu}
      aria-label="Меню лобби"
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-sec)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
        <circle cx="9" cy="4" r="1.5" fill="currentColor" />
        <circle cx="14" cy="4" r="1.5" fill="currentColor" />
      </svg>
    </button>
  </div>
)

/* ── PlayerCardLg ───────────────────────────────────────────── */

const PlayerCardLg: FC<{ name: string; team: Team; role?: string; isYou?: boolean }> = ({
  name,
  team,
  role,
  isYou,
}) => {
  const c = TEAM_COLORS[team]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${c.solid}, ${c.deep})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          fontWeight: 700,
          color: '#0A0E1F',
          flexShrink: 0,
        }}
      >
        {getInitial(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          {isYou ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-accent)',
                padding: '2px 6px',
                borderRadius: 6,
                background: 'rgba(124,58,237,0.15)',
                flexShrink: 0,
              }}
            >
              ты
            </span>
          ) : null}
        </div>
        {role ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-sec)', marginTop: 2 }}>{role}</div>
        ) : null}
      </div>
    </div>
  )
}

/* ── PlayerChip (compact) ───────────────────────────────────── */

const PlayerChip: FC<{ name: string; team: Team; isYou?: boolean; host?: boolean }> = ({
  name,
  team,
  isYou,
  host,
}) => {
  const c = TEAM_COLORS[team]
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 36,
        padding: '0 12px 0 6px',
        borderRadius: 999,
        background: `rgba(${c.rgb},0.10)`,
        border: `1px solid rgba(${c.rgb},0.22)`,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${c.solid}, ${c.deep})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#0A0E1F',
          flexShrink: 0,
        }}
      >
        {getInitial(name)}
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{name}</span>
      {isYou ? (
        <span style={{ fontSize: 10, color: c.solid, fontWeight: 700, marginLeft: -2 }}>· ТЫ</span>
      ) : null}
      {host ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 9l1.5-5L6 7l2.5-3L10 9H2z" fill="var(--color-warn)" />
        </svg>
      ) : null}
    </div>
  )
}

/* ── EmptySlot ──────────────────────────────────────────────── */

const EmptySlot: FC<{ label?: string }> = ({ label = 'Ждём игрока…' }) => (
  <div
    style={{
      padding: '14px 16px',
      borderRadius: 16,
      border: '1px dashed var(--color-border)',
      fontSize: 13,
      color: 'var(--color-text-mute)',
      fontWeight: 500,
    }}
  >
    {label}
  </div>
)

/* ── TeamSection ────────────────────────────────────────────── */

const TeamSection: FC<{
  team: Team
  label: string
  count: number
  total: number
  compact?: boolean
  children: ReactNode
}> = ({ team, label, count, total, compact = false, children }) => {
  const c = TEAM_COLORS[team]
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: c.solid,
              boxShadow: `0 0 10px ${c.solid}`,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
        </div>
        <span
          style={{
            fontSize: 12,
            color: c.solid,
            fontWeight: 700,
            fontFamily: FONT_MONO,
          }}
        >
          {count}/{total}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: compact ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: compact ? 6 : 8,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/* ── Copy-link button ───────────────────────────────────────── */

const CopyLinkButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      background: 'rgba(56,189,248,0.10)',
      border: '1px solid rgba(56,189,248,0.25)',
      color: 'var(--color-blue)',
      padding: '12px 16px',
      borderRadius: 14,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
      fontFamily: FONT_SANS,
    }}
  >
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M5 9l4-4M3 7L1 9a2.83 2.83 0 004 4l2-2M7 5l2-2a2.83 2.83 0 014 4l-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
    Скопировать ссылку
  </button>
)

/* ── QR invite card (mobile, waiting state) ─────────────────── */

const QrInviteCard: FC<{ roomCode: string; lobbyUrl: string; onCopy: () => void }> = ({
  roomCode,
  lobbyUrl,
  onCopy,
}) => (
  <div
    style={{
      background: 'var(--color-surface)',
      borderRadius: 24,
      padding: 18,
      border: '1px solid var(--color-border)',
    }}
  >
    <div
      style={{
        fontSize: 13,
        color: 'var(--color-text-sec)',
        fontWeight: 600,
        marginBottom: 14,
        textAlign: 'center',
      }}
    >
      Позови друзей
    </div>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          padding: 6,
          borderRadius: 10,
          background: '#fff',
          display: 'inline-flex',
        }}
      >
        <QRCodeUi size={148} value={lobbyUrl} />
      </div>
    </div>
    <div
      style={{
        fontSize: 12,
        color: 'var(--color-text-mute)',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 1.4,
      }}
    >
      Сканируйте камерой телефона
      <br />
      или введите код{' '}
      <span style={{ color: 'var(--color-text)', fontWeight: 700, fontFamily: FONT_MONO }}>
        {roomCode}
      </span>{' '}
      на главном экране
    </div>
    <div style={{ height: 1, background: 'var(--color-border)', margin: '14px 0' }} />
    <CopyLinkButton onClick={onCopy} />
  </div>
)

/* ── Ready banner (mobile, ready state) ─────────────────────── */

const ReadyBanner: FC<{ totalPlayers: number }> = ({ totalPlayers }) => (
  <div
    style={{
      padding: '14px 16px',
      borderRadius: 18,
      background: 'rgba(34,197,94,0.10)',
      border: '1px solid rgba(34,197,94,0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 999,
        background: 'rgba(34,197,94,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 8l3.5 3.5L13 5"
          stroke="var(--color-success)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
        Комната готова
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-sec)' }}>
        {totalPlayers} игроков · команды сбалансированы
      </div>
    </div>
  </div>
)

/* ── Sticky CTA button ──────────────────────────────────────── */

type CtaKind = 'success' | 'disabled'

const CtaButton: FC<{
  kind: CtaKind
  label: string
  onClick?: () => void
}> = ({ kind, label, onClick }) => {
  const isSuccess = kind === 'success'
  const style: CSSProperties = {
    width: '100%',
    height: 60,
    borderRadius: 22,
    border: '1.5px solid transparent',
    background: isSuccess ? 'var(--color-success)' : 'rgba(255,255,255,0.05)',
    color: isSuccess ? '#02160A' : 'var(--color-text-mute)',
    boxShadow: isSuccess ? 'var(--shadow-btn-success)' : 'none',
    fontFamily: FONT_SANS,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 0.1,
    cursor: isSuccess ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  }
  if (!isSuccess) {
    style.borderColor = 'var(--color-border)'
  }
  return (
    <button type="button" onClick={isSuccess ? onClick : undefined} style={style}>
      {label}
    </button>
  )
}

const StickyCTA: FC<{ kind: CtaKind; label: string; onClick?: () => void }> = ({
  kind,
  label,
  onClick,
}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '12px 20px 30px',
      background:
        'linear-gradient(180deg, rgba(6,8,23,0) 0%, rgba(6,8,23,0.92) 30%, var(--color-bg-deep) 100%)',
      zIndex: 30,
    }}
  >
    <CtaButton kind={kind} label={label} onClick={onClick} />
  </div>
)

/* ── Helpers: assemble team rows ────────────────────────────── */

function renderTeamMembers(
  team: Team,
  players: LobbyPlayer[],
  maxPerTeam: number,
  compact: boolean,
): ReactNode[] {
  const nodes: ReactNode[] = []
  players.forEach((p, i) => {
    if (compact) {
      nodes.push(
        <PlayerChip
          key={`p-${team}-${i}`}
          name={p.name}
          team={team}
          isYou={p.isHost}
          host={p.isHost}
        />,
      )
    } else {
      nodes.push(
        <PlayerCardLg
          key={`p-${team}-${i}`}
          name={p.name}
          team={team}
          role={p.isHost ? 'Организатор · ты' : undefined}
          isYou={p.isHost}
        />,
      )
    }
  })
  if (!compact) {
    const empty = Math.max(0, maxPerTeam - players.length)
    for (let i = 0; i < empty; i += 1) {
      nodes.push(
        <EmptySlot key={`e-${team}-${i}`} label={players.length === 0 && i === 0 ? 'Пока никого' : 'Ждём игрока…'} />,
      )
    }
  }
  return nodes
}

/* ── Demo defaults ──────────────────────────────────────────── */

const DEMO_A: LobbyPlayer[] = [
  { name: 'Паша', isHost: true },
  { name: 'Маша', isHost: false },
]

const DEMO_B: LobbyPlayer[] = [
  { name: 'Алёша', isHost: false },
  { name: 'Петя', isHost: false },
]

/* ── Mobile lobby ───────────────────────────────────────────── */

function LobbyScreenMobile({
  roomCode = 'AF9LAL',
  teamA = DEMO_A,
  teamB = DEMO_B,
  maxPlayers = 5,
  isHost = true,
  wordsExhausted = false,
  onStart,
}: LobbyScreenProps) {
  const totalPlayers = teamA.length + teamB.length
  const canStart = isHost && teamA.length >= 2 && teamB.length >= 2
  const compact = totalPlayers >= 6
  const ready = totalPlayers >= 4

  const lobbyUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
    return `${base}/lobby/${roomCode}`
  }, [roomCode])

  const handleCopy = () => copyToClipboard(lobbyUrl)
  const handleMenu = () => {
    // eslint-disable-next-line no-console
    console.log('lobby menu')
  }

  let ctaKind: CtaKind = 'disabled'
  let ctaLabel = `Нужно ещё ${Math.max(0, 4 - totalPlayers)} игрока`
  if (wordsExhausted) {
    ctaKind = 'disabled'
    ctaLabel = 'Все слова разыграны. На главную'
  } else if (canStart) {
    ctaKind = 'success'
    ctaLabel = 'Начать игру'
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        minHeight: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-bg-deep)',
        fontFamily: FONT_SANS,
        color: 'var(--color-text)',
      }}
    >
      <AmbientBg variant={ready ? 'win' : 'mix'} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '24px 20px 110px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          zIndex: 1,
        }}
      >
        <LobbyHeader code={roomCode} onMenu={handleMenu} />

        {ready ? (
          <ReadyBanner totalPlayers={totalPlayers} />
        ) : (
          <QrInviteCard roomCode={roomCode} lobbyUrl={lobbyUrl} onCopy={handleCopy} />
        )}

        <div
          style={{
            marginTop: ready ? 0 : 16,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
              {totalPlayers}
            </span>
            <span style={{ fontSize: 14, color: 'var(--color-text-mute)', fontWeight: 500 }}>
              {' '}/ {maxPlayers * 2} игроков
            </span>
          </div>
          {!ready ? (
            <span style={{ fontSize: 13, color: 'var(--color-warn)', fontWeight: 600 }}>
              Нужно ещё {Math.max(0, 4 - totalPlayers)} для старта
            </span>
          ) : null}
        </div>

        <TeamSection
          team="blue"
          label="Синяя команда"
          count={teamA.length}
          total={maxPlayers}
          compact={compact}
        >
          {renderTeamMembers('blue', teamA, maxPlayers, compact)}
        </TeamSection>
        <div style={{ height: 14 }} />
        <TeamSection
          team="orange"
          label="Оранжевая команда"
          count={teamB.length}
          total={maxPlayers}
          compact={compact}
        >
          {renderTeamMembers('orange', teamB, maxPlayers, compact)}
        </TeamSection>
      </div>

      <StickyCTA kind={ctaKind} label={ctaLabel} onClick={onStart} />
    </div>
  )
}

/* ── Desktop team column ────────────────────────────────────── */

const DesktopTeamCol: FC<{
  team: Team
  label: string
  players: LobbyPlayer[]
  maxPerTeam: number
}> = ({ team, label, players, maxPerTeam }) => {
  const c = TEAM_COLORS[team]
  const teamSoftBg =
    team === 'blue' ? 'var(--color-blue-soft)' : 'var(--color-orange-soft)'
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 24,
        background: teamSoftBg,
        border: `1px solid rgba(${c.rgb},0.25)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: c.solid,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              textShadow: `0 0 14px ${c.solid}`,
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: 14,
            color: c.solid,
            fontWeight: 800,
            fontFamily: FONT_MONO,
          }}
        >
          {players.length}/{maxPerTeam}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {renderTeamMembers(team, players, maxPerTeam, false)}
      </div>
    </div>
  )
}

/* ── Desktop lobby ──────────────────────────────────────────── */

function LobbyScreenDesktop({
  roomCode = 'AF9LAL',
  teamA = DEMO_A,
  teamB = DEMO_B,
  maxPlayers = 5,
  isHost = true,
  wordsExhausted = false,
  onStart,
}: LobbyScreenProps) {
  const totalPlayers = teamA.length + teamB.length
  const canStart = isHost && totalPlayers >= 4
  const ready = totalPlayers >= 4

  const lobbyUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
    return `${base}/lobby/${roomCode}`
  }, [roomCode])

  const handleCopy = () => copyToClipboard(lobbyUrl)

  const kicker = ready ? 'Лобби · можно начинать' : 'Лобби · ожидание игроков'
  const title = ready
    ? `${totalPlayers} игроков · можно начинать`
    : `${totalPlayers} игроков · ждём ещё ${Math.max(0, 4 - totalPlayers)}`

  let ctaKind: CtaKind = 'disabled'
  let ctaLabel = `Нужно ещё ${Math.max(0, 4 - totalPlayers)} игрока`
  if (wordsExhausted) {
    ctaKind = 'disabled'
    ctaLabel = 'Все слова разыграны. На главную'
  } else if (canStart) {
    ctaKind = 'success'
    ctaLabel = 'Начать игру'
  }

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
      <AmbientBg variant={ready ? 'win' : 'mix'} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          padding: 40,
          gap: 32,
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: invite panel */}
        <div
          style={{
            padding: 28,
            borderRadius: 28,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            alignSelf: 'start',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-text-mute)',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
              }}
            >
              Код комнаты
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: 'var(--color-text)',
                marginTop: 6,
                fontFamily: FONT_MONO,
                letterSpacing: 4,
              }}
            >
              {roomCode}
            </div>
          </div>
          <div
            style={{
              padding: 20,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                padding: 8,
                borderRadius: 12,
                background: '#fff',
                display: 'inline-flex',
              }}
            >
              <QRCodeUi size={220} value={lobbyUrl} />
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-sec)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Сканируйте камерой телефона
            </div>
          </div>
          <CopyLinkButton onClick={handleCopy} />
        </div>

        {/* Right: teams + start */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-text-mute)',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                {kicker}
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: 'var(--color-text)',
                  marginTop: 4,
                  letterSpacing: -0.5,
                }}
              >
                {title}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--color-text)' }}>
                {totalPlayers}
              </span>
              <span style={{ fontSize: 16, color: 'var(--color-text-mute)', fontWeight: 500 }}>
                / {maxPlayers * 2}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              flex: 1,
              minHeight: 0,
            }}
          >
            <DesktopTeamCol
              team="blue"
              label="Синяя команда"
              players={teamA}
              maxPerTeam={maxPlayers}
            />
            <DesktopTeamCol
              team="orange"
              label="Оранжевая команда"
              players={teamB}
              maxPerTeam={maxPlayers}
            />
          </div>

          <div>
            <CtaButton kind={ctaKind} label={ctaLabel} onClick={onStart} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Default export ─────────────────────────────────────────── */

export default function LobbyScreen(props: LobbyScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <LobbyScreenDesktop {...props} /> : <LobbyScreenMobile {...props} />
}
