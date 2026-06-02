import { useEffect } from 'react'
import useBreakpoint from '../hooks/useBreakpoint'

type GuesserScreenProps = {
  teamAScore?: number
  teamBScore?: number
  timeRemaining?: number
  explainerName?: string
  isRoundActive?: boolean
  roundNumber?: number
  activeTeam?: 'A' | 'B'
  myName?: string
  myTeam?: 'A' | 'B'
  myRole?: 'explainer' | 'guesser' | 'spectator'
  teamAPlayers?: Array<{ id: string; name: string; connected: boolean; role: 'explainer' | 'guesser' | 'spectator' }>
  teamBPlayers?: Array<{ id: string; name: string; connected: boolean; role: 'explainer' | 'guesser' | 'spectator' }>
  onCorrect?: () => void
  onSkip?: () => void
}

type TeamKey = 'A' | 'B'

const FONT_STACK = "var(--font-sans, Inter, system-ui, sans-serif)"
const FONT_MONO = "var(--font-mono, ui-monospace, 'SF Mono', Menlo, monospace)"

const TEAM_META: Record<TeamKey, { label: string; cssColor: string; ambientTop: string; ambientMid: string; soft: string; border: string; deep: string }> = {
  A: {
    label: 'Синяя',
    cssColor: 'var(--color-blue)',
    ambientTop: 'rgba(56,189,248,0.32)',
    ambientMid: 'rgba(124,58,237,0.20)',
    soft: 'rgba(56,189,248,0.14)',
    border: 'rgba(56,189,248,0.3)',
    deep: 'var(--color-blue-deep)',
  },
  B: {
    label: 'Оранжевая',
    cssColor: 'var(--color-orange)',
    ambientTop: 'rgba(251,146,60,0.32)',
    ambientMid: 'rgba(124,58,237,0.20)',
    soft: 'rgba(251,146,60,0.14)',
    border: 'rgba(251,146,60,0.3)',
    deep: 'var(--color-orange-deep)',
  },
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(safe / 60)
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function Ambient({ team }: { team: TeamKey }) {
  const meta = TEAM_META[team]
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: [
          `radial-gradient(ellipse 80% 60% at 50% 0%, ${meta.ambientTop}, transparent 65%)`,
          `radial-gradient(ellipse 50% 40% at 80% 60%, ${meta.ambientMid}, transparent 65%)`,
        ].join(', '),
      }}
    />
  )
}

function MicSvg({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1a3 3 0 013 3v3a3 3 0 01-6 0V4a3 3 0 013-3z" fill={color} />
    </svg>
  )
}

function EyeSvg({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 5a4 4 0 018 0v2a4 4 0 01-8 0V5z" stroke={color} strokeWidth="1.4" />
    </svg>
  )
}

function HeadphonesSvg({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 9V7a5 5 0 0110 0v2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="1" y="8.5" width="2.5" height="4.5" rx="1.25" fill={color} />
      <rect x="10.5" y="8.5" width="2.5" height="4.5" rx="1.25" fill={color} />
    </svg>
  )
}

function ScoreMini({ teamAScore, teamBScore, activeTeam }: { teamAScore: number; teamBScore: number; activeTeam: TeamKey }) {
  const aActive = activeTeam === 'A'
  const bActive = activeTeam === 'B'
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 36,
        padding: '0 10px 0 6px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
        gap: 8,
        fontFamily: FONT_STACK,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'var(--color-blue)',
            boxShadow: aActive ? '0 0 8px var(--color-blue)' : 'none',
          }}
        />
        <span
          style={{
            fontSize: aActive ? 16 : 14,
            fontWeight: aActive ? 700 : 600,
            color: aActive ? 'var(--color-text)' : 'var(--color-text-mute)',
            lineHeight: 1,
          }}
        >
          {teamAScore}
        </span>
      </span>
      <span style={{ width: 1, height: 18, background: 'var(--color-border)' }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: 'var(--color-orange)',
            boxShadow: bActive ? '0 0 8px var(--color-orange)' : 'none',
          }}
        />
        <span
          style={{
            fontSize: bActive ? 16 : 14,
            fontWeight: bActive ? 700 : 600,
            color: bActive ? 'var(--color-text)' : 'var(--color-text-mute)',
            lineHeight: 1,
          }}
        >
          {teamBScore}
        </span>
      </span>
    </div>
  )
}

function MobileTimer({ seconds }: { seconds: number }) {
  const safe = Math.max(0, seconds)
  const urgent = safe <= 10
  return (
    <span
      style={{
        fontSize: 40,
        fontWeight: 900,
        color: urgent ? 'var(--color-danger)' : 'var(--color-text)',
        fontFamily: FONT_MONO,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: -0.5,
        lineHeight: 1,
        animation: urgent ? 'pulse 0.65s infinite' : undefined,
      }}
    >
      {formatTime(safe)}
    </span>
  )
}

