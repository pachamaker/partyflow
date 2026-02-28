import { useState, type ChangeEvent, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import useBreakpoint from '../hooks/useBreakpoint'
import C from '../constants/colors'

type LandingScreenProps = {
  playerName: string
  roundTime: number
  scoreToWin: number
  isCreating?: boolean
  errorMessage?: string | null
  onPlayerNameChange: (value: string) => void
  onRoundTimeChange: (value: number) => void
  onScoreToWinChange: (value: number) => void
  onCreateGame: () => void | Promise<void>
  onJoinGame: (roomCode: string) => void
}

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 13.3a7.7 7.7 0 0 0 .1-2.6l2-1.6-2-3.5-2.5 1a7.8 7.8 0 0 0-2.2-1.2l-.4-2.7h-4l-.4 2.7a7.8 7.8 0 0 0-2.2 1.2l-2.5-1-2 3.5 2 1.6a7.7 7.7 0 0 0 .1 2.6l-2 1.6 2 3.5 2.5-1c.7.5 1.4.9 2.2 1.2l.4 2.7h4l.4-2.7c.8-.3 1.5-.7 2.2-1.2l2.5 1 2-3.5-2-1.6Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 5h10v3a5 5 0 0 1-10 0V5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 7H5a2 2 0 0 0 2 3M17 7h2a2 2 0 0 1-2 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13v3M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function BlurredBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#020817' }} />
      <div style={{ position: 'absolute', top: '-30%', left: '-20%', width: '80%', height: '80%', borderRadius: '50%', background: 'radial-gradient(circle, #1e0d5c 0%, transparent 65%)', filter: 'blur(70px)', opacity: 0.95 }} />
      <div style={{ position: 'absolute', top: '10%', right: '-30%', width: '85%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #0c2060 0%, transparent 65%)', filter: 'blur(65px)', opacity: 0.85 }} />
      <div style={{ position: 'absolute', bottom: '-25%', left: '-10%', width: '90%', height: '75%', borderRadius: '50%', background: 'radial-gradient(circle, #16084a 0%, transparent 65%)', filter: 'blur(75px)', opacity: 1 }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(140,170,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,255,0.9) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  )
}

function Particles() {
  const pts = [
    { col: C.blue, x: '8%', y: '15%', s: 3 },
    { col: C.purple, x: '88%', y: '22%', s: 4 },
    { col: C.orange, x: '75%', y: '65%', s: 3 },
    { col: C.green, x: '12%', y: '70%', s: 5 },
    { col: C.pink, x: '55%', y: '88%', s: 3 },
  ]

  return (
    <>
      {pts.map((p, i) => (
        <motion.div
          key={`${p.x}-${p.y}`}
          style={{
            position: 'absolute',
            zIndex: 1,
            width: `${p.s}px`,
            height: `${p.s}px`,
            borderRadius: '50%',
            left: p.x,
            top: p.y,
            background: p.col,
            boxShadow: `0 0 ${p.s * 3}px ${p.col}`,
            pointerEvents: 'none',
          }}
          animate={{ y: [-8, 8, -8], opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 2.6 + i * 0.38, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  color,
  onChange,
  icon,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  color: string
  onChange: (value: number) => void
  icon: 'clock' | 'trophy'
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: `${color}20`,
            border: `1px solid ${color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon === 'clock' ? <IconClock /> : <IconTrophy />}
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.72)' }}>{label}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: `1.5px solid ${color}40`,
            background: `${color}15`,
            color,
            fontSize: '22px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          −
        </button>

        <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontSize: '30px', fontWeight: 900 }}>{value}</div>

        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            border: `1.5px solid ${color}40`,
            background: `${color}15`,
            color,
            fontSize: '22px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>

      <div style={{ height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${((value - min) / (max - min)) * 100}%`,
            height: '100%',
            borderRadius: '9999px',
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: 'width 0.2s ease',
          }}
        />
      </div>
    </div>
  )
}

function SettingsModal({
  open,
  onClose,
  timer,
  score,
  onTimer,
  onScore,
}: {
  open: boolean
  onClose: () => void
  timer: number
  score: number
  onTimer: (value: number) => void
  onScore: (value: number) => void
}) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(2,8,23,0.82)', backdropFilter: 'blur(12px)' }}
          />

          <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.82, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                width: 'min(380px, calc(100vw - 32px))',
                borderRadius: '24px',
                background: 'linear-gradient(160deg, rgba(12,8,36,0.97) 0%, rgba(6,4,22,0.99) 100%)',
                border: `1px solid ${C.purple}40`,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: '3px', background: `linear-gradient(90deg, ${C.blue}, ${C.purple}, ${C.orange})` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: `${C.purple}aa` }}>КОНФИГУРАЦИЯ</p>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#fff' }}>Настройки игры</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Stepper label="Таймер раунда (сек)" value={timer} min={20} max={120} step={5} color={C.blue} onChange={onTimer} icon="clock" />
                <Stepper label="Слов для победы" value={score} min={10} max={100} step={5} color={C.orange} onChange={onScore} icon="trophy" />
              </div>

              <div style={{ padding: '0 20px 20px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: `1px solid ${C.purple}50`,
                    background: `linear-gradient(135deg, ${C.purple}cc, #7c3aed)`,
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Сохранить
                </button>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
    ,
    document.body,
  )
}

function JoinCodeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (roomCode: string) => void
}) {
  const [code, setCode] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(code)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value.toUpperCase())
  }

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 52, background: 'rgba(2,8,23,0.82)', backdropFilter: 'blur(12px)' }}
          />
          <motion.form
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            onSubmit={handleSubmit}
            style={{
              position: 'fixed',
              zIndex: 53,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(360px, calc(100vw - 32px))',
              borderRadius: '20px',
              border: `1px solid ${C.blue}40`,
              background: 'linear-gradient(160deg, rgba(12,8,36,0.98), rgba(6,4,22,0.99))',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 900 }}>Код комнаты</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>Введите 6 символов (например, ABC123)</p>
            <input
              value={code}
              onChange={handleChange}
              maxLength={6}
              placeholder="ABC123"
              style={{
                width: '100%',
                borderRadius: '14px',
                border: `1px solid ${C.blue}50`,
                background: 'rgba(3,8,25,0.7)',
                color: '#fff',
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                padding: '12px 14px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '11px',
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  border: `1px solid ${C.blue}60`,
                  background: `linear-gradient(135deg, ${C.blue}cc, #0ea5e9)`,
                  color: '#fff',
                  fontWeight: 800,
                  padding: '11px',
                  cursor: 'pointer',
                }}
              >
                Войти
              </button>
            </div>
          </motion.form>
        </>
      ) : null}
    </AnimatePresence>
    ,
    document.body,
  )
}

