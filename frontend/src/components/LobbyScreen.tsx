import { useState, type FC } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useBreakpoint from '../hooks/useBreakpoint'
import C from '../constants/colors'
import GlassPanel from './ui/GlassPanel'
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

function BlurredBg() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#04061a' }} />
      <div style={{ position: 'absolute', top: '-25%', left: '-35%', width: '95%', height: '75%', borderRadius: '50%', background: 'radial-gradient(circle, #2a1472 0%, transparent 68%)', filter: 'blur(65px)', opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: '5%', right: '-25%', width: '75%', height: '65%', borderRadius: '50%', background: 'radial-gradient(circle, #0d3060 0%, transparent 68%)', filter: 'blur(60px)', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '5%', width: '85%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, #1a0e5a 0%, transparent 68%)', filter: 'blur(72px)', opacity: 0.95 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '-15%', width: '60%', height: '50%', borderRadius: '50%', background: `radial-gradient(circle, ${C.purple}32 0%, transparent 68%)`, filter: 'blur(55px)', opacity: 0.65 }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.038, backgroundImage: 'linear-gradient(rgba(140,170,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(140,170,255,0.9) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  )
}

function QRCode({ size = 96 }: { size?: number }) {
  const cell = size / 21
  const modules = [
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,0,1,0,1,1,0,1,1,0,1,0,1],
    [0,1,0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,1,0,1,0],
    [1,0,1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1],
    [0,1,0,1,0,0,0,0,1,0,0,1,0,0,1,0,0,1,0,1,0],
    [1,0,1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,1,1,1,0,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,1,0,1,0,1,1,0,1],
  ]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <rect width={size} height={size} rx="6" fill="rgba(255,255,255,0.96)" />
      {modules.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell + 0.5} y={r * cell + 0.5} width={cell - 0.5} height={cell - 0.5} fill="#0a0620" /> : null,
        ),
      )}
    </svg>
  )
}

const PlayerRow: FC<{ name: string; isHost: boolean; color: string; index: number }> = ({ name, isHost, color, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 340, damping: 28 }}
    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '10px', background: `${color}0d`, border: `1px solid ${color}20` }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${color}cc 0%, ${color}55 100%)`,
        boxShadow: `0 0 10px ${color}60`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        fontWeight: 900,
        color: '#fff',
      }}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>

    <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {name}
    </span>

    {isHost ? (
      <span style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.purple, padding: '2px 6px', borderRadius: '4px', background: `${C.purple}18`, border: `1px solid ${C.purple}35` }}>
        HOST
      </span>
    ) : null}
  </motion.div>
)

const WaitingSlot: FC<{ color: string }> = ({ color }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.55, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '10px', border: `1px dashed ${color}25` }}
  >
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1.5px dashed ${color}35`, flexShrink: 0 }} />
    <span style={{ fontSize: '12px', fontWeight: 600, color: `${color}40`, letterSpacing: '0.08em', fontStyle: 'italic' }}>Ожидание...</span>
  </motion.div>
)

const TeamPanel: FC<{ label: string; color: string; players: LobbyPlayer[]; maxPlayers?: number }> = ({ label, color, players, maxPlayers = 5 }) => {
  const slots = maxPlayers - players.length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', borderRadius: '16px', border: `1.5px solid ${color}50`, background: `linear-gradient(160deg, ${color}0a 0%, rgba(4,6,26,0.7) 100%)`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: `0 0 0 1px ${color}15, 0 4px 24px rgba(0,0,0,0.5), 0 0 40px ${color}18`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${color}20`, background: `linear-gradient(90deg, ${color}15 0%, transparent 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', color, textTransform: 'uppercase', textShadow: `0 0 14px ${color}` }}>{label}</span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: `${color}80`, letterSpacing: '0.06em' }}>
          {players.length}/{maxPlayers}
        </span>
      </div>

      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
        {players.map((p, i) => (
          <PlayerRow key={`${p.name}-${i}`} name={p.name} isHost={p.isHost} color={color} index={i} />
        ))}
        {Array.from({ length: Math.max(0, slots) }).map((_, i) => (
          <WaitingSlot key={`wait-${label}-${i}`} color={color} />
        ))}
      </div>
    </div>
  )
}

function RoomCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard?.writeText(code).catch(() => undefined)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      whileTap={{ scale: 0.96 }}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(8,8,28,0.9) 0%, rgba(20,12,50,0.95) 100%)', border: `1px solid ${C.purple}45`, boxShadow: `0 0 0 1px ${C.purple}15, 0 4px 20px rgba(0,0,0,0.5), 0 0 28px ${C.purple}18`, cursor: 'pointer', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div>
        <div style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.2em', color: `${C.purple}88`, textTransform: 'uppercase', marginBottom: '2px' }}>КОД КОМНАТЫ</div>
        <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '0.14em', color: '#fff', textShadow: `0 0 20px ${C.purple}cc, 0 0 40px ${C.purple}60` }}>{code}</div>
      </div>

      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 9L7 13L15 5" stroke={C.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        ) : (
          <motion.div key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="5" y="1" width="10" height="10" rx="2" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" />
              <path d="M1 5v9a2 2 0 0 0 2 2h9" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

const StartButton: FC<{ onClick?: () => void; canStart: boolean; wordsExhausted?: boolean }> = ({ onClick, canStart, wordsExhausted = false }) => (
  <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
    {canStart ? (
      <>
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: '-6px', borderRadius: '18px', border: `2px solid ${C.green}`, pointerEvents: 'none' }}
        />
        <motion.div
          animate={{ scale: [1, 1.32, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
          style={{ position: 'absolute', inset: '-6px', borderRadius: '18px', border: `2px solid ${C.green}`, pointerEvents: 'none' }}
        />
      </>
    ) : null}

    <motion.button
      type="button"
      onClick={canStart ? onClick : undefined}
      whileTap={canStart ? { scale: 0.96, y: 3 } : {}}
      whileHover={canStart ? { scale: 1.02 } : {}}
      transition={{ type: 'spring', stiffness: 460, damping: 22 }}
      style={{ width: '100%', padding: '18px 0', borderRadius: '16px', border: canStart ? `2px solid ${C.green}70` : '2px solid rgba(255,255,255,0.1)', background: canStart ? `linear-gradient(135deg, ${C.green}dd 0%, #22c55e 50%, #16a34a 100%)` : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', boxShadow: canStart ? `0 6px 0 #15803d, 0 8px 30px ${C.green}55, 0 0 60px ${C.green}30, inset 0 1px 0 rgba(255,255,255,0.35)` : '0 4px 0 rgba(0,0,0,0.3)', cursor: canStart ? 'pointer' : 'not-allowed', position: 'relative', overflow: 'hidden' }}
    >
      {canStart ? <div style={{ position: 'absolute', top: '6px', left: '15%', right: '15%', height: '10px', borderRadius: '9999px', background: 'linear-gradient(180deg, rgba(255,255,255,0.45) 0%, transparent 100%)', opacity: 0.5, pointerEvents: 'none' }} /> : null}
      <span style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: canStart ? '#fff' : 'rgba(255,255,255,0.25)', textShadow: canStart ? '0 1px 8px rgba(0,0,0,0.3)' : 'none', position: 'relative' }}>
        {wordsExhausted ? 'Все слова разыграны. На главную' : canStart ? 'НАЧАТЬ ИГРУ' : 'ОЖИДАНИЕ НАЧАЛА ИГРЫ...'}
      </span>
    </motion.button>
  </div>
)

function QRPanel({ roomCode }: { roomCode: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '14px 12px', borderRadius: '16px', background: 'linear-gradient(160deg, rgba(167,139,250,0.08) 0%, rgba(4,6,26,0.7) 100%)', border: `1px solid ${C.purple}35`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: `0 0 0 1px ${C.purple}12, 0 4px 20px rgba(0,0,0,0.45), 0 0 30px ${C.purple}15` }}>
      <span style={{ fontSize: '8px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${C.purple}80` }}>СКАНИРУЙ</span>
      <div style={{ padding: '6px', borderRadius: '10px', background: 'rgba(255,255,255,0.96)', boxShadow: `0 0 0 1px ${C.purple}40, 0 0 20px ${C.purple}50` }}>
        <QRCode size={88} />
      </div>
      <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>или введи код</span>
      <div style={{ padding: '4px 10px', borderRadius: '8px', background: `${C.purple}18`, border: `1px solid ${C.purple}35` }}>
        <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.18em', color: C.purple, textShadow: `0 0 12px ${C.purple}` }}>{roomCode}</span>
      </div>
    </div>
  )
}

const DEMO_A: LobbyPlayer[] = [
  { name: 'Viper_X', isHost: true },
  { name: 'NeonDrift', isHost: false },
  { name: 'CyberPunk', isHost: false },
]

const DEMO_B: LobbyPlayer[] = [
  { name: 'Rogue_1', isHost: false },
  { name: 'Blaze_Op', isHost: false },
]

function LobbyScreenMobile({ roomCode = 'XPVVK4', teamA = DEMO_A, teamB = DEMO_B, maxPlayers = 5, isHost = true, wordsExhausted = false, onStart }: LobbyScreenProps) {
  const canStart = isHost && teamA.length >= 2 && teamB.length >= 2

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 108px)', minHeight: '640px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", maxWidth: '430px', margin: '0 auto', borderRadius: '36px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <BlurredBg />

      {[C.blue, C.purple, C.green, C.orange, C.purple, C.blue].map((col, i) => (
        <motion.div
          key={`${col}-${i}`}
          style={{ position: 'absolute', zIndex: 1, width: `${3 + (i % 3) * 2}px`, height: `${3 + (i % 3) * 2}px`, borderRadius: '50%', left: `${10 + i * 16}%`, top: `${10 + (i % 5) * 16}%`, background: col, boxShadow: `0 0 8px ${col}`, pointerEvents: 'none' }}
          animate={{ y: [-10, 10, -10], opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 2.8 + i * 0.45, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 16px 14px', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '2px' }}>ЛОББИ</div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1, textShadow: `0 0 30px ${C.purple}80` }}>ПОЯСНИ</h1>
        </div>

        <RoomCodeBadge code={roomCode} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, height: '1px', opacity: 0.18, marginBottom: '2px', background: `linear-gradient(90deg, transparent, ${C.blue}88, ${C.purple}, ${C.orange}88, transparent)` }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px 0' }}>
        <QRPanel roomCode={roomCode} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', alignSelf: 'stretch', justifyContent: 'center' }}>
          <div style={{ padding: '12px 14px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(8,8,28,0.88) 0%, rgba(16,8,40,0.92) 100%)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>ИГРОКОВ</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '32px', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 20px ${C.blue}` }}>{teamA.length + teamB.length}</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>/ {maxPlayers * 2}</span>
            </div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '12px', background: `${C.blue}0f`, border: `1px solid ${C.blue}28`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
              <circle cx="13" cy="3" r="2" stroke={C.blue} strokeWidth="1.4" />
              <circle cx="13" cy="13" r="2" stroke={C.blue} strokeWidth="1.4" />
              <circle cx="3" cy="8" r="2" stroke={C.blue} strokeWidth="1.4" />
              <path d="M5 8.5L11 4M5 7.5L11 12" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 700, color: `${C.blue}99`, lineHeight: 1.3 }}>
              Поделись ссылкой,
              <br />
              чтобы позвать друзей
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: '10px', padding: '12px 14px 0', flex: 1, minHeight: 0 }}>
        <TeamPanel label="Team A" color={C.blue} players={teamA} maxPlayers={maxPlayers} />
        <TeamPanel label="Team B" color={C.orange} players={teamB} maxPlayers={maxPlayers} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '14px 14px 32px' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: canStart ? `radial-gradient(ellipse 70% 80% at 50% 100%, ${C.green}18 0%, transparent 65%)` : 'none' }} />
        <StartButton onClick={onStart} canStart={canStart} wordsExhausted={wordsExhausted} />
      </div>
    </div>
  )
}