function RoleBanner({ team, size = 'mobile' }: { team: TeamKey; size?: 'mobile' | 'desktop' }) {
  const meta = TEAM_META[team]
  const fontSize = size === 'desktop' ? 16 : 13
  const padding = size === 'desktop' ? '12px 22px' : '8px 16px'
  const iconSize = size === 'desktop' ? 16 : 14
  return (
    <div
      style={{
        alignSelf: 'center',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding,
        borderRadius: 999,
        background: meta.soft,
        border: `1px solid ${meta.border}`,
        color: meta.cssColor,
        fontSize,
        fontWeight: 700,
        fontFamily: FONT_STACK,
      }}
    >
      <HeadphonesSvg size={iconSize} color="currentColor" />
      Ты угадываешь · {meta.label} команда
    </div>
  )
}

function ExplainerStatusPill({
  team,
  explainerName,
  size = 'mobile',
}: {
  team: TeamKey
  explainerName: string
  size?: 'mobile' | 'desktop'
}) {
  const meta = TEAM_META[team]
  const isDesktop = size === 'desktop'
  return (
    <div
      style={{
        alignSelf: 'center',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: isDesktop ? 32 : 28,
        padding: isDesktop ? '6px 16px' : '5px 14px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--color-border)',
        fontFamily: FONT_STACK,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: meta.cssColor,
          boxShadow: `0 0 8px ${meta.cssColor}`,
          animation: 'dotPulse 1.2s ease-in-out infinite',
        }}
      />
      <span
        style={{
          fontSize: isDesktop ? 12 : 11,
          fontWeight: 700,
          color: 'var(--color-text-mute)',
          letterSpacing: isDesktop ? 1.3 : 1.2,
          textTransform: 'uppercase',
        }}
      >
        Объясняет
      </span>
      <span
        style={{
          fontSize: isDesktop ? 12 : 11,
          fontWeight: 900,
          color: meta.cssColor,
        }}
      >
        {explainerName}
      </span>
    </div>
  )
}

function ListenCard({
  isRoundActive,
  size = 'mobile',
}: {
  isRoundActive: boolean
  size?: 'mobile' | 'desktop'
}) {
  const isDesktop = size === 'desktop'
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--color-surface-hi), var(--color-surface))',
        borderRadius: isDesktop ? 36 : 32,
        padding: isDesktop ? '64px 64px 40px' : '36px 24px 22px',
        border: '1.5px solid var(--color-border-hi)',
        boxShadow: isDesktop
          ? '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        width: '100%',
        maxWidth: isDesktop ? 580 : undefined,
        position: 'relative',
        fontFamily: FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontSize: isDesktop ? 12 : 11,
          color: 'var(--color-text-mute)',
          letterSpacing: isDesktop ? 1.6 : 1.4,
          textTransform: 'uppercase',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: isDesktop ? 28 : 20,
        }}
      >
        Что объясняют
      </div>
      {isRoundActive ? (
        <div
          style={{
            fontSize: isDesktop ? 96 : 48,
            fontWeight: 900,
            color: 'var(--color-text-mute)',
            textAlign: 'center',
            letterSpacing: '0.2em',
            lineHeight: 1,
          }}
        >
          ● ● ●
        </div>
      ) : (
        <div
          style={{
            fontSize: isDesktop ? 28 : 28,
            fontWeight: 700,
            color: 'var(--color-text-mute)',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          Раунд не идёт
        </div>
      )}
      <div
        style={{
          marginTop: isDesktop ? 24 : 18,
          fontSize: isDesktop ? 16 : 13,
          fontWeight: 500,
          color: 'var(--color-text-sec)',
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 1.4,
        }}
      >
        Слушай объясняющего и предлагай команде варианты
      </div>
    </div>
  )
}

function GuesserScreenMobile({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  explainerName = '—',
  isRoundActive = true,
  roundNumber = 1,
  activeTeam = 'A',
  myTeam = 'A',
}: GuesserScreenProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100dvh',
        minHeight: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        fontFamily: FONT_STACK,
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <Ambient team={activeTeam} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '60px 20px 30px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
        }}
      >
        {/* top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            gap: 8,
          }}
        >
          <ScoreMini teamAScore={teamAScore} teamBScore={teamBScore} activeTeam={activeTeam} />
          <MobileTimer seconds={timeRemaining} />
          <span style={{ fontSize: 13, color: 'var(--color-text-mute)', fontWeight: 600 }}>
            Раунд {Math.max(1, roundNumber)}
          </span>
        </div>

        {/* role banner */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <RoleBanner team={myTeam} size="mobile" />
        </div>

        {/* explainer status */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <ExplainerStatusPill team={activeTeam} explainerName={explainerName} size="mobile" />
        </div>

        {/* center listen card */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ListenCard isRoundActive={isRoundActive} size="mobile" />
          <div
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontSize: 12,
              color: 'var(--color-text-mute)',
              fontWeight: 500,
            }}
          >
            Услышал слово — крикни! Очки начислит объясняющий
          </div>
        </div>
      </div>
    </div>
  )
}

