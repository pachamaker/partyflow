import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useBreakpoint from '../hooks/useBreakpoint'
import C from '../constants/colors'
import GlassPanel from './ui/GlassPanel'

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

const DEFAULT_TEAM_A: TeamResult = {
  label: 'Команда А',
  score: 52,
  players: [
    { id: 'a1', name: 'Паша', guessed: 18, isHost: true },
    { id: 'a2', name: 'Дима', guessed: 12, isHost: false },
    { id: 'a3', name: 'Лена', guessed: 9, isHost: false },
  ],
}

const DEFAULT_TEAM_B: TeamResult = {
  label: 'Команда Б',
  score: 47,
  players: [
    { id: 'b1', name: 'Саша', guessed: 15, isHost: true },
    { id: 'b2', name: 'Катя', guessed: 10, isHost: false },
    { id: 'b3', name: 'Олег', guessed: 8, isHost: false },
    { id: 'b4', name: 'Рита', guessed: 6, isHost: false },
  ],
}

function Confetti({ active }: { active: boolean }) {
  const [pieces] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: [C.orange, C.blue, C.green, C.purple, C.pink, C.yellow][i % 6],
      x: `${3 + ((i * 1.9) % 94)}%`,
      delay: (i * 0.06) % 2,
      size: 5 + (i % 4) * 3,
      shape: i % 3 === 0 ? 'circle' : 'rect',
    })),
  )

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, overflow: 'hidden' }}>
      <AnimatePresence>
        {active
          ? pieces.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{ y: -40, opacity: 1 }}
                animate={{ y: '110vh', opacity: [1, 1, 0.6, 0] }}
                transition={{ duration: 3 + Math.random() * 1.5, delay: piece.delay, ease: 'easeIn' }}
                style={{ position: 'absolute', left: piece.x, top: '-10px', width: `${piece.size}px`, height: piece.shape === 'circle' ? `${piece.size}px` : `${piece.size * 0.6}px`, borderRadius: piece.shape === 'circle' ? '50%' : '2px', background: piece.color, boxShadow: `0 0 6px ${piece.color}80` }}
              />
            ))
          : null}
      </AnimatePresence>
    </div>
  )
}

function BlurredBg({ accentColor }: { accentColor: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#020817' }} />
      <div style={{ position: 'absolute', top: '-20%', left: '-15%', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle,#1e0d5c 0%,transparent 65%)', filter: 'blur(80px)', opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: '5%', right: '-20%', width: '65%', height: '60%', borderRadius: '50%', background: 'radial-gradient(circle,#0c2060 0%,transparent 65%)', filter: 'blur(70px)', opacity: 0.8 }} />
      <div style={{ position: 'absolute', bottom: '-15%', left: '10%', width: '80%', height: '65%', borderRadius: '50%', background: 'radial-gradient(circle,#16084a 0%,transparent 65%)', filter: 'blur(80px)', opacity: 1 }} />
      <motion.div animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 4, repeat: Infinity }} style={{ position: 'absolute', top: '30%', left: '40%', width: '40%', height: '40%', borderRadius: '50%', background: `radial-gradient(circle,${accentColor}22 0%,transparent 65%)`, filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.035, backgroundImage: 'linear-gradient(rgba(140,170,255,0.9) 1px,transparent 1px),linear-gradient(90deg,rgba(140,170,255,0.9) 1px,transparent 1px)', backgroundSize: '44px 44px' }} />
    </div>
  )
}

