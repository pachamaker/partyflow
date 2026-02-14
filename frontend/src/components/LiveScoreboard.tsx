import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { socket } from '../services/socket'

interface LiveScoreboardProps {
  roomId?: string
}

interface ScoreState {
  teamA: number
  teamB: number
}

const ROUND_DURATION_SEC = 60
const TIMER_RADIUS = 120
const TIMER_CIRCUMFERENCE = 2 * Math.PI * TIMER_RADIUS

function clampSeconds(value: number): number {
  return Math.max(0, Math.min(ROUND_DURATION_SEC, Math.round(value)))
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readEventData(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const raw = payload as { payload?: unknown; data?: unknown }

  if (raw.payload && typeof raw.payload === 'object') {
    return raw.payload as Record<string, unknown>
  }

  if (raw.data && typeof raw.data === 'object') {
    return raw.data as Record<string, unknown>
  }

  return payload as Record<string, unknown>
}

function getTimerColorClass(seconds: number): string {
  if (seconds <= 9) {
    return 'text-rose-400'
  }

  if (seconds <= 29) {
    return 'text-amber-300'
  }

  return 'text-emerald-400'
}

function getTimerStroke(seconds: number): string {
  if (seconds <= 9) {
    return '#fb7185'
  }

  if (seconds <= 29) {
    return '#fcd34d'
  }

  return '#34d399'
}

export function LiveScoreboard({ roomId }: LiveScoreboardProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(ROUND_DURATION_SEC)
  const [score, setScore] = useState<ScoreState>({ teamA: 0, teamB: 0 })
  const [isRoundEnded, setIsRoundEnded] = useState(false)
  const [scorePulseKey, setScorePulseKey] = useState(0)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const progress = remainingSeconds / ROUND_DURATION_SEC
  const strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - progress)
  const timerColorClass = getTimerColorClass(remainingSeconds)
  const timerStroke = getTimerStroke(remainingSeconds)
  const shouldPulseTimer = remainingSeconds <= 9 && !isRoundEnded

  const scoreDiffLabel = useMemo(() => {
    const diff = score.teamA - score.teamB
    if (diff === 0) {
      return 'Ничья'
    }

    return diff > 0 ? 'Team A ведёт' : 'Team B ведёт'
  }, [score.teamA, score.teamB])

  useEffect(() => {
    if (!socket.connected) {
      socket.connect()
    }

    const onTimerTick = (payload: unknown) => {
      const data = readEventData(payload)
      const seconds = readNumber(data?.remainingSeconds)

      if (seconds === null) {
        return
      }

      setRemainingSeconds(clampSeconds(seconds))
      setIsRoundEnded(seconds <= 0)
    }

    const onScoreUpdated = (payload: unknown) => {
      const data = readEventData(payload)
      const teamA = readNumber(data?.teamA) ?? readNumber(data?.newScoreTeamA)
      const teamB = readNumber(data?.teamB) ?? readNumber(data?.newScoreTeamB)

      const nestedScore = data?.newScore
      const nestedTeamA =
        typeof nestedScore === 'object' && nestedScore
          ? readNumber((nestedScore as Record<string, unknown>).teamA)
          : null
      const nestedTeamB =
        typeof nestedScore === 'object' && nestedScore
          ? readNumber((nestedScore as Record<string, unknown>).teamB)
          : null

      const nextTeamA = teamA ?? nestedTeamA
      const nextTeamB = teamB ?? nestedTeamB

      if (nextTeamA === null || nextTeamB === null) {
        return
      }

      setScore((current) => {
        if (current.teamA === nextTeamA && current.teamB === nextTeamB) {
          return current
        }

        setScorePulseKey((value) => value + 1)
        return { teamA: nextTeamA, teamB: nextTeamB }
      })
    }

    const onRoundEnded = () => {
      setRemainingSeconds(0)
      setIsRoundEnded(true)
    }

    socket.on('TIMER_TICK', onTimerTick)
    socket.on('SCORE_UPDATED', onScoreUpdated)
    socket.on('ROUND_ENDED', onRoundEnded)

    return () => {
      socket.off('TIMER_TICK', onTimerTick)
      socket.off('SCORE_UPDATED', onScoreUpdated)
      socket.off('ROUND_ENDED', onRoundEnded)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function activateWakeLock() {
      if (!('wakeLock' in navigator) || isRoundEnded) {
        return
      }

      try {
        const wakeLock = await navigator.wakeLock.request('screen')
        if (!isActive) {
          await wakeLock.release()
          return
        }

        wakeLockRef.current = wakeLock

        wakeLock.addEventListener('release', () => {
          if (wakeLockRef.current === wakeLock) {
            wakeLockRef.current = null
          }
        })
      } catch {
        wakeLockRef.current = null
      }
    }

    activateWakeLock()

    return () => {
      isActive = false
      if (wakeLockRef.current) {
        void wakeLockRef.current.release()
        wakeLockRef.current = null
      }
    }
  }, [isRoundEnded])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      if (!('wakeLock' in navigator) || isRoundEnded || wakeLockRef.current) {
        return
      }

      void navigator.wakeLock.request('screen').then((wakeLock) => {
        wakeLockRef.current = wakeLock
        wakeLock.addEventListener('release', () => {
          if (wakeLockRef.current === wakeLock) {
            wakeLockRef.current = null
          }
        })
      }).catch(() => {
        wakeLockRef.current = null
      })
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isRoundEnded])

  return (
    <section className="space-y-8 rounded-2xl border border-white/10 bg-secondary/70 p-6 md:p-10">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-white md:text-5xl">Live Scoreboard</h1>
        <p className="text-slate-300">Команды видят только таймер и счёт</p>
        <p className="text-sm text-slate-400">Комната: {roomId ?? '—'}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <motion.article
          key={`score-a-${scorePulseKey}`}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-6 text-center"
        >
          <p className="text-xl font-semibold text-cyan-200 md:text-2xl">Team A</p>
          <p className="text-7xl font-black leading-none text-white md:text-9xl">{score.teamA}</p>
        </motion.article>

        <motion.div
          animate={shouldPulseTimer ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={shouldPulseTimer ? { repeat: Infinity, duration: 0.8 } : { duration: 0.2 }}
          className="mx-auto flex flex-col items-center gap-2"
        >
          <svg width="300" height="300" viewBox="0 0 300 300" role="img" aria-label="Round timer">
            <circle cx="150" cy="150" r={TIMER_RADIUS} stroke="rgba(148,163,184,0.25)" strokeWidth="16" fill="none" />
            <motion.circle
              cx="150"
              cy="150"
              r={TIMER_RADIUS}
              stroke={timerStroke}
              strokeWidth="16"
              fill="none"
              strokeLinecap="round"
              transform="rotate(-90 150 150)"
              initial={false}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              strokeDasharray={TIMER_CIRCUMFERENCE}
            />
            <text x="150" y="165" textAnchor="middle" className={`fill-current text-7xl font-black ${timerColorClass}`}>
              {remainingSeconds}
            </text>
          </svg>
          <p className={`text-lg font-semibold ${timerColorClass}`}>секунд осталось</p>
        </motion.div>

        <motion.article
          key={`score-b-${scorePulseKey}`}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-6 text-center"
        >
          <p className="text-xl font-semibold text-violet-200 md:text-2xl">Team B</p>
          <p className="text-7xl font-black leading-none text-white md:text-9xl">{score.teamB}</p>
        </motion.article>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={`${score.teamA}-${score.teamB}-${isRoundEnded ? 'end' : 'live'}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="text-center text-lg text-slate-200"
        >
          {isRoundEnded ? 'Раунд завершён' : scoreDiffLabel}
        </motion.p>
      </AnimatePresence>
    </section>
  )
}