function DesktopGameSidebar({
  team,
  score,
  active,
  players,
}: {
  team: TeamKey
  score: number
  active: boolean
  players: Array<{ id: string; name: string; connected: boolean; role: 'explainer' | 'guesser' | 'spectator' }>
}) {
  const meta = TEAM_META[team]
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 24,
        background: active
          ? team === 'A'
            ? 'var(--color-blue-soft)'
            : 'var(--color-orange-soft)'
          : 'rgba(255,255,255,0.02)',
        border: `1.5px solid ${active ? `${meta.cssColor}55` : 'var(--color-border)'}`,
        boxShadow: active
          ? team === 'A'
            ? '0 8px 30px rgba(56,189,248,0.2)'
            : '0 8px 30px rgba(251,146,60,0.2)'
          : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        fontFamily: FONT_STACK,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: meta.cssColor,
              boxShadow: active ? `0 0 12px ${meta.cssColor}` : 'none',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: meta.cssColor,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {meta.label.toUpperCase()}
          </span>
          {active ? (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 700,
                color: meta.cssColor,
                padding: '2px 8px',
                borderRadius: 999,
                background: team === 'A' ? 'rgba(56,189,248,0.12)' : 'rgba(251,146,60,0.12)',
                border: `1px solid ${team === 'A' ? 'rgba(56,189,248,0.27)' : 'rgba(251,146,60,0.27)'}`,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              играет
            </span>
          ) : null}
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: 'var(--color-text)',
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          {score}
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--color-border)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-mute)', fontWeight: 500 }}>
            Нет игроков
          </div>
        ) : (
          players.map((p) => {
            const isExplaining = p.role === 'explainer'
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: isExplaining ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isExplaining ? 'var(--color-border-hi)' : 'var(--color-border)'}`,
                  opacity: p.connected ? 1 : 0.55,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${meta.cssColor}, ${meta.deep})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#0A0E1F',
                  }}
                >
                  {getInitial(p.name)}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </span>
                {p.role === 'explainer' ? (
                  <MicSvg size={14} color={meta.cssColor} />
                ) : p.role === 'guesser' ? (
                  <EyeSvg size={14} color={meta.cssColor} />
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function GuesserScreenDesktop({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  explainerName = '—',
  isRoundActive = true,
  roundNumber = 1,
  activeTeam = 'A',
  myTeam = 'A',
  teamAPlayers = [],
  teamBPlayers = [],
  onCorrect,
  onSkip,
}: GuesserScreenProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === ' ') {
        event.preventDefault()
        onCorrect?.()
      }

      if (event.key === 'ArrowDown' || event.key === 'Escape') {
        event.preventDefault()
        onSkip?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCorrect, onSkip])

  const safe = Math.max(0, timeRemaining)
  const urgent = safe <= 10

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minHeight: '640px',
        marginLeft: 'calc(50% - 50vw)',
        overflow: 'hidden',
        fontFamily: FONT_STACK,
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
      }}
    >
      <Ambient team={activeTeam} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          gridTemplateColumns: '280px 1fr 280px',
          padding: 32,
          gap: 24,
          zIndex: 1,
        }}
      >
        <DesktopGameSidebar
          team="A"
          score={teamAScore}
          active={activeTeam === 'A'}
          players={teamAPlayers}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span
              style={{
                fontSize: 13,
                color: 'var(--color-text-mute)',
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Раунд {Math.max(1, roundNumber)}
            </span>
            <div
              style={{
                padding: '12px 28px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--color-border)',
                fontSize: 56,
                fontWeight: 900,
                color: urgent ? 'var(--color-danger)' : 'var(--color-text)',
                letterSpacing: -2,
                fontFamily: FONT_MONO,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
                animation: urgent ? 'pulse 0.65s infinite' : undefined,
              }}
            >
              {formatTime(safe)}
            </div>
          </div>

          <RoleBanner team={myTeam} size="desktop" />

          <ExplainerStatusPill team={activeTeam} explainerName={explainerName} size="desktop" />

          <ListenCard isRoundActive={isRoundActive} size="desktop" />
        </div>

        <DesktopGameSidebar
          team="B"
          score={teamBScore}
          active={activeTeam === 'B'}
          players={teamBPlayers}
        />
      </div>
    </div>
  )
}

export default function GuesserScreen(props: GuesserScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <GuesserScreenDesktop {...props} /> : <GuesserScreenMobile {...props} />
}

export type { GuesserScreenProps }