function PlayerResultRow({
  player,
  color,
  delay,
  isWinnerTeam,
  maxGuessed,
}: {
  player: TeamResultPlayer
  color: string
  delay: number
  isWinnerTeam: boolean
  maxGuessed: number
}) {
  const isTopScorer = player.guessed === maxGuessed && maxGuessed > 0

  return (
    <motion.div initial={{ opacity: 0, x: isWinnerTeam ? -14 : 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', background: `${color}0c`, border: `1px solid ${color}18` }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0, background: `linear-gradient(135deg,${color}cc,${color}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: '#fff' }}>{player.name[0]?.toUpperCase() ?? '?'}</div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{player.name}</span>
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', minWidth: '40px', textAlign: 'right' }}>
        {player.guessed} сл.
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
        {isTopScorer ? <span style={{ fontSize: '12px', color: C.yellow }}>🏆</span> : null}
        {player.isHost ? <span style={{ fontSize: '12px' }}>⭐</span> : null}
      </div>
    </motion.div>
  )
}

function GameResultScreenMobile({ winnerTeam = 'A', teamA = DEFAULT_TEAM_A, teamB = DEFAULT_TEAM_B, canPlayAgain = false, onPlayAgain, onHome }: GameResultScreenProps) {
  const winnerColor = winnerTeam === 'A' ? C.blue : C.orange
  const winnerLabel = winnerTeam === 'A' ? teamA.label : teamB.label
  const [dispA, setDispA] = useState(0)
  const [dispB, setDispB] = useState(0)
  const rankedA = useMemo(() => [...teamA.players].sort((left, right) => right.guessed - left.guessed), [teamA.players])
  const rankedB = useMemo(() => [...teamB.players].sort((left, right) => right.guessed - left.guessed), [teamB.players])
  const bestA = rankedA.length > 0 ? Math.max(...rankedA.map((player) => player.guessed)) : 0

  useEffect(() => {
    let frame = 0
    const total = 40
    const timer = window.setInterval(() => {
      frame += 1
      const pct = Math.min(frame / total, 1)
      const ease = 1 - Math.pow(1 - pct, 3)
      setDispA(Math.round(ease * teamA.score))
      setDispB(Math.round(ease * teamB.score))
      if (frame >= total) window.clearInterval(timer)
    }, 28)

    return () => window.clearInterval(timer)
  }, [teamA.score, teamB.score])

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 108px)', minHeight: '640px', width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "'Arial Black', 'Impact', system-ui, sans-serif", maxWidth: '430px', margin: '0 auto', borderRadius: '36px', border: '1px solid rgba(255,255,255,0.1)' }}>
      <BlurredBg accentColor={winnerColor} />
      <Confetti active />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '24px 16px 0', gap: '14px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '4px', color: C.yellow, fontSize: '22px' }}>♛</div>
          <h1 style={{ margin: 0, fontSize: 'clamp(3rem, 16vw, 4.6rem)', fontWeight: 900, color: '#fff', textShadow: `0 0 30px ${winnerColor}` }}>ПОБЕДА!</h1>
          <div style={{ marginTop: '8px', display: 'inline-block', padding: '5px 18px', borderRadius: '9999px', border: `1.5px solid ${winnerColor}60`, background: `${winnerColor}20` }}>
            <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: winnerColor }}>{winnerLabel}</span>
          </div>
        </div>

        <GlassPanel style={{ padding: '14px 14px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '46px', fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${C.blue}` }}>{dispA}</span>
            <span style={{ fontSize: '46px', fontWeight: 900, color: 'rgba(255,255,255,0.45)' }}>{dispB}</span>
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            style={{ height: '8px', borderRadius: '9999px', background: `linear-gradient(90deg,${C.blue} 0%,${C.blue} ${(teamA.score / Math.max(teamA.score + teamB.score, 1)) * 100}%,${C.orange} ${(teamA.score / Math.max(teamA.score + teamB.score, 1)) * 100}%,${C.orange} 100%)`, transformOrigin: 'left', boxShadow: `0 0 12px ${C.blue}60` }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: `${C.blue}80`, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Команда А</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: `${C.orange}80`, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Команда Б</span>
          </div>
        </GlassPanel>

        <GlassPanel color={`${C.blue}10`} border={`${C.blue}40`} style={{ padding: '12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px' }}>👑</span>
            <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue }}>{teamA.label}</span>
            {winnerTeam === 'A' ? <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 900, padding: '2px 8px', borderRadius: '6px', background: `${C.yellow}22`, border: `1px solid ${C.yellow}40`, color: C.yellow }}>ПОБЕДА</span> : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rankedA.map((player, index) => {
              const isBest = player.guessed === bestA
              return (
                <motion.div key={player.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45 + index * 0.08 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: isBest ? `${C.yellow}10` : `${C.blue}0c`, border: isBest ? `1px solid ${C.yellow}33` : `1px solid ${C.blue}18` }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: `linear-gradient(135deg,${C.blue}cc,${C.blue}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{player.name[0]?.toUpperCase() ?? '?'}</div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff', flex: 1 }}>{player.name}</span>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: isBest ? C.yellow : 'rgba(255,255,255,0.45)' }}>{player.guessed} сл.</span>
                  {isBest ? <span style={{ fontSize: '14px', color: C.yellow }}>🏆</span> : null}
                </motion.div>
              )
            })}
          </div>
        </GlassPanel>

        <GlassPanel color={`${C.orange}08`} border={`${C.orange}30`} style={{ padding: '12px 12px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.orange }}>{teamB.label}</span>
            {winnerTeam === 'B' ? <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 900, padding: '2px 8px', borderRadius: '6px', background: `${C.yellow}22`, border: `1px solid ${C.yellow}40`, color: C.yellow }}>ПОБЕДА</span> : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rankedB.map((player, index) => (
              <motion.div key={player.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + index * 0.08 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: `${C.orange}0c`, border: `1px solid ${C.orange}18` }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '10px', background: `linear-gradient(135deg,${C.orange}cc,${C.orange}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{player.name[0]?.toUpperCase() ?? '?'}</div>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'rgba(255,255,255,0.86)', flex: 1 }}>{player.name}</span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: 'rgba(255,255,255,0.45)' }}>{player.guessed} сл.</span>
              </motion.div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div style={{ position: 'relative', zIndex: 10, padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'linear-gradient(0deg, rgba(2,8,23,0.95) 60%, transparent 100%)' }}>
        {canPlayAgain ? (
          <button type="button" onClick={onPlayAgain} style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: `linear-gradient(135deg, #22c55e, ${C.green}, #16a34a)`, color: '#fff', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>↻ Сыграть ещё раз</button>
        ) : (
          <div style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center' }}>Ждем нового хоста</div>
        )}
        <button type="button" onClick={onHome} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>⌂ На главную</button>
      </div>
    </div>
  )
}

