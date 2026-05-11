import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import useBreakpoint from '../hooks/useBreakpoint'

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

const FONT_SANS = 'var(--font-sans)'

// ──────────────────────────────────────────────────────────
// Icons
// ──────────────────────────────────────────────────────────

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19.4 13.3a7.7 7.7 0 0 0 .1-2.6l2-1.6-2-3.5-2.5 1a7.8 7.8 0 0 0-2.2-1.2l-.4-2.7h-4l-.4 2.7a7.8 7.8 0 0 0-2.2 1.2l-2.5-1-2 3.5 2 1.6a7.7 7.7 0 0 0 .1 2.6l-2 1.6 2 3.5 2.5-1c.7.5 1.4.9 2.2 1.2l.4 2.7h4l.4-2.7c.8-.3 1.5-.7 2.2-1.2l2.5 1 2-3.5-2-1.6Z" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function IconPencil({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconQR() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke="#38BDF8" strokeWidth="1.4" />
      <rect x="11" y="2" width="5" height="5" rx="1" stroke="#38BDF8" strokeWidth="1.4" />
      <rect x="2" y="11" width="5" height="5" rx="1" stroke="#38BDF8" strokeWidth="1.4" />
      <rect x="11" y="11" width="2" height="2" fill="#38BDF8" />
      <rect x="14" y="14" width="2" height="2" fill="#38BDF8" />
    </svg>
  )
}

// ──────────────────────────────────────────────────────────
// Ambient background overlay — radial glows, no particles
// ──────────────────────────────────────────────────────────

function AmbientBg() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: [
          'radial-gradient(ellipse 60% 40% at 20% 0%, rgba(124,58,237,0.35), transparent 60%)',
          'radial-gradient(ellipse 50% 35% at 90% 25%, rgba(56,189,248,0.18), transparent 60%)',
          'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(251,146,60,0.10), transparent 60%)',
        ].join(', '),
        zIndex: 0,
      }}
    />
  )
}

// ──────────────────────────────────────────────────────────
// Logo — single white wordmark with violet glow
// ──────────────────────────────────────────────────────────

function Logo({ size = 76 }: { size?: number }) {
  return (
    <div
      style={{
        fontFamily: FONT_SANS,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.035em',
        color: 'var(--color-text)',
        textShadow: '0 0 18px rgba(255,255,255,0.45), 0 0 36px rgba(124,58,237,0.4)',
        margin: 0,
      }}
    >
      ПОЯСНИ
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Primary / Ghost CTA buttons
// ──────────────────────────────────────────────────────────

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  height = 60,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  height?: number
}) {
  const baseStyle: CSSProperties = {
    width: '100%',
    height,
    borderRadius: 22,
    fontFamily: FONT_SANS,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '0.06em',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s, transform 0.1s',
  }
  if (disabled) {
    return (
      <button
        type={type}
        disabled
        style={{
          ...baseStyle,
          background: 'rgba(255,255,255,0.05)',
          color: 'var(--color-text-mute)',
          border: '1.5px solid var(--color-border)',
          boxShadow: 'none',
        }}
      >
        {children}
      </button>
    )
  }
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        ...baseStyle,
        background: '#7C3AED',
        color: '#fff',
        border: '1.5px solid transparent',
        boxShadow: 'var(--shadow-btn-primary)',
      }}
    >
      {children}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
  disabled,
  height = 60,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  height?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height,
        borderRadius: 22,
        fontFamily: FONT_SANS,
        fontSize: 17,
        fontWeight: 700,
        letterSpacing: '0.06em',
        background: 'transparent',
        color: disabled ? 'var(--color-text-mute)' : 'var(--color-text)',
        border: disabled ? '1.5px solid var(--color-border)' : '1.5px solid var(--color-border-hi)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.2s',
      }}
    >
      {children}
    </button>
  )
}

// ──────────────────────────────────────────────────────────
// Name input — pill row with gradient avatar
// ──────────────────────────────────────────────────────────

