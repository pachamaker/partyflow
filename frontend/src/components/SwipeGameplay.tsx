import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRoomState } from '../services/rooms'
import {
  ensurePlayerId,
  ensurePlayerName,
  getStoredPlayerId,
  getStoredPlayerName,
  setStoredPlayerId
} from '../services/session'
import { connectSocket, socket } from '../services/socket'
import { routes } from '../utils/routes'

type Team = 'A' | 'B'
type GamePhase = 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'GAME_END'

type WordPayload = {
  id: number
  word: string
  hint?: string
}

interface SwipeGameplayProps {
  roomId?: string
}

interface ScoreUpdatedPayload {
  roomId?: string
  teamA?: number
  teamB?: number
  currentWord?: WordPayload
  lastAction?: {
    playerId: string
    team: Team
    direction: 'up' | 'down'
    awardedPoints: number
    word: WordPayload
  }
}

export function SwipeGameplay({ roomId }: SwipeGameplayProps) {
  const navigate = useNavigate()
  const [word, setWord] = useState<WordPayload | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [teamA, setTeamA] = useState(0)
  const [teamB, setTeamB] = useState(0)
  const [remaining, setRemaining] = useState(60)
  const [gamePhase, setGamePhase] = useState<GamePhase>('LOBBY')
  const [activeTeam, setActiveTeam] = useState<Team>('A')
  const [activeExplainerId, setActiveExplainerId] = useState<string | undefined>()
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [myName, setMyName] = useState<string | null>(getStoredPlayerName())
  const [error, setError] = useState<string | null>(null)

  const myPlayerId = getStoredPlayerId()
  const canSwipe =
    !!myPlayerId &&
    gamePhase === 'PLAYING' &&
    (myPlayerId === activeExplainerId || (!activeExplainerId && !!myTeam && myTeam === activeTeam))
  const canStartNextRound = !!myPlayerId && gamePhase === 'ROUND_END' && myPlayerId === activeExplainerId

  const myStatus = useMemo(() => {
    if (myPlayerId && myPlayerId === activeExplainerId) {
      return 'Объясняет'
    }
    if (myTeam && myTeam === activeTeam) {
      return 'Угадывает'
    }
    return 'Зритель'
  }, [activeExplainerId, activeTeam, myPlayerId, myTeam])

  const scoreLabel = useMemo(() => `A: ${teamA} | B: ${teamB}`, [teamA, teamB])

  useEffect(() => {
    let active = true

    const loadCurrentState = async () => {
      if (!roomId) {
        return
      }

      try {
        const room = await getRoomState(roomId)
        if (!active) return

        setTeamA(room.game.score.A)
        setTeamB(room.game.score.B)
        setGamePhase(room.game.phase)
        setRemaining(room.game.remainingSeconds ?? 60)
        setActiveTeam(room.game.activeTeam)
        setActiveExplainerId(room.game.activeExplainerId)
        setWord(room.game.currentWord ? { id: room.game.currentWord.id, word: room.game.currentWord.word } : null)
        setHint(null)

        if (myPlayerId) {
          const me = room.players.find((player) => player.id === myPlayerId)
          setMyTeam(me?.team ?? null)
          setMyName(me?.name ?? getStoredPlayerName())
        }
      } catch {
        // Ignore bootstrapping errors, live updates can still arrive via socket.
      }
    }

    const ensureJoined = async () => {
      if (!roomId) {
        return
      }

      try {
        await connectSocket()

        const playerId = ensurePlayerId()

        socket.emit(
          'join_room',
          {
            roomId,
            playerId,
            playerName: ensurePlayerName()
          },
          (response: { ok: boolean; playerId?: string }) => {
            if (!response.ok) return
            if (response.playerId) {
              setStoredPlayerId(response.playerId)
            }
          }
        )
      } catch {
        // Keep screen usable with stale data if reconnect fails.
      }
    }

    const onRoundStarted = (payload: {
      roomId?: string
      word?: WordPayload
      game?: { score?: { A?: number; B?: number }; activeTeam?: Team }
      activeExplainerId?: string
      remainingSeconds?: number
    }) => {
      if (!roomId || payload.roomId !== roomId) return

      if (payload.word) setWord(payload.word)
      setHint(null)
      setTeamA(payload.game?.score?.A ?? 0)
      setTeamB(payload.game?.score?.B ?? 0)
      setGamePhase('PLAYING')
      setActiveTeam((payload.game?.activeTeam as Team) ?? 'A')
      setRemaining(payload.remainingSeconds ?? 60)
      setActiveExplainerId(payload.activeExplainerId)
      setError(null)
    }

    const onPlayerState = (payload: {
      roomId?: string
      players?: Array<{ id: string; team: Team; name?: string }>
      game?: { activeExplainerId?: string }
    }) => {
      if (!roomId || payload.roomId !== roomId) return
      if (payload.game?.activeExplainerId) {
        setActiveExplainerId(payload.game.activeExplainerId)
      }
      if (myPlayerId && payload.players) {
        const me = payload.players.find((player) => player.id === myPlayerId)
        setMyTeam(me?.team ?? null)
        setMyName(me?.name ?? getStoredPlayerName())
      }
    }

    const onTimerTick = (payload: { roomId?: string; remainingSeconds?: number }) => {
      if (!roomId || payload.roomId !== roomId) return
      if (typeof payload.remainingSeconds === 'number') {
        setRemaining(payload.remainingSeconds)
      }
    }

    const onScoreUpdated = (payload: ScoreUpdatedPayload) => {
      if (!roomId || payload.roomId !== roomId) return
      if (typeof payload.teamA === 'number') setTeamA(payload.teamA)
      if (typeof payload.teamB === 'number') setTeamB(payload.teamB)
      if (payload.currentWord) {
        setWord(payload.currentWord)
        setHint(null)
      }
    }

    const onRoundEnded = (payload: {
      roomId?: string
      score?: { A?: number; B?: number }
      game?: { phase?: GamePhase; score?: { A?: number; B?: number }; activeExplainerId?: string }
    }) => {
      if (!roomId || payload.roomId !== roomId) return
      setTeamA((prev) => payload.score?.A ?? payload.game?.score?.A ?? prev)
      setTeamB((prev) => payload.score?.B ?? payload.game?.score?.B ?? prev)
      setGamePhase((payload.game?.phase as GamePhase) ?? 'ROUND_END')
      setActiveExplainerId(payload.game?.activeExplainerId)
      setWord(null)
      setHint(null)
    }

    const onExplainerHint = (payload: { roomId?: string; hint?: string }) => {
      if (!roomId || payload.roomId !== roomId) return
      setHint(payload.hint ?? null)
    }

    const onGameEnded = (payload: { roomId?: string }) => {
      if (!roomId || payload.roomId !== roomId) return
      navigate(`${routes.results}?roomId=${roomId}`)
    }

    const onConnect = () => {
      void ensureJoined()
    }

    socket.on('connect', onConnect)
    socket.on('ROUND_STARTED', onRoundStarted)
    socket.on('TIMER_TICK', onTimerTick)
    socket.on('SCORE_UPDATED', onScoreUpdated)
    socket.on('ROUND_ENDED', onRoundEnded)
    socket.on('GAME_ENDED', onGameEnded)
    socket.on('EXPLAINER_HINT', onExplainerHint)
    socket.on('PLAYER_UPDATED', onPlayerState)
    socket.on('PLAYER_JOINED', onPlayerState)
    socket.on('TEAM_BALANCED', onPlayerState)

    void ensureJoined()
    void loadCurrentState()

    return () => {
      active = false
      socket.off('connect', onConnect)
      socket.off('ROUND_STARTED', onRoundStarted)
      socket.off('TIMER_TICK', onTimerTick)
      socket.off('SCORE_UPDATED', onScoreUpdated)
      socket.off('ROUND_ENDED', onRoundEnded)
      socket.off('GAME_ENDED', onGameEnded)
      socket.off('EXPLAINER_HINT', onExplainerHint)
      socket.off('PLAYER_UPDATED', onPlayerState)
      socket.off('PLAYER_JOINED', onPlayerState)
      socket.off('TEAM_BALANCED', onPlayerState)
    }
  }, [myPlayerId, navigate, roomId])

  const swipe = (direction: 'up' | 'down') => {
    if (!roomId) return
    if (!canSwipe) {
      setError('Свайпить может только активный explainer')
      return
    }

    socket.emit('word_swiped', { roomId, direction }, (response: { ok: boolean; error?: { message?: string } }) => {
      if (!response.ok) {
        setError(response.error?.message ?? 'Ошибка свайпа')
      }
    })
  }

  const startNextRound = () => {
    if (!roomId || !canStartNextRound) return

    socket.emit('start_round', { roomId }, (response: { ok: boolean; error?: { message?: string } }) => {
      if (!response.ok) {
        setError(response.error?.message ?? 'Не удалось начать новый раунд')
      }
    })
  }

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-secondary/70 p-6">
      <h1 className="text-3xl font-bold">Game</h1>
      <p className="text-slate-200">Комната: {roomId ?? '—'}</p>
      <p className="text-slate-200">Вы: {myName ?? '—'} ({myTeam ? `Team ${myTeam}` : '—'})</p>
      <p className="text-slate-200">Таймер: {remaining}s</p>
      <p className="text-slate-200">Счёт: {scoreLabel}</p>
      <p className="text-slate-200">Ваш статус: {myStatus}</p>

      <div className="rounded-2xl border border-accent/30 bg-black/20 p-8 text-center">
        <p className="text-sm text-slate-400">Текущее слово</p>
        <p className="text-5xl font-black text-white">{word?.word ?? 'Ожидание слова...'}</p>
        {myStatus === 'Объясняет' && hint ? <p className="mt-3 text-base text-slate-200">Подсказка: {hint}</p> : null}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => swipe('up')}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={!canSwipe}
        >
          Угадал
        </button>
        <button
          type="button"
          onClick={() => swipe('down')}
          className="rounded-lg bg-white/20 px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={!canSwipe}
        >
          Пропуск слова (-1 балл)
        </button>
      </div>

      {canStartNextRound ? (
        <button
          type="button"
          onClick={startNextRound}
          className="rounded-lg bg-accent px-4 py-2 font-semibold text-secondary disabled:opacity-60"
        >
          Начать новый раунд
        </button>
      ) : null}

      {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  )
}