export type { LobbyPlayer, LobbyScreenProps }

function LobbyScreenDesktop({ roomCode = 'XPVVK4', teamA = DEMO_A, teamB = DEMO_B, maxPlayers = 5, isHost = true, wordsExhausted = false, onStart }: LobbyScreenProps) {
  const totalPlayers = teamA.length + teamB.length
  const canStart = isHost && totalPlayers >= 4

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '640px', marginLeft: 'calc(50% - 50vw)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      <BlurredBg />
      {[C.blue, C.purple, C.green, C.orange, C.purple, C.blue].map((col, i) => (
        <motion.div
          key={`${col}-${i}`}
          style={{ position: 'absolute', zIndex: 1, width: `${3 + (i % 3) * 2}px`, height: `${3 + (i % 3) * 2}px`, borderRadius: '50%', left: `${10 + i * 16}%`, top: `${10 + (i % 5) * 16}%`, background: col, boxShadow: `0 0 8px ${col}`, pointerEvents: 'none' }}
          animate={{ y: [-10, 10, -10], opacity: [0.3, 0.65, 0.3] }}
          transition={{ duration: 2.8 + i * 0.45, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 40px 16px' }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>ЛОББИ · ОЖИДАНИЕ ИГРОКОВ</div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: '#fff', textShadow: `0 0 30px ${C.purple}60` }}>ПОЯСНИ</h1>
        </div>
        <RoomCodeBadge code={roomCode} />
      </div>
      <div style={{ height: '1px', opacity: 0.15, background: `linear-gradient(90deg,transparent,${C.blue}88,${C.purple},${C.orange}88,transparent)`, margin: '0 40px' }} />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 1fr', gap: '20px', padding: '20px 40px 0', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <GlassPanel color={`${C.purple}0a`} border={`${C.purple}30`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.22em', textTransform: 'uppercase', color: `${C.purple}99`, marginBottom: '2px' }}>Пригласить</div>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.96)', boxShadow: `0 0 0 1px ${C.purple}40,0 0 24px ${C.purple}50` }}>
              <QRCodeUi size={120} />
            </div>
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>или введи код</span>
            <div style={{ padding: '4px 14px', borderRadius: '8px', background: `${C.purple}18`, border: `1px solid ${C.purple}35` }}>
              <span style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.18em', color: C.purple, textShadow: `0 0 12px ${C.purple}` }}>{roomCode}</span>
            </div>
          </GlassPanel>

          <GlassPanel style={{ padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>ИГРОКОВ ОНЛАЙН</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${C.blue}` }}>{totalPlayers}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>/ {maxPlayers * 2}</span>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel color={`${C.blue}0a`} border={`${C.blue}25`} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: `${C.blue}99`, lineHeight: 1.4 }}>Поделись ссылкой, чтобы позвать друзей в игру</span>
          </GlassPanel>
        </div>

        <GlassPanel color={`${C.blue}09`} border={`${C.blue}50`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `0 0 0 1px ${C.blue}12,0 8px 32px rgba(0,0,0,0.5),0 0 50px ${C.blue}18` }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.blue}20`, background: `linear-gradient(90deg,${C.blue}12,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue, textShadow: `0 0 14px ${C.blue}` }}>Team A</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: `${C.blue}70` }}>{teamA.length}/{maxPlayers}</span>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
            {teamA.map((p, i) => <PlayerRow key={`${p.name}-${i}`} {...p} color={C.blue} index={i} />)}
            {Array.from({ length: Math.max(0, maxPlayers - teamA.length) }).map((_, i) => <WaitingSlot key={`a-${i}`} color={C.blue} />)}
          </div>
        </GlassPanel>

        <GlassPanel color={`${C.orange}09`} border={`${C.orange}50`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: `0 0 0 1px ${C.orange}12,0 8px 32px rgba(0,0,0,0.5),0 0 50px ${C.orange}18` }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.orange}20`, background: `linear-gradient(90deg,${C.orange}12,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.orange, textShadow: `0 0 14px ${C.orange}` }}>Team B</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: `${C.orange}70` }}>{teamB.length}/{maxPlayers}</span>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto' }}>
            {teamB.map((p, i) => <PlayerRow key={`${p.name}-${i}`} {...p} color={C.orange} index={i} />)}
            {Array.from({ length: Math.max(0, maxPlayers - teamB.length) }).map((_, i) => <WaitingSlot key={`b-${i}`} color={C.orange} />)}
          </div>
        </GlassPanel>
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '16px 40px 28px' }}>
        <div style={{ position: 'relative' }}>
          {canStart ? <motion.div animate={{ scale: [1, 1.04, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: 'absolute', inset: '-4px', borderRadius: '18px', border: `2px solid ${C.green}`, pointerEvents: 'none' }} /> : null}
          <motion.button whileTap={canStart ? { scale: 0.98, y: 3 } : {}} whileHover={canStart ? { scale: 1.01 } : {}} type="button" onClick={canStart ? onStart : undefined} style={{ width: '100%', padding: '18px', borderRadius: '16px', border: canStart ? `2px solid ${C.green}60` : '2px solid rgba(255,255,255,0.08)', background: canStart ? `linear-gradient(135deg,#22c55e,${C.green},#16a34a)` : 'rgba(255,255,255,0.04)', boxShadow: canStart ? `0 7px 0 #15803d,0 10px 35px ${C.green}45,inset 0 1px 0 rgba(255,255,255,0.3)` : 'none', cursor: canStart ? 'pointer' : 'not-allowed' }}>
            <span style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: canStart ? '#fff' : 'rgba(255,255,255,0.2)', textShadow: canStart ? '0 1px 8px rgba(0,0,0,0.25)' : 'none' }}>
              {wordsExhausted ? 'Все слова разыграны. На главную' : canStart ? '✦ НАЧАТЬ ИГРУ ✦' : 'ОЖИДАНИЕ НАЧАЛА ИГРЫ...'}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default function LobbyScreen(props: LobbyScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <LobbyScreenDesktop {...props} /> : <LobbyScreenMobile {...props} />
}