function NameInput({
  playerName,
  onPlayerNameChange,
  inputFontSize = 17,
  avatarSize = 32,
}: {
  playerName: string
  onPlayerNameChange: (value: string) => void
  inputFontSize?: number
  avatarSize?: number
}) {
  const initial = playerName.trim().length > 0 ? playerName.trim()[0]?.toUpperCase() : '?'
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--color-text-mute)',
          fontWeight: 600,
          letterSpacing: '0.4px',
          marginBottom: 8,
          textTransform: 'uppercase',
        }}
      >
        Твоё имя
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1.5px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #38BDF8, #0EA5E9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#0A0E1F',
            fontSize: Math.round(avatarSize * 0.44),
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <input
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          placeholder="Введи имя"
          maxLength={16}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: FONT_SANS,
            fontSize: inputFontSize,
            fontWeight: 600,
            color: 'var(--color-text)',
            letterSpacing: 0,
          }}
        />
        <span
          aria-hidden
          style={{
            color: 'var(--color-text-sec)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <IconPencil />
        </span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// HowToPlay tertiary button
// ──────────────────────────────────────────────────────────

function HowToPlayButton() {
  return (
    <button
      type="button"
      onClick={() => {
        /* demo — placeholder for "how to play" entry point */
      }}
      style={{
        marginTop: 6,
        background: 'transparent',
        border: 'none',
        color: 'var(--color-text-sec)',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        padding: 12,
        fontFamily: FONT_SANS,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        alignSelf: 'center',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: 'var(--color-success)',
        }}
      />
      Как играть? · 20 секунд
    </button>
  )
}

// ──────────────────────────────────────────────────────────
// Stepper (settings card)
// ──────────────────────────────────────────────────────────

function Stepper({
  kicker,
  hint,
  value,
  unit,
  tone,
  min,
  max,
  step,
  onChange,
}: {
  kicker: string
  hint: string
  value: number
  unit: string
  tone: 'blue' | 'orange'
  min: number
  max: number
  step: number
  onChange: (next: number) => void
}) {
  const color = tone === 'blue' ? 'var(--color-blue)' : 'var(--color-orange)'
  const colorHex = tone === 'blue' ? '#38BDF8' : '#FB923C'
  const atMin = value <= min
  const atMax = value >= max
  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--color-text-sec)', fontWeight: 500 }}>{kicker}</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-mute)', fontWeight: 500 }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={atMin}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `${colorHex}1A`,
            border: `1px solid ${colorHex}33`,
            color,
            fontSize: 22,
            fontWeight: 700,
            cursor: atMin ? 'not-allowed' : 'pointer',
            opacity: atMin ? 0.4 : 1,
            fontFamily: FONT_SANS,
          }}
        >
          −
        </button>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 32,
            fontWeight: 800,
            color: 'var(--color-text)',
            letterSpacing: '-1px',
            fontFamily: FONT_SANS,
          }}
        >
          {value}{' '}
          <span style={{ fontSize: 14, color: 'var(--color-text-sec)', fontWeight: 500, letterSpacing: 0 }}>{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={atMax}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `${colorHex}1A`,
            border: `1px solid ${colorHex}33`,
            color,
            fontSize: 22,
            fontWeight: 700,
            cursor: atMax ? 'not-allowed' : 'pointer',
            opacity: atMax ? 0.4 : 1,
            fontFamily: FONT_SANS,
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Sheet/Modal wrapper — bottom-sheet on mobile, centered on desktop
// ──────────────────────────────────────────────────────────

function ModalShell({
  open,
  onClose,
  variant,
  children,
  zIndex = 50,
  width = 420,
}: {
  open: boolean
  onClose: () => void
  variant: 'sheet' | 'centered'
  children: React.ReactNode
  zIndex?: number
  width?: number
}) {
  if (typeof document === 'undefined') {
    return null
  }

  const isSheet = variant === 'sheet'

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex,
              background: 'rgba(4,5,15,0.7)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: zIndex + 1,
              display: 'flex',
              alignItems: isSheet ? 'flex-end' : 'center',
              justifyContent: 'center',
              padding: isSheet ? 0 : 16,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={isSheet ? { y: '100%' } : { opacity: 0, scale: 0.92, y: 20 }}
              animate={isSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isSheet ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 20 }}
              transition={isSheet ? { type: 'spring', stiffness: 320, damping: 32 } : { type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                width: isSheet ? '100%' : `min(${width}px, calc(100vw - 32px))`,
                background: 'var(--color-surface-hi)',
                borderRadius: isSheet ? '28px 28px 0 0' : 28,
                border: '1px solid var(--color-border)',
                borderTop: '1px solid var(--color-border)',
                padding: '20px 20px 24px',
                boxShadow: 'var(--shadow-bottom-sheet)',
                pointerEvents: 'auto',
                fontFamily: FONT_SANS,
                color: 'var(--color-text)',
              }}
            >
              {isSheet ? (
                <div
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)',
                    margin: '0 auto 18px',
                  }}
                />
              ) : null}
              {children}
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function SheetHeader({
  kicker,
  title,
  onClose,
}: {
  kicker: string
  title: string
  onClose: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 4,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--color-text-mute)',
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {kicker}
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--color-text)',
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          color: 'var(--color-text-sec)',
          cursor: 'pointer',
          fontSize: 18,
          fontFamily: FONT_SANS,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Settings modal
