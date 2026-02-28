import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type PanInfo } from 'framer-motion'
import useBreakpoint from '../hooks/useBreakpoint'
import C from '../constants/colors'

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

function ScorePill({ label, score, color, reverse, compact = false }: { label: string; score: number; color: string; reverse?: boolean; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px', flexDirection: reverse ? 'row-reverse' : 'row', padding: compact ? '7px 10px' : '8px 16px', borderRadius: compact ? '12px' : '14px', border: `1px solid ${color}30`, background: 'linear-gradient(135deg,rgba(8,8,28,0.88) 0%,rgba(16,8,40,0.92) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: `0 0 0 1px ${color}20,0 4px 20px rgba(0,0,0,0.55),0 0 24px ${color}18,inset 0 1px 0 rgba(255,255,255,0.07)` }}>
      <span style={{ fontSize: compact ? '7px' : '9px', fontWeight: 900, letterSpacing: compact ? '0.12em' : '0.16em', color: `${color}99`, textTransform: 'uppercase', lineHeight: 1 }}>{label}</span>
      <div style={{ width: '1px', height: compact ? '16px' : '18px', background: `${color}28`, flexShrink: 0 }} />
      <span style={{ fontSize: compact ? '20px' : '26px', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 14px ${color}cc,0 0 30px ${color}55`, minWidth: compact ? '20px' : '24px', textAlign: 'center' }}>{score}</span>
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
      <div style={{ position: 'absolute', bottom: '-20%', left: '5%', width: '85%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #1a0e5a 0%, transparent 68%)', filter: 'blur(72px)', opacity: 0.95 }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.038, backgroundImage: 'linear-gradient(rgba(140,170,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,255,0.9) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  )
}

function ActionButton({ type, onClick }: { type: 'skip' | 'correct'; onClick?: () => void }) {
  const isCorrect = type === 'correct'
  const color = isCorrect ? C.green : C.red

  return (
    <motion.button type="button" whileTap={{ scale: 0.86, y: 5 }} whileHover={{ scale: 1.07 }} onClick={onClick} style={{ width: '90px', height: '90px', borderRadius: '50%', border: `2px solid ${color}`, background: `radial-gradient(circle at 38% 32%,${color} 0%,${color}bb 55%,${color}80 100%)`, boxShadow: `0 7px 0 ${color}44,0 10px 28px ${color}65,0 0 55px ${color}35`, cursor: 'pointer', fontSize: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '9px', left: '14px', width: '28px', height: '13px', borderRadius: '9999px', background: 'linear-gradient(180deg,rgba(255,255,255,0.65) 0%,transparent 100%)', opacity: 0.4 }} />
      {isCorrect ? '✓' : '✗'}
    </motion.button>
  )
}

function MicIcon({ size = 14, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="1" width="6" height="9" rx="3" fill={color} fillOpacity="0.9" />
      <path d="M2.5 8.5C2.5 11.5376 5.18629 14 8 14C10.8137 14 13.5 11.5376 13.5 8.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8" y1="14" x2="8" y2="15.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
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
  onStartRound,
  onGuessed,
  onSkipped,
}: ExplainerScreenProps) {
  const y = useMotionValue(0)
  const springY = useSpring(y, { stiffness: 380, damping: 28 })
  const rotate = useTransform(springY, [-220, 0, 220], [9, 0, -9])
  const scale = useTransform(springY, [-220, 0, 220], [0.91, 1, 0.91])
  const overlayBg = useTransform(springY, (v) => (v < 0 ? `linear-gradient(135deg,${C.green}70,${C.green}22)` : `linear-gradient(135deg,${C.red}70,${C.red}22)`))
  const overlayOp = useTransform(springY, [-220, -55, 0, 55, 220], [0.9, 0.35, 0, 0.35, 0.9])
  const [flash, setFlash] = useState<null | 'guessed' | 'skipped'>(null)
  const wordContainerRef = useRef<HTMLDivElement | null>(null)
  const wordRef = useRef<HTMLHeadingElement | null>(null)
  const canInteract = isRoundActive && !canStartRound && Boolean(word.trim())
  const displayWord = canInteract ? word.trim().toUpperCase() : 'ЖДЕМ НАЧАЛА НОВОГО РАУНДА'
  const normalizedHint = hint?.trim() ?? ''

  const resetPose = useCallback(() => {
    y.stop()
    springY.stop()
    y.set(0)
    springY.set(0)
  }, [springY, y])

  const triggerGuessed = useCallback(() => {
    if (!canInteract) return
    setFlash('guessed')
    window.setTimeout(() => {
      setFlash(null)
      resetPose()
      onGuessed?.()
    }, 280)
  }, [canInteract, onGuessed, resetPose])

  const triggerSkipped = useCallback(() => {
    if (!canInteract) return
    setFlash('skipped')
    window.setTimeout(() => {
      setFlash(null)
      resetPose()
      onSkipped?.()
    }, 280)
  }, [canInteract, onSkipped, resetPose])

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!canInteract) return
      const oy = info.offset.y
      const vy = info.velocity.y
      if (oy < -80 || vy < -450) {
        triggerGuessed()
        return
      }
      if (oy > 80 || vy > 450) {
        triggerSkipped()
        return
      }
      resetPose()
    },
    [canInteract, resetPose, triggerGuessed, triggerSkipped],
  )

  useLayoutEffect(() => {
    const el = wordRef.current
    const ct = wordContainerRef.current
    if (!el || !ct) return

    let size = canInteract ? 72 : 54
    el.style.fontSize = `${size}px`
    while (size > 16 && (el.scrollHeight > ct.clientHeight || el.scrollWidth > ct.clientWidth)) {
      size -= 1
      el.style.fontSize = `${size}px`
    }
  }, [canInteract, displayWord])

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 108px)', minHeight: '640px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", maxWidth: '430px', margin: '0 auto', borderRadius: '36px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <BlurredBg />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 14px', gap: '8px' }}>
        <ScorePill label="Команда А" score={teamAScore} color={C.blue} compact />
        <Timer seconds={timeRemaining} compact />
        <ScorePill label="Команда Б" score={teamBScore} color={C.orange} reverse compact />
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: '9999px', background: `linear-gradient(135deg, ${C.purple}18, ${C.purple}0a)`, border: `1px solid ${C.purple}40`, boxShadow: `0 0 20px ${C.purple}18` }}>
          <MicIcon size={15} color={C.purple} />
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>Ты </span>
            <span style={{ color: C.purple, textShadow: `0 0 12px ${C.purple}80` }}>объясняешь слова</span>
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
        <motion.div
          drag={canInteract ? 'y' : false}
          dragConstraints={{ top: -230, bottom: 230 }}
          dragElastic={0.15}
          dragMomentum={false}
          style={{ y: springY, rotate, scale, width: '100%', maxWidth: '340px', cursor: canInteract ? 'grab' : 'default', userSelect: 'none' }}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: canInteract ? 'grabbing' : 'default' }}
        >
          <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', color: `${C.green}55`, marginBottom: '6px', textTransform: 'uppercase' }}>▲ Угадано</div>
          <div style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', background: 'linear-gradient(148deg, #5b3dd4 0%, #341ea0 45%, #1d1570 100%)', boxShadow: `0 0 0 1px rgba(255,255,255,0.13), 0 8px 32px rgba(0,0,0,0.62), 0 28px 64px rgba(0,0,0,0.78), 0 0 90px ${C.purple}30, inset 0 1px 0 rgba(255,255,255,0.22)`, height: '310px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, transparent 100%)', borderRadius: '28px 28px 0 0', pointerEvents: 'none' }} />
            <motion.div style={{ position: 'absolute', inset: 0, borderRadius: '28px', background: overlayBg, opacity: overlayOp, pointerEvents: 'none' }} />
            <AnimatePresence>
              {flash ? (
                <motion.div initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, borderRadius: '28px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: flash === 'guessed' ? `${C.green}cc` : `${C.red}cc` }}>
                  <span style={{ fontSize: '80px', lineHeight: 1 }}>{flash === 'guessed' ? '✓' : '✗'}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div ref={wordContainerRef} style={{ position: 'absolute', top: '24px', left: '20px', right: '20px', bottom: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <h1 ref={wordRef} style={{ margin: 0, fontWeight: 900, lineHeight: 1.08, textAlign: 'center', color: '#fff', textTransform: 'uppercase', width: '100%', whiteSpace: 'normal', wordBreak: 'keep-all' }}>{displayWord}</h1>
            </div>
            <div style={{ position: 'absolute', bottom: '18px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '44px', height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.2)' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', color: `${C.red}55`, marginTop: '6px', textTransform: 'uppercase' }}>▼ Пропустить</div>
        </motion.div>
      </div>

      {canInteract ? (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', padding: '2px 24px 0' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
              padding: '8px 12px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.02em' }}>
              {normalizedHint ? `Подсказка: ${normalizedHint}` : 'Подсказка отсутствует'}
            </span>
          </div>
        </div>
      ) : null}

      {canStartRound ? (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', padding: '20px 32px 40px' }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97, y: 3 }}
            whileHover={{ scale: 1.01 }}
            onClick={onStartRound}
            style={{ width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '16px', border: `2px solid ${C.green}60`, background: `linear-gradient(135deg,#22c55e,${C.green},#16a34a)`, boxShadow: `0 7px 0 #15803d,0 10px 35px ${C.green}45,inset 0 1px 0 rgba(255,255,255,0.3)`, cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Начать новый раунд
          </motion.button>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', gap: '56px', padding: '20px 32px 40px' }}>
          <ActionButton type="skip" onClick={triggerSkipped} />
          <ActionButton type="correct" onClick={triggerGuessed} />
        </div>
      )}
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
  onStartRound,
  onGuessed,
  onSkipped,
}: ExplainerScreenProps) {
  const y = useMotionValue(0)
  const springY = useSpring(y, { stiffness: 380, damping: 28 })
  const rotate = useTransform(springY, [-220, 0, 220], [9, 0, -9])
  const scale = useTransform(springY, [-220, 0, 220], [0.91, 1, 0.91])
  const overlayBg = useTransform(springY, (v) => (v < 0 ? `linear-gradient(135deg,${C.green}70,${C.green}22)` : `linear-gradient(135deg,${C.red}70,${C.red}22)`))
  const overlayOp = useTransform(springY, [-220, -55, 0, 55, 220], [0.9, 0.35, 0, 0.35, 0.9])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const wordRef = useRef<HTMLHeadingElement | null>(null)
  const [flash, setFlash] = useState<null | 'guessed' | 'skipped'>(null)
  const [cardKey, setCardKey] = useState(0)

  const resetCardPose = useCallback(() => {
    y.stop()
    springY.stop()
    y.set(0)
    springY.set(0)
  }, [springY, y])

  const waitingState = !isRoundActive || !word
  const displayWord = waitingState ? 'ЖДЕМ НАЧАЛА НОВОГО РАУНДА' : word.toUpperCase()
  const canInteract = isRoundActive && !canStartRound && Boolean(word)
  const normalizedHint = hint?.trim() ?? ''

  useLayoutEffect(() => {
    const el = wordRef.current
    const ct = containerRef.current
    if (!el || !ct) return

    let size = 104
    el.style.fontSize = `${size}px`

    while (size > 16 && (el.scrollHeight > ct.clientHeight || el.scrollWidth > ct.clientWidth)) {
      size -= 1
      el.style.fontSize = `${size}px`
    }
  }, [cardKey, displayWord, waitingState])

  const triggerGuessed = useCallback(() => {
    if (!canInteract) return
    setFlash('guessed')
    window.setTimeout(() => {
      resetCardPose()
      setFlash(null)
      setCardKey((k) => k + 1)
      onGuessed?.()
    }, 320)
  }, [canInteract, onGuessed, resetCardPose])

  const triggerSkipped = useCallback(() => {
    if (!canInteract) return
    setFlash('skipped')
    window.setTimeout(() => {
      resetCardPose()
      setFlash(null)
      setCardKey((k) => k + 1)
      onSkipped?.()
    }, 320)
  }, [canInteract, onSkipped, resetCardPose])

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!canInteract) return
      const oy = info.offset.y
      const vy = info.velocity.y
      if (oy < -80 || vy < -450) {
        triggerGuessed()
      } else if (oy > 80 || vy > 450) {
        triggerSkipped()
      } else {
        resetCardPose()
      }
    },
    [canInteract, resetCardPose, triggerGuessed, triggerSkipped],
  )

  useEffect(() => {
    resetCardPose()
  }, [cardKey, displayWord, resetCardPose, waitingState])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '640px', marginLeft: 'calc(50% - 50vw)', display: 'flex', overflow: 'hidden', fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      <BlurredBg />

      <div style={{ position: 'absolute', top: '28px', left: '96px', zIndex: 12 }}>
        <ScorePill label="Team A" score={teamAScore} color={C.blue} />
      </div>
      <div style={{ position: 'absolute', top: '28px', right: '96px', zIndex: 12 }}>
        <ScorePill label="Team B" score={teamBScore} color={C.orange} reverse />
      </div>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '84px 60px 40px' }}>
        <RoundTimerPill roundNum={Math.max(1, roundNumber)} seconds={timeRemaining} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', borderRadius: '9999px', background: `linear-gradient(135deg,${C.purple}18,${C.purple}0a)`, border: `1px solid ${C.purple}40`, boxShadow: `0 0 20px ${C.purple}18` }}>
          <MicIcon size={14} color={C.purple} />
          <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Ты</span>
          <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.purple, textShadow: `0 0 14px ${C.purple}80` }}>объясняешь слова</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={cardKey} initial={{ opacity: 0, scale: 0.82, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.1, y: -45 }} transition={{ type: 'spring', stiffness: 360, damping: 26 }} style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', color: `${C.green}55`, marginBottom: '8px', textTransform: 'uppercase' }}>▲ УГАДАНО</div>
            <motion.div drag={canInteract ? 'y' : false} dragConstraints={{ top: -240, bottom: 240 }} dragElastic={0.15} dragMomentum={false} style={{ y: springY, rotate, scale, cursor: canInteract ? 'grab' : 'default', userSelect: 'none' }} onDragEnd={handleDragEnd} whileTap={{ cursor: canInteract ? 'grabbing' : 'default' }}>
              <div style={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', background: 'linear-gradient(148deg,#5b3dd4 0%,#341ea0 45%,#1d1570 100%)', boxShadow: `0 0 0 1px rgba(255,255,255,0.13),0 8px 32px rgba(0,0,0,0.62),0 28px 64px rgba(0,0,0,0.78),0 0 90px ${C.purple}30,inset 0 1px 0 rgba(255,255,255,0.22)`, height: '320px' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(180deg,rgba(255,255,255,0.13) 0%,transparent 100%)', borderRadius: '28px 28px 0 0', pointerEvents: 'none' }} />
                <motion.div style={{ position: 'absolute', inset: 0, borderRadius: '28px', background: overlayBg, opacity: overlayOp, pointerEvents: 'none' }} />
                <AnimatePresence>
                  {flash ? (
                    <motion.div initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, borderRadius: '28px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: flash === 'guessed' ? `${C.green}cc` : `${C.red}cc` }}>
                      <span style={{ fontSize: '80px', lineHeight: 1 }}>{flash === 'guessed' ? '✓' : '✗'}</span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <div ref={containerRef} style={{ position: 'absolute', top: '28px', left: '24px', right: '24px', bottom: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <span style={{ fontSize: '34px', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.1 }}>{displayWord}</span>
                </div>
                <div style={{ position: 'absolute', bottom: '18px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: '44px', height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.2)' }} />
                </div>
              </div>
            </motion.div>
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em', color: `${C.red}55`, marginTop: '8px', textTransform: 'uppercase' }}>▼ ПРОПУСТИТЬ</div>
          </motion.div>
        </AnimatePresence>

        {canInteract ? (
          <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'center', marginTop: '-4px' }}>
            <div
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                padding: '9px 12px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.74)', letterSpacing: '0.02em' }}>
                {normalizedHint ? `Подсказка: ${normalizedHint}` : 'Подсказка отсутствует'}
              </span>
            </div>
          </div>
        ) : null}

        {canStartRound ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97, y: 3 }}
            whileHover={{ scale: 1.01 }}
            onClick={onStartRound}
            style={{ width: '100%', maxWidth: '420px', padding: '16px', borderRadius: '16px', border: `2px solid ${C.green}60`, background: `linear-gradient(135deg,#22c55e,${C.green},#16a34a)`, boxShadow: `0 7px 0 #15803d,0 10px 35px ${C.green}45,inset 0 1px 0 rgba(255,255,255,0.3)`, cursor: 'pointer', color: '#fff', fontSize: '15px', fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            Начать новый раунд
          </motion.button>
        ) : (
          <div style={{ display: 'flex', gap: '28px' }}>
            <ActionButton type="skip" onClick={triggerSkipped} />
            <ActionButton type="correct" onClick={triggerGuessed} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExplainerScreen(props: ExplainerScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <ExplainerScreenDesktop {...props} /> : <ExplainerScreenMobile {...props} />
}

export type { ExplainerScreenProps }