function GameResultScreenDesktop({ winnerTeam = 'A', teamA = DEFAULT_TEAM_A, teamB = DEFAULT_TEAM_B, canPlayAgain = false, onPlayAgain, onHome }: GameResultScreenProps) {
  const winnerColor = winnerTeam === 'A' ? C.blue : C.orange
  const winnerLabel = winnerTeam === 'A' ? teamA.label : teamB.label
  const [dispA, setDispA] = useState(0)
  const [dispB, setDispB] = useState(0)

  const rankedA = useMemo(
    () => [...teamA.players].sort((left, right) => right.guessed - left.guessed),
    [teamA.players],
  )
  const rankedB = useMemo(
    () => [...teamB.players].sort((left, right) => right.guessed - left.guessed),
    [teamB.players],
  )
  const maxGuessed = useMemo(
    () => Math.max(0, ...teamA.players.map((player) => player.guessed), ...teamB.players.map((player) => player.guessed)),
    [teamA.players, teamB.players],
  )

  useEffect(() => {
    let frame = 0
    const total = 40
    const timer = window.setInterval(() => {
      frame += 1
      const pct = Math.min(frame / total, 1)
      const ease = 1 - Math.pow(1 - pct, 3)
      setDispA(Math.round(ease * teamA.score))
      setDispB(Math.round(ease * teamB.score))
      if (frame >= total) window.clearInterval(timer)
    }, 28)

    return () => window.clearInterval(timer)
  }, [teamA.score, teamB.score])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', minHeight: '640px', marginLeft: 'calc(50% - 50vw)', display: 'flex', overflow: 'hidden', fontFamily: "'Arial Black',system-ui,sans-serif" }}>
      <BlurredBg accentColor={winnerColor} />
      <Confetti active />

      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px 1fr', gap: 0, padding: 0 }}>
        <div style={{ padding: '28px 20px 28px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
          <GlassPanel color={`${C.blue}10`} border={`${C.blue}55`} style={{ padding: '20px', boxShadow: `0 0 0 1px ${C.blue}15,0 8px 32px rgba(0,0,0,0.5),0 0 60px ${C.blue}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue, textShadow: `0 0 12px ${C.blue}` }}>{teamA.label}</span>
              {winnerTeam === 'A' ? <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: `${C.yellow}22`, border: `1px solid ${C.yellow}40`, color: C.yellow }}>ПОБЕДА</span> : null}
            </div>
            <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: '64px', fontWeight: 900, color: '#fff', textShadow: `0 0 40px ${C.blue},0 0 80px ${C.blue}60`, textAlign: 'center', lineHeight: 1, marginBottom: '14px' }}>{dispA}</motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rankedA.map((player, index) => (
                <PlayerResultRow key={player.id} player={player} color={C.blue} delay={0.6 + index * 0.1} isWinnerTeam maxGuessed={maxGuessed} />
              ))}
            </div>
          </GlassPanel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', gap: '18px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.div initial={{ y: -50, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 18 }} style={{ textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem,4vw,4rem)', fontWeight: 900, color: '#fff', lineHeight: 0.95, textShadow: `0 0 40px ${winnerColor},0 0 80px ${winnerColor}70` }}>ПОБЕДА!</h1>
            <div style={{ padding: '5px 18px', borderRadius: '9999px', border: `1.5px solid ${winnerColor}60`, background: `${winnerColor}20`, boxShadow: `0 0 20px ${winnerColor}35`, display: 'inline-block', marginTop: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: winnerColor, textShadow: `0 0 12px ${winnerColor}` }}>{winnerLabel}</span>
            </div>
          </motion.div>

          <div style={{ width: '100%', padding: '14px 18px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff', textShadow: `0 0 20px ${C.blue}` }}>{dispA}</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>{dispB}</span>
            </div>
            <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1, duration: 0.7 }} style={{ height: '8px', borderRadius: '9999px', background: `linear-gradient(90deg,${C.blue} 0%,${C.blue} ${(teamA.score / Math.max(teamA.score + teamB.score, 1)) * 100}%,${C.orange} ${(teamA.score / Math.max(teamA.score + teamB.score, 1)) * 100}%,${C.orange} 100%)`, transformOrigin: 'left', boxShadow: `0 0 12px ${C.blue}60` }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {canPlayAgain ? (
              <motion.button whileTap={{ scale: 0.97, y: 3 }} whileHover={{ scale: 1.01 }} type="button" onClick={onPlayAgain} style={{ width: '100%', padding: '15px', borderRadius: '16px', border: `2px solid ${C.green}60`, background: `linear-gradient(135deg,#22c55e,${C.green},#16a34a)`, boxShadow: `0 7px 0 #15803d,0 10px 35px ${C.green}45,inset 0 1px 0 rgba(255,255,255,0.3)`, cursor: 'pointer' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>Сыграть еще раз</span>
              </motion.button>
            ) : (
              <div style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Ждем нового хоста</span>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={onHome} style={{ width: '100%', padding: '11px', borderRadius: '14px', border: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>На главную</span>
            </motion.button>
          </div>
        </div>

        <div style={{ padding: '28px 36px 28px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
          <GlassPanel color={`${C.orange}08`} border={`${C.orange}30`} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.orange }}>{teamB.label}</span>
              {winnerTeam === 'B' ? <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: `${C.yellow}22`, border: `1px solid ${C.yellow}40`, color: C.yellow }}>ПОБЕДА</span> : null}
            </div>
            <div style={{ fontSize: '64px', fontWeight: 900, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1, marginBottom: '14px' }}>{dispB}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rankedB.map((player, index) => (
                <PlayerResultRow key={player.id} player={player} color={C.orange} delay={0.7 + index * 0.1} isWinnerTeam={false} maxGuessed={maxGuessed} />
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}

export default function GameResultScreen(props: GameResultScreenProps) {
  const { isDesktop } = useBreakpoint()
  return isDesktop ? <GameResultScreenDesktop {...props} /> : <GameResultScreenMobile {...props} />
}

export type { GameResultScreenProps, TeamCode, TeamResult, TeamResultPlayer }