function LandingScreenMobile({
  playerName,
  roundTime,
  scoreToWin,
  isCreating = false,
  errorMessage = null,
  onPlayerNameChange,
  onRoundTimeChange,
  onScoreToWinChange,
  onCreateGame,
  onJoinGame,
}: LandingScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const hasName = playerName.trim().length >= 2

  return (
    <div
      style={{
        position: 'relative',
        height: 'calc(100vh - 108px)',
        minHeight: '640px',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif",
        maxWidth: '430px',
        margin: '0 auto',
        borderRadius: '36px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <BlurredBg />
      <Particles />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'flex-end', padding: '18px 16px 0' }}>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            border: `1px solid ${C.purple}40`,
            background: `linear-gradient(135deg, ${C.purple}18, rgba(255,255,255,0.04))`,
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 20px ${C.purple}25`,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            color: C.purple,
          }}
        >
          <IconGear />
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: `${C.orange}cc` }}>
          party game
        </motion.span>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(3rem, 18vw, 5.5rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 0.9,
            background: `linear-gradient(135deg, #fff 0%, ${C.orange} 40%, ${C.pink} 70%, ${C.purple} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ПОЯСНИ
        </h1>

        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>объясняй · угадывай · побеждай</span>

        <div style={{ width: '100%', height: '2px', marginTop: '10px', marginBottom: '40px', background: `linear-gradient(90deg, transparent, ${C.orange}80, ${C.purple}80, transparent)` }} />

        <div
          style={{
            width: '100%',
            borderRadius: '16px',
            border: '2px solid rgba(255,255,255,0.12)',
            background: 'linear-gradient(135deg, rgba(14,10,40,0.92) 0%, rgba(8,6,28,0.96) 100%)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: playerName ? `linear-gradient(135deg, ${C.blue}cc, ${C.purple}99)` : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              {playerName ? playerName[0]?.toUpperCase() : '?'}
            </div>

            <input
              value={playerName}
              onChange={(event) => onPlayerNameChange(event.target.value)}
              placeholder="Ваше имя"
              maxLength={16}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '18px',
                fontWeight: 800,
                color: '#fff',
                letterSpacing: '0.02em',
              }}
            />

            {playerName ? (
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${C.green}25`, border: `1px solid ${C.green}50`, display: 'grid', placeItems: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6L5 9L10 3" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ height: '20px' }} />

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            disabled={!hasName || isCreating}
            onClick={() => {
              void onCreateGame()
            }}
            style={{
              width: '100%',
              padding: '20px',
              borderRadius: '18px',
              border: !hasName || isCreating ? '2px solid rgba(255,255,255,0.08)' : `2px solid ${C.orange}70`,
              background: !hasName || isCreating ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, #f97316 0%, ${C.orange} 45%, #ea580c 100%)`,
              color: !hasName || isCreating ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: '22px',
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: !hasName || isCreating ? 'not-allowed' : 'pointer',
            }}
          >
            {isCreating ? 'СОЗДАНИЕ...' : 'НОВАЯ ИГРА'}
          </button>

          <button
            type="button"
            disabled={!hasName}
            onClick={() => setJoinOpen(true)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: !hasName ? '1.5px solid rgba(255,255,255,0.08)' : `1.5px solid ${C.blue}45`,
              background: !hasName ? 'transparent' : `linear-gradient(135deg, ${C.blue}18 0%, ${C.purple}12 100%)`,
              color: !hasName ? 'rgba(255,255,255,0.2)' : `${C.blue}ee`,
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: !hasName ? 'not-allowed' : 'pointer',
            }}
          >
            ПРИСОЕДИНИТЬСЯ
          </button>
        </div>

        {!hasName ? <p style={{ margin: '12px 0 0', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', textAlign: 'center', letterSpacing: '0.04em' }}>Введи имя чтобы начать</p> : null}
        {errorMessage ? <p style={{ margin: '12px 0 0', fontSize: '12px', fontWeight: 700, color: '#fecaca', textAlign: 'center' }}>{errorMessage}</p> : null}
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', paddingBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase' }}>v1.0 · poyasni.ru</span>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timer={roundTime}
        score={scoreToWin}
        onTimer={onRoundTimeChange}
        onScore={onScoreToWinChange}
      />

      <JoinCodeModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={(roomCode) => {
          onJoinGame(roomCode)
          setJoinOpen(false)
        }}
      />
    </div>
  )
}

function LandingScreenDesktop({
  playerName,
  roundTime,
  scoreToWin,
  isCreating = false,
  errorMessage = null,
  onPlayerNameChange,
  onRoundTimeChange,
  onScoreToWinChange,
  onCreateGame,
  onJoinGame,
}: LandingScreenProps) {
  const [focused, setFocused] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const hasName = playerName.trim().length >= 2

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '640px', marginLeft: 'calc(50% - 50vw)', overflow: 'hidden', display: 'flex', fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      <BlurredBg />
      <Particles />

      <div style={{ position: 'absolute', top: '24px', right: '32px', zIndex: 20 }}>
        <motion.button whileTap={{ scale: 0.88, rotate: 45 }} whileHover={{ rotate: 20 }} onClick={() => setSettingsOpen(true)} style={{ width: '44px', height: '44px', borderRadius: '14px', border: `1px solid ${C.purple}40`, background: `linear-gradient(135deg,${C.purple}18,rgba(255,255,255,0.04))`, backdropFilter: 'blur(12px)', boxShadow: `0 0 20px ${C.purple}25`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.purple }}>
          <IconGear />
        </motion.button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} style={{ position: 'relative', zIndex: 10, width: 'min(560px, 90vw)', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.3em', color: `${C.orange}cc`, textTransform: 'uppercase' }}>party game</span>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '-20px -30px', background: `radial-gradient(ellipse 80% 60% at 50% 50%,${C.orange}28 0%,${C.purple}18 50%,transparent 75%)`, filter: 'blur(20px)' }} />
            <h1 style={{ margin: 0, fontSize: 'clamp(4rem,7vw,7rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 0.9, background: `linear-gradient(135deg,#fff 0%,${C.orange} 40%,${C.pink} 70%,${C.purple} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 0 30px rgba(251,146,60,0.4))', position: 'relative' }}>ПОЯСНИ</h1>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>объясняй · угадывай · побеждай</span>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.7, delay: 0.5 }} style={{ height: '2px', background: `linear-gradient(90deg,transparent,${C.orange}80,${C.purple}80,transparent)`, transformOrigin: 'left' }} />
        </div>

        <div style={{ position: 'relative' }}>
          <motion.div animate={{ opacity: focused ? 1 : 0, scale: focused ? 1.03 : 0.97 }} style={{ position: 'absolute', inset: '-3px', borderRadius: '20px', background: `linear-gradient(135deg,${C.blue}35,${C.purple}25)`, filter: 'blur(8px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', borderRadius: '16px', border: focused ? `2px solid ${C.blue}90` : '2px solid rgba(255,255,255,0.12)', background: 'linear-gradient(135deg,rgba(14,10,40,0.92),rgba(8,6,28,0.96))', backdropFilter: 'blur(20px)', transition: 'border-color 0.22s,box-shadow 0.22s', boxShadow: focused ? `0 0 0 1px ${C.blue}30,0 8px 32px rgba(0,0,0,0.5),0 0 40px ${C.blue}20` : '0 4px 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: playerName ? `linear-gradient(135deg,${C.blue}cc,${C.purple}99)` : 'rgba(255,255,255,0.06)', border: playerName ? `1px solid ${C.blue}50` : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxShadow: playerName ? `0 0 12px ${C.blue}40` : 'none' }}>
                <span style={{ fontSize: playerName ? '18px' : '15px', fontWeight: 900, color: playerName ? '#fff' : 'rgba(255,255,255,0.2)' }}>{playerName ? playerName[0]?.toUpperCase() : '?'}</span>
              </div>
              <input value={playerName} onChange={(event) => onPlayerNameChange(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="Ваше имя" maxLength={16} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', caretColor: C.blue }} />
            </div>
            <motion.div animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg,transparent,${C.blue},${C.purple},transparent)`, transformOrigin: 'left' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!hasName ? <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.28)', textAlign: 'center', letterSpacing: '0.04em' }}>Введи имя чтобы начать</p> : null}
          <div style={{ position: 'relative' }}>
            {hasName ? (
              <>
                <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: 'absolute', inset: '-4px', borderRadius: '20px', border: `2px solid ${C.orange}`, pointerEvents: 'none' }} />
                <motion.div animate={{ scale: [1, 1.16, 1], opacity: [0.22, 0, 0.22] }} transition={{ duration: 2, repeat: Infinity, delay: 0.4 }} style={{ position: 'absolute', inset: '-4px', borderRadius: '20px', border: `2px solid ${C.orange}`, pointerEvents: 'none' }} />
              </>
            ) : null}
            <motion.button whileTap={hasName ? { scale: 0.97, y: 4 } : {}} whileHover={hasName ? { scale: 1.01 } : {}} type="button" disabled={!hasName || isCreating} onClick={() => void onCreateGame()} style={{ width: '100%', padding: '20px', borderRadius: '18px', border: hasName ? `2px solid ${C.orange}70` : '2px solid rgba(255,255,255,0.08)', background: hasName ? `linear-gradient(135deg,#f97316,${C.orange},#ea580c)` : 'rgba(255,255,255,0.04)', boxShadow: hasName ? `0 8px 0 #c2410c,0 12px 40px ${C.orange}45,inset 0 1px 0 rgba(255,255,255,0.35)` : '0 4px 0 rgba(0,0,0,0.3)', cursor: hasName ? 'pointer' : 'not-allowed', position: 'relative', overflow: 'hidden' }}>
              {hasName ? <div style={{ position: 'absolute', top: '6px', left: '15%', right: '15%', height: '10px', borderRadius: '9999px', background: 'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,transparent 100%)', opacity: 0.4 }} /> : null}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative' }}>
                <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: hasName ? '#fff' : 'rgba(255,255,255,0.2)' }}>{isCreating ? 'Создание...' : 'Новая игра'}</span>
              </div>
            </motion.button>
          </div>
          <motion.button whileTap={hasName ? { scale: 0.97 } : {}} type="button" disabled={!hasName} onClick={() => setJoinOpen(true)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: hasName ? `1.5px solid ${C.blue}45` : '1.5px solid rgba(255,255,255,0.08)', background: hasName ? `linear-gradient(135deg,${C.blue}18,${C.purple}12)` : 'transparent', backdropFilter: 'blur(12px)', boxShadow: hasName ? `0 0 30px ${C.blue}12` : 'none', cursor: hasName ? 'pointer' : 'not-allowed' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: hasName ? `${C.blue}ee` : 'rgba(255,255,255,0.15)', textShadow: hasName ? `0 0 16px ${C.blue}70` : 'none' }}>Присоединиться</span>
            </div>
          </motion.button>
        </div>

        {errorMessage ? <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#fecaca' }}>{errorMessage}</p> : null}
      </motion.div>

      <JoinCodeModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={(roomCode) => {
          onJoinGame(roomCode)
          setJoinOpen(false)
        }}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timer={roundTime}
        score={scoreToWin}
        onTimer={onRoundTimeChange}
        onScore={onScoreToWinChange}
      />
    </div>
  )
}

export default function LandingScreen(props: LandingScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <LandingScreenDesktop {...props} /> : <LandingScreenMobile {...props} />
}
