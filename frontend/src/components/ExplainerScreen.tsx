import { motion, type PanInfo } from 'framer-motion'
import useBreakpoint from '../hooks/useBreakpoint'

type ExplainerScreenProps = {
  teamAScore?: number
  teamBScore?: number
  timeRemaining?: number
  word?: string
  hint?: string
  isRoundActive?: boolean
  canStartRound?: boolean
  roundNumber?: number
  activeTeam?: 'A' | 'B'
  myName?: string
  myTeam?: 'A' | 'B'
  myRole?: 'explainer' | 'guesser' | 'spectator'
  teamAPlayers?: Array<{ id: string; name: string; connected: boolean; role: 'explainer' | 'guesser' | 'spectator' }>
  teamBPlayers?: Array<{ id: string; name: string; connected: boolean; role: 'explainer' | 'guesser' | 'spectator' }>
  onStartRound?: () => void
  onGuessed?: () => void
  onSkipped?: () => void
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

function DownArrowSvg({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1v8M4 7l3 3 3-3M2 12h10" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LightbulbSvg({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1a4 4 0 014 4c0 2-2 3-2 4.5V11H5V9.5C5 8 3 7 3 5a4 4 0 014-4zM5.5 13h3" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckSvg({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10l5 5L17 5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossSvg({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4l10 10M14 4L4 14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
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
      <DownArrowSvg size={iconSize} color="currentColor" />
      Ты объясняешь · {meta.label} команда
    </div>
  )
}

// Picks a font size that lets the word fit on a single line whenever possible.
// "Length" is measured by the longest whitespace-separated token, not the whole
// string — multi-word phrases ("ТОКСИЧНАЯ ПОЗИТИВНОСТЬ") wrap at the space and
// don't deserve to be shrunk as if they were one giant token.
function pickWordFontSize(word: string, isDesktop: boolean): number {
  const tokens = word.trim().split(/\s+/).filter(Boolean)
  const longestToken = tokens.reduce((max, t) => Math.max(max, t.length), 0)
  const len = Math.max(longestToken, 1)
  if (isDesktop) {
    if (len <= 5) return 112
    if (len <= 7) return 92
    if (len <= 10) return 72
    if (len <= 13) return 56
    if (len <= 16) return 44
    return 36
  }
  if (len <= 5) return 60
  if (len <= 7) return 48
  if (len <= 10) return 38
  if (len <= 13) return 30
  if (len <= 16) return 26
  return 22
}

function WordCard({
  word,
  hint,
  size = 'mobile',
}: {
  word: string
  hint?: string
  size?: 'mobile' | 'desktop'
}) {
  const isDesktop = size === 'desktop'
  const normalizedHint = hint?.trim() ?? ''
  const wordFontSize = pickWordFontSize(word, isDesktop)
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--color-surface-hi), var(--color-surface))',
        borderRadius: isDesktop ? 36 : 32,
        padding: isDesktop ? '56px 40px 36px' : '32px 20px 22px',
        border: '1.5px solid var(--color-border-hi)',
        boxShadow: isDesktop
          ? '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        width: '100%',
        maxWidth: isDesktop ? 580 : undefined,
        position: 'relative',
        fontFamily: FONT_STACK,
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
          marginBottom: isDesktop ? 20 : 14,
        }}
      >
        Слово
      </div>
      <div
        style={{
          fontSize: wordFontSize,
          fontWeight: 900,
          color: 'var(--color-text)',
          textAlign: 'center',
          letterSpacing: isDesktop ? -wordFontSize * 0.025 : -wordFontSize * 0.02,
          lineHeight: 1.05,
          textShadow: isDesktop ? '0 8px 60px rgba(124,58,237,0.5)' : '0 4px 30px rgba(124,58,237,0.4)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          hyphens: 'auto',
        }}
      >
        {word}
      </div>
      {normalizedHint ? (
        <>
          <div
            style={{
              height: 1,
              background: 'var(--color-border)',
              margin: isDesktop ? '36px 0 22px' : '24px -8px 16px',
            }}
          />
          <div style={{ display: 'flex', gap: isDesktop ? 12 : 10, alignItems: 'flex-start' }}>
            <div
              style={{
                width: isDesktop ? 32 : 28,
                height: isDesktop ? 32 : 28,
                borderRadius: isDesktop ? 9 : 8,
                background: 'rgba(250,204,21,0.15)',
                border: '1px solid rgba(250,204,21,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LightbulbSvg size={isDesktop ? 16 : 14} color="var(--color-warn)" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-warn)',
                  fontWeight: 700,
                  letterSpacing: isDesktop ? 1.4 : 1.2,
                  textTransform: 'uppercase',
                  marginBottom: isDesktop ? 4 : 3,
                }}
              >
                Подсказка
              </div>
              <div
                style={{
                  fontSize: isDesktop ? 18 : 16,
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  lineHeight: 1.4,
                }}
              >
                {normalizedHint}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function StartRoundButton({
  onClick,
  size = 'mobile',
}: {
  onClick?: () => void
  size?: 'mobile' | 'desktop'
}) {
  const isDesktop = size === 'desktop'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        maxWidth: isDesktop ? 580 : undefined,
        height: 60,
        borderRadius: 22,
        background: 'var(--color-accent)',
        color: '#fff',
        border: '1.5px solid transparent',
        boxShadow: '0 8px 24px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        fontFamily: FONT_STACK,
        fontSize: 17,
        fontWeight: 700,
        letterSpacing: 0.1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      Начать раунд
    </button>
  )
}

function SkipButton({
  onClick,
  disabled,
  size = 'mobile',
}: {
  onClick?: () => void
  disabled?: boolean
  size?: 'mobile' | 'desktop'
}) {
  const isDesktop = size === 'desktop'
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        flex: 1,
        height: isDesktop ? 70 : 64,
        borderRadius: isDesktop ? 24 : 22,
        background: 'rgba(239,68,68,0.12)',
        border: '1.5px solid rgba(239,68,68,0.35)',
        color: 'var(--color-danger)',
        fontSize: isDesktop ? 18 : 16,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT_STACK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <CrossSvg size={isDesktop ? 20 : 18} color="currentColor" />
      Пропустить
      {isDesktop ? (
        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>(↓)</span>
      ) : null}
    </button>
  )
}

function GuessedButton({
  onClick,
  disabled,
  size = 'mobile',
}: {
  onClick?: () => void
  disabled?: boolean
  size?: 'mobile' | 'desktop'
}) {
  const isDesktop = size === 'desktop'
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        flex: 1.4,
        height: isDesktop ? 70 : 64,
        borderRadius: isDesktop ? 24 : 22,
        background: 'var(--color-success)',
        border: 'none',
        color: '#02160A',
        fontSize: isDesktop ? 19 : 17,
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: FONT_STACK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        boxShadow: '0 12px 30px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <CheckSvg size={isDesktop ? 22 : 20} color="currentColor" />
      Угадали
      {isDesktop ? (
        <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 600 }}></span>
      ) : null}
    </button>
  )
}