// ──────────────────────────────────────────────────────────

function SettingsModal({
  open,
  onClose,
  timer,
  score,
  onTimer,
  onScore,
  variant,
}: {
  open: boolean
  onClose: () => void
  timer: number
  score: number
  onTimer: (value: number) => void
  onScore: (value: number) => void
  variant: 'sheet' | 'centered'
}) {
  return (
    <ModalShell open={open} onClose={onClose} variant={variant} zIndex={50} width={420}>
      <SheetHeader kicker="Конфигурация" title="Настройки игры" onClose={onClose} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <Stepper
          kicker="Длина раунда"
          hint="от 30 до 120 сек"
          value={timer}
          unit="сек"
          tone="blue"
          min={20}
          max={120}
          step={5}
          onChange={onTimer}
        />
        <Stepper
          kicker="Слов до победы"
          hint="от 20 до 100"
          value={score}
          unit="слов"
          tone="orange"
          min={10}
          max={100}
          step={5}
          onChange={onScore}
        />
      </div>
      <div style={{ marginTop: 18 }}>
        <PrimaryButton onClick={onClose} height={52}>
          Сохранить
        </PrimaryButton>
      </div>
    </ModalShell>
  )
}

// ──────────────────────────────────────────────────────────
// Join code modal
// ──────────────────────────────────────────────────────────

function JoinCodeModal(props: {
  open: boolean
  onClose: () => void
  onSubmit: (roomCode: string) => void
  variant: 'sheet' | 'centered'
}) {
  // Remount inner state on every open transition so the code field always
  // starts empty without needing a setState-in-effect.
  return <JoinCodeModalInner key={props.open ? 'open' : 'closed'} {...props} />
}

