import { useEffect } from 'react'
import { motion } from 'framer-motion'
import useBreakpoint from '../hooks/useBreakpoint'
import C from '../constants/colors'

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

function ScorePill({ label, score, color, reverse, compact = false }: { label: string; score: number; color: string; reverse?: boolean; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px', flexDirection: reverse ? 'row-reverse' : 'row', padding: compact ? '7px 10px' : '8px 16px', borderRadius: compact ? '12px' : '14px', border: `1px solid ${color}30`, background: 'linear-gradient(135deg,rgba(8,8,28,0.88) 0%,rgba(16,8,40,0.92) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: `0 0 0 1px ${color}20,0 4px 20px rgba(0,0,0,0.55),0 0 24px ${color}18,inset 0 1px 0 rgba(255,255,255,0.07)` }}>
      <span style={{ fontSize: compact ? '7px' : '9px', fontWeight: 900, letterSpacing: compact ? '0.12em' : '0.16em', color: `${color}99`, textTransform: 'uppercase', lineHeight: 1 }}>{label}</span>
      <div style={{ width: '1px', height: compact ? '16px' : '18px', background: `${color}28`, flexShrink: 0 }} />
      <span style={{ fontSize: compact ? '20px' : '26px', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 14px ${color}cc,0 0 30px ${color}55` }}>{score}</span>
    </div>
  )
}

function Timer({ seconds, compact = false }: { seconds: number; compact?: boolean }) {
  const urgent = seconds <= 10
  const color = urgent ? C.red : C.blue
  const mm = Math.floor(Math.max(0, seconds) / 60)
  const ss = String(Math.max(0, seconds) % 60).padStart(2, '0')

  return (
    <motion.div animate={urgent ? { scale: [1, 1.1, 1] } : { scale: 1 }} transition={urgent ? { repeat: Infinity, duration: 0.65 } : {}} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: '-16px', background: `radial-gradient(circle,${color}40 0%,transparent 70%)`, filter: 'blur(12px)', pointerEvents: 'none' }} />
      <span style={{ fontSize: compact ? '30px' : '40px', fontWeight: 900, letterSpacing: '-0.03em', color, textShadow: `0 0 18px ${color},0 0 42px ${color}80`, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
        {mm}:{ss}
      </span>
    </motion.div>
  )
}

function RoundTimerPill({ roundNum, seconds }: { roundNum: number; seconds: number }) {
  const safeSeconds = Math.max(0, seconds)
  const urgent = safeSeconds <= 10
  const tColor = urgent ? C.red : '#fff'
  const mm = Math.floor(safeSeconds / 60)
  const ss = String(safeSeconds % 60).padStart(2, '0')

  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={urgent ? { repeat: Infinity, duration: 0.65 } : {}}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        borderRadius: '9999px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg,rgba(14,10,44,0.92),rgba(8,6,28,0.96))',
        border: `1.5px solid ${urgent ? `${C.red}60` : `${C.purple}50`}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 0 0 1px ${urgent ? C.red : C.purple}20,0 4px 24px rgba(0,0,0,0.5),0 0 30px ${urgent ? C.red : C.purple}20`,
      }}
    >
      <div style={{ padding: '10px 20px 10px 22px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.purple, textShadow: `0 0 10px ${C.purple}` }}>
          РАУНД {Math.max(1, roundNum)}
        </span>
      </div>
      <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)' }} />
      <div style={{ padding: '10px 22px 10px 20px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: tColor, textShadow: `0 0 18px ${urgent ? C.red : '#ffffff80'}` }}>
          {mm}:{ss}
        </span>
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

function MicIcon({ size = 11, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="1" width="6" height="9" rx="3" fill={color} fillOpacity="0.9" />
      <path d="M2.5 8.5C2.5 11.5376 5.18629 14 8 14C10.8137 14 13.5 11.5376 13.5 8.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="14" x2="8" y2="15.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function HeadphonesIcon({ size = 13, color = 'rgba(255,255,255,0.45)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 10V8a6 6 0 0112 0v2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="1" y="9.5" width="3" height="5" rx="1.5" fill={color} />
      <rect x="12" y="9.5" width="3" height="5" rx="1.5" fill={color} />
    </svg>
  )
}

function GuesserScreenMobile({
  teamAScore = 0,
  teamBScore = 0,
  timeRemaining = 0,
  explainerName = '—',
  isRoundActive = true,
}: GuesserScreenProps) {
  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 108px)', minHeight: '640px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", maxWidth: '430px', margin: '0 auto', borderRadius: '36px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <BlurredBg />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 14px', gap: '8px' }}>
        <ScorePill label="Команда А" score={teamAScore} color={C.blue} compact />
        <Timer seconds={timeRemaining} compact />
        <ScorePill label="Команда Б" score={teamBScore} color={C.orange} reverse compact />
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9999px', background: `linear-gradient(135deg, ${C.blue}18, ${C.blue}0a)`, border: `1px solid ${C.blue}40`, boxShadow: `0 0 20px ${C.blue}18` }}>
          <HeadphonesIcon size={15} color={C.blue} />
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>Ты </span>
            <span style={{ color: C.blue, textShadow: `0 0 12px ${C.blue}80` }}>угадываешь слова</span>
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 16px', borderRadius: '9999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.orange, boxShadow: `0 0 8px ${C.orange}` }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Объясняет:</span>
          <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', color: C.orange, textShadow: `0 0 12px ${C.orange}80` }}>{explainerName}</span>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ height: '22px' }} />
          <div style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', background: 'linear-gradient(148deg, #1e1640 0%, #160f38 45%, #0e0a26 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.7), 0 28px 64px rgba(0,0,0,0.85)', height: '310px', outline: '2px dashed rgba(255,255,255,0.1)', outlineOffset: '-8px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, transparent 100%)', borderRadius: '28px 28px 0 0', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.6) 4px)', backgroundSize: '100% 4px' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <motion.div animate={{ opacity: [0.55, 0.85, 0.55] }} transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
                <span style={{ fontSize: '48px', color: 'rgba(255,255,255,0.22)' }}>🔒</span>
              </motion.div>
              <h2 style={{ margin: 0, fontSize: isRoundActive ? '54px' : '36px', fontWeight: 900, color: 'rgba(255,255,255,0.28)', textAlign: 'center', lineHeight: 1.08, textTransform: 'uppercase' }}>
                {isRoundActive ? (
                  <>СЛОВО<br />СКРЫТО</>
                ) : (
                  <>ЖДЕМ НАЧАЛА<br />НОВОГО РАУНДА</>
                )}
              </h2>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase' }}>Угадай по объяснению</span>
            </div>
            <div style={{ position: 'absolute', bottom: '18px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '44px', height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>
          <div style={{ height: '22px' }} />
        </div>
      </div>

      <div style={{ height: '26px' }} />
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

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '640px', marginLeft: 'calc(50% - 50vw)', display: 'flex', overflow: 'hidden', fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      <BlurredBg />

      <div style={{ position: 'absolute', top: '28px', left: '96px', zIndex: 12 }}>
        <ScorePill label="Team A" score={teamAScore} color={C.blue} />
      </div>
      <div style={{ position: 'absolute', top: '28px', right: '96px', zIndex: 12 }}>
        <ScorePill label="Team B" score={teamBScore} color={C.orange} reverse />
      </div>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '84px 60px 40px' }}>
        <RoundTimerPill roundNum={Math.max(1, roundNumber)} seconds={timeRemaining} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', borderRadius: '9999px', background: `linear-gradient(135deg,${C.blue}18,${C.blue}0a)`, border: `1px solid ${C.blue}40`, boxShadow: `0 0 20px ${C.blue}18` }}>
          <HeadphonesIcon size={14} color={C.blue} />
          <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Ты</span>
          <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.blue, textShadow: `0 0 14px ${C.blue}80` }}>угадываешь слова</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 16px', borderRadius: '9999px', background: 'rgba(251,146,60,0.1)', border: `1px solid ${C.orange}35` }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: C.orange, boxShadow: `0 0 8px ${C.orange}` }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>Объясняет:</span>
          <MicIcon size={11} color={C.orange} />
          <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.08em', color: C.orange, textShadow: `0 0 12px ${C.orange}80` }}>{explainerName}</span>
        </div>

        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', background: 'linear-gradient(148deg,#1e1640 0%,#160f38 45%,#0e0a26 100%)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07),0 8px 32px rgba(0,0,0,0.7),0 28px 64px rgba(0,0,0,0.85)', height: '300px', outline: '2px dashed rgba(255,255,255,0.08)', outlineOffset: '-8px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg,rgba(255,255,255,0.055) 0%,transparent 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04, backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.6) 4px)', backgroundSize: '100% 4px' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <motion.div animate={{ opacity: [0.55, 0.85, 0.55] }} transition={{ duration: 2.8, repeat: Infinity }}>
                <span style={{ fontSize: '48px', color: 'rgba(255,255,255,0.22)' }}>🔒</span>
              </motion.div>

              {isRoundActive ? (
                <>
                  <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.25)', lineHeight: 1.1, textTransform: 'uppercase' }}>СЛОВО</span>
                  <span style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.25)', lineHeight: 1.1, textTransform: 'uppercase' }}>СКРЫТО</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.14)', textTransform: 'uppercase' }}>УГАДАЙ СЛОВО</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.28)', lineHeight: 1.08, textTransform: 'uppercase', textAlign: 'center' }}>ЖДЕМ НАЧАЛА</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.28)', lineHeight: 1.08, textTransform: 'uppercase', textAlign: 'center' }}>НОВОГО РАУНДА</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GuesserScreen(props: GuesserScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <GuesserScreenDesktop {...props} /> : <GuesserScreenMobile {...props} />
}

export type { GuesserScreenProps }