function ExplainerScreenMobile({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  word = '',
  hint,
  isRoundActive = true,
  canStartRound = false,
  roundNumber = 1,
  activeTeam = 'A',
  onStartRound,
  onGuessed,
  onSkipped,
}: ExplainerScreenProps) {
  const showWord = isRoundActive && Boolean(word.trim())
  const showStart = canStartRound && !isRoundActive
  const upperWord = word.trim().toUpperCase()

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
          <RoleBanner team={activeTeam} size="mobile" />
        </div>

        {/* center area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingBottom: !showStart ? 110 : 0,
          }}
        >
          {showStart ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <StartRoundButton onClick={onStartRound} size="mobile" />
            </div>
          ) : showWord ? (
            <>
              <div
                style={{
                  maxHeight: 'calc(100dvh - 280px)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {isRoundActive && onGuessed && onSkipped ? (
                  <motion.div
                    key={word}
                    drag="y"
                    dragConstraints={{ top: -200, bottom: 200 }}
                    dragElastic={0.2}
                    dragSnapToOrigin
                    whileDrag={{ scale: 0.98 }}
                    onDragEnd={(_event, info: PanInfo) => {
                      if (info.offset.y < -80 || info.velocity.y < -500) {
                        onGuessed?.()
                      } else if (info.offset.y > 80 || info.velocity.y > 500) {
                        onSkipped?.()
                      }
                    }}
                    style={{ width: '100%', touchAction: 'none' }}
                  >
                    <WordCard word={upperWord} hint={hint} size="mobile" />
                  </motion.div>
                ) : (
                  <WordCard word={upperWord} hint={hint} size="mobile" />
                )}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 16,
                  fontSize: 12,
                  color: 'var(--color-text-mute)',
                  fontWeight: 500,
                }}
              >
                Свайп вверх — угадали · вниз — пропустить
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                fontSize: 14,
                color: 'var(--color-text-mute)',
                fontWeight: 600,
              }}
            >
              Ждём начала раунда…
            </div>
          )}
        </div>

        {/* action buttons (sticky bottom strip) */}
        {!showStart ? (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 20px 30px',
              zIndex: 5,
              background:
                'linear-gradient(180deg, rgba(6,8,23,0) 0%, rgba(6,8,23,0.92) 30%, var(--color-bg) 100%)',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
              <SkipButton onClick={onSkipped} disabled={!isRoundActive} size="mobile" />
              <GuessedButton onClick={onGuessed} disabled={!isRoundActive} size="mobile" />
            </div>
          </div>
        ) : null}
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

function ExplainerScreenDesktop({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  word = '',
  hint,
  isRoundActive = true,
  canStartRound = false,
  roundNumber = 1,
  activeTeam = 'A',
  teamAPlayers = [],
  teamBPlayers = [],
  onStartRound,
  onGuessed,
  onSkipped,
}: ExplainerScreenProps) {
  const showWord = isRoundActive && Boolean(word.trim())
  const showStart = canStartRound && !isRoundActive
  const upperWord = word.trim().toUpperCase()
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

          <RoleBanner team={activeTeam} size="desktop" />

          {showStart ? (
            <StartRoundButton onClick={onStartRound} size="desktop" />
          ) : showWord ? (
            <>
              <WordCard word={upperWord} hint={hint} size="desktop" />
              <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 580 }}>
                <SkipButton onClick={onSkipped} disabled={!isRoundActive} size="desktop" />
                <GuessedButton onClick={onGuessed} disabled={!isRoundActive} size="desktop" />
              </div>
            </>
          ) : (
            <div
              style={{
                fontSize: 16,
                color: 'var(--color-text-mute)',
                fontWeight: 600,
                marginTop: 12,
              }}
            >
              Ждём начала раунда…
            </div>
          )}
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

export default function ExplainerScreen(props: ExplainerScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <ExplainerScreenDesktop {...props} /> : <ExplainerScreenMobile {...props} />
}

export type { ExplainerScreenProps }