function JoinCodeModalInner({
  open,
  onClose,
  onSubmit,
  variant,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (roomCode: string) => void
  variant: 'sheet' | 'centered'
}) {
  const [code, setCode] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open])

  const handleInputChange = (raw: string) => {
    const cleaned = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)
    setCode(cleaned)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && code.length === 6) {
      event.preventDefault()
      onSubmit(code)
    }
  }

  const cells = [0, 1, 2, 3, 4, 5]
  const filledCount = code.length
  const remaining = 6 - filledCount
  const submitDisabled = filledCount < 6

  return (
    <ModalShell open={open} onClose={onClose} variant={variant} zIndex={52} width={440}>
      <SheetHeader kicker="Ввод кода" title="Войти в игру" onClose={onClose} />
      <p
        style={{
          margin: '12px 0 20px',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--color-text-sec)',
          lineHeight: 1.45,
        }}
      >
        Введи код комнаты, который показывает организатор
      </p>

      {/* hidden input captures keystrokes */}
      <input
        ref={inputRef}
        value={code}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoCapitalize="characters"
        autoComplete="off"
        inputMode="text"
        aria-label="Код комнаты"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
          marginBottom: 20,
          cursor: 'text',
        }}
      >
        {cells.map((i) => {
          const isFilled = i < filledCount
          const isNext = i === filledCount
          const ch = code[i] ?? ''
          return (
            <div
              key={i}
              style={{
                flex: 1,
                aspectRatio: '1 / 1.15',
                borderRadius: 16,
                background: isFilled ? 'rgba(124,58,237,0.10)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${
                  isNext
                    ? 'var(--color-accent)'
                    : isFilled
                      ? 'rgba(124,58,237,0.30)'
                      : 'var(--color-border)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 800,
                color: isFilled ? 'var(--color-text)' : 'var(--color-text-mute)',
                boxShadow: isNext ? '0 0 0 4px rgba(124,58,237,0.18)' : 'none',
                position: 'relative',
                fontFamily: FONT_SANS,
              }}
            >
              {ch}
              {isNext ? (
                <span
                  style={{
                    position: 'absolute',
                    width: 2,
                    height: 28,
                    background: 'var(--color-accent)',
                    animation: 'blink 1s infinite',
                  }}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      <PrimaryButton
        type="submit"
        disabled={submitDisabled}
        onClick={() => {
          if (!submitDisabled) {
            onSubmit(code)
          }
        }}
      >
        {submitDisabled
          ? `Введи ещё ${remaining} ${declineCharacters(remaining)}`
          : 'Войти в комнату'}
      </PrimaryButton>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          borderRadius: 14,
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.2)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(56,189,248,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconQR />
        </div>
        <div style={{ flex: 1, fontSize: 14, color: 'var(--color-text)', fontWeight: 500, lineHeight: 1.4 }}>
          Или отсканируй QR-код
          <br />
          <span style={{ color: 'var(--color-text-sec)', fontSize: 13 }}>у организатора игры</span>
        </div>
      </div>
    </ModalShell>
  )
}

function declineCharacters(n: number): string {
  // RU plural for "символ"
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs >= 11 && abs <= 14) return 'символов'
  if (last === 1) return 'символ'
  if (last >= 2 && last <= 4) return 'символа'
  return 'символов'
}

// ──────────────────────────────────────────────────────────
// Top-right settings button
// ──────────────────────────────────────────────────────────

function SettingsIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Настройки"
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
      }}
    >
      <IconGear />
    </button>
  )
}

// ──────────────────────────────────────────────────────────
// Mobile layout
// ──────────────────────────────────────────────────────────

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
  const createDisabled = !hasName || isCreating
  const joinDisabled = !hasName

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_SANS,
        background: 'var(--color-bg-deep)',
        color: 'var(--color-text)',
      }}
    >
      <AmbientBg />

      {/* top bar */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '24px 20px 0',
        }}
      >
        <SettingsIconButton onClick={() => setSettingsOpen(true)} />
      </div>

      {/* main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
          padding: '20px 24px 0',
        }}
      >
        {/* hero */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '2px',
              marginBottom: 12,
              textTransform: 'uppercase',
            }}
          >
            Party game · до 10 человек
          </div>
          <Logo size={64} />
          <p
            style={{
              fontSize: 17,
              color: 'var(--color-text-sec)',
              margin: '16px 0 0',
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            Объясняй слова.
            <br />
            Угадывай с командой.
            <br />
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Побеждай.</span>
          </p>
        </div>

        {/* name input */}
        <NameInput playerName={playerName} onPlayerNameChange={onPlayerNameChange} />

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton
            disabled={createDisabled}
            onClick={() => {
              void onCreateGame()
            }}
          >
            {isCreating ? 'Создание…' : 'Создать игру'}
          </PrimaryButton>
          <GhostButton disabled={joinDisabled} onClick={() => setJoinOpen(true)}>
            Войти по коду
          </GhostButton>
          <HowToPlayButton />
          {errorMessage ? (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-danger)',
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '20px 0 24px',
          fontSize: 11,
          color: 'var(--color-text-mute)',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        v2.0 · poyasni.ru
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timer={roundTime}
        score={scoreToWin}
        onTimer={onRoundTimeChange}
        onScore={onScoreToWinChange}
        variant="sheet"
      />

      <JoinCodeModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={(roomCode) => {
          onJoinGame(roomCode)
          setJoinOpen(false)
        }}
        variant="sheet"
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Desktop layout
// ──────────────────────────────────────────────────────────

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const hasName = playerName.trim().length >= 2
  const createDisabled = !hasName || isCreating
  const joinDisabled = !hasName

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minHeight: 640,
        marginLeft: 'calc(50% - 50vw)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT_SANS,
        background: 'var(--color-bg-deep)',
        color: 'var(--color-text)',
      }}
    >
      <AmbientBg />

      {/* settings icon */}
      <div
        style={{
          position: 'absolute',
          top: 28,
          right: 32,
          zIndex: 20,
        }}
      >
        <SettingsIconButton onClick={() => setSettingsOpen(true)} />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          alignItems: 'center',
          padding: '0 64px 0 80px',
          gap: 48,
        }}
      >
        {/* hero */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-accent)',
              letterSpacing: '3px',
              marginBottom: 24,
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--color-accent)',
                boxShadow: '0 0 8px rgba(124,58,237,0.8)',
              }}
            />
            Party game · до 10 человек
          </div>
          <Logo size={120} />
          <p
            style={{
              fontSize: 26,
              color: 'var(--color-text-sec)',
              margin: '32px 0 0',
              lineHeight: 1.3,
              fontWeight: 500,
              maxWidth: 520,
            }}
          >
            Объясняй слова. Угадывай с командой.
            <br />
            <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>Побеждай.</span>
          </p>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 40,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {[
              { color: 'var(--color-success)', glow: '#22C55E', label: 'Без установки' },
              { color: 'var(--color-blue)', glow: '#38BDF8', label: 'QR-код для друзей' },
              { color: 'var(--color-orange)', glow: '#FB923C', label: '4–10 игроков' },
            ].map((dot) => (
              <span
                key={dot.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  color: 'var(--color-text-mute)',
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: dot.color,
                    boxShadow: `0 0 8px ${dot.glow}`,
                  }}
                />
                {dot.label}
              </span>
            ))}
          </div>
        </div>

        {/* action card */}
        <div
          style={{
            padding: 32,
            borderRadius: 28,
            background: 'rgba(16,20,38,0.7)',
            border: '1px solid var(--color-border-hi)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <NameInput
            playerName={playerName}
            onPlayerNameChange={onPlayerNameChange}
            inputFontSize={18}
            avatarSize={36}
          />
          <PrimaryButton
            disabled={createDisabled}
            onClick={() => {
              void onCreateGame()
            }}
          >
            {isCreating ? 'Создание…' : 'Создать игру'}
          </PrimaryButton>
          <GhostButton disabled={joinDisabled} onClick={() => setJoinOpen(true)}>
            Войти по коду
          </GhostButton>
          <HowToPlayButton />
          {errorMessage ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-danger)',
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 0 20px',
          fontSize: 11,
          color: 'var(--color-text-mute)',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}
      >
        v2.0 · poyasni.ru
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        timer={roundTime}
        score={scoreToWin}
        onTimer={onRoundTimeChange}
        onScore={onScoreToWinChange}
        variant="centered"
      />

      <JoinCodeModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onSubmit={(roomCode) => {
          onJoinGame(roomCode)
          setJoinOpen(false)
        }}
        variant="centered"
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Exported wrapper
// ──────────────────────────────────────────────────────────

export default function LandingScreen(props: LandingScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <LandingScreenDesktop {...props} /> : <LandingScreenMobile {...props} />
}
