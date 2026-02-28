import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getRoomState, type RoomGameState, type RoomPlayer } from '../services/rooms'
import {
  ensurePlayerId,
  ensurePlayerName,
  getStoredPlayerId,
  getStoredRoomId,
  setStoredPlayerId,
  setStoredRoomId,
} from '../services/session'
import { connectSocket, socket } from '../services/socket'
import { routes } from '../utils/routes'

type TeamCode = 'A' | 'B'

type SessionPlayer = {
  id: string
  name: string
  team: TeamCode
  connected: boolean
  isHost: boolean
}

type SessionRoomState = {
  roomId: string
  hostId: string
  players: SessionPlayer[]
  game: RoomGameState
}

type EmitAck = (response: unknown) => void

type RoundStats = {
  guessedWords: string[]
  skippedWords: string[]
}

const EMPTY_ROUND_STATS: RoundStats = {
  guessedWords: [],
  skippedWords: [],
}

type RoundStatsPayload = Partial<RoundStats> | null | undefined

function normalizeRoundStats(stats: RoundStatsPayload): RoundStats {
  return {
    guessedWords: Array.isArray(stats?.guessedWords)
      ? stats!.guessedWords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
      : [],
    skippedWords: Array.isArray(stats?.skippedWords)
      ? stats!.skippedWords.filter((word): word is string => typeof word === 'string' && word.trim().length > 0)
      : [],
  }
}

function toSessionPlayers(players: RoomPlayer[], hostId: string): SessionPlayer[] {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    team: player.team,
    connected: player.connected,
    isHost: player.id === hostId,
  }))
}

export function useGameSession() {
  const navigate = useNavigate()
  const { roomId: roomIdParam = '' } = useParams<{ roomId: string }>()
  const [searchParams] = useSearchParams()
  const roomIdFromQuery = searchParams.get('roomId') ?? ''
  const roomId = (roomIdParam || roomIdFromQuery || getStoredRoomId() || '').trim().toUpperCase()

  const [roomState, setRoomState] = useState<SessionRoomState | null>(null)
  const [isJoining, setIsJoining] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roundStats, setRoundStats] = useState<RoundStats>(EMPTY_ROUND_STATS)
  const [explainerHint, setExplainerHint] = useState<string | null>(null)
  const seenRoundActionKeysRef = useRef<Set<string>>(new Set())

  const currentPlayerId = useMemo(() => getStoredPlayerId(), [roomState?.players])

  useEffect(() => {
    let active = true

    if (!roomId) {
      setError('Код комнаты не найден')
      setIsJoining(false)
      return
    }

    setStoredRoomId(roomId)

    const init = async () => {
      try {
        setError(null)
        setIsJoining(true)

        const playerName = ensurePlayerName()
        const playerId = ensurePlayerId()

        await connectSocket()
        const room = await getRoomState(roomId)
        if (!active) return

        setRoomState({
          roomId: room.roomId,
          hostId: room.hostId,
          players: toSessionPlayers(room.players, room.hostId),
          game: room.game,
        })

        const fetchRoundStats = (roundNumber: number) => {
          socket.emit(
            'get_round_stats',
            { roomId, round: roundNumber },
            (response: { ok?: boolean; roundStats?: RoundStatsPayload }) => {
              if (!active || !response?.ok) return
              setRoundStats(normalizeRoundStats(response.roundStats))
            },
          )
        }

        socket.emit(
          'join_room',
          { roomId, playerId, playerName },
          (response: { ok: boolean; playerId?: string; error?: { message?: string } }) => {
            if (!active) return

            if (!response.ok) {
              setError(response.error?.message ?? 'Не удалось присоединиться к комнате')
              setIsJoining(false)
              return
            }

            if (response.playerId) {
              setStoredPlayerId(response.playerId)
            }

            if (room.game.phase === 'ROUND_END') {
              fetchRoundStats(room.game.currentRound)
            } else {
              setRoundStats(EMPTY_ROUND_STATS)
            }

            setIsJoining(false)
          },
        )
      } catch (e) {
        if (!active) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить комнату')
        setIsJoining(false)
      }
    }

    const onPlayersPayload = (payload: { players?: RoomPlayer[]; game?: RoomGameState; hostId?: string }) => {
      if (!active) return

      setRoomState((prev) => {
        if (!prev) return prev

        const nextHostId = payload.hostId ?? prev.hostId
        return {
          ...prev,
          hostId: nextHostId,
          players: payload.players ? toSessionPlayers(payload.players, nextHostId) : prev.players,
          game: payload.game ?? prev.game,
        }
      })
    }

    const onRoundStarted = (payload: {
      roomId?: string
      remainingSeconds?: number
      activeExplainerId?: string
      currentWord?: { id: number; word: string }
      word?: { id: number; word: string }
      game?: Partial<RoomGameState>
    }) => {
      if (!active || payload.roomId !== roomId) return
      seenRoundActionKeysRef.current.clear()
      setRoundStats(EMPTY_ROUND_STATS)
      setExplainerHint(null)
      setRoomState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          game: {
            ...prev.game,
            ...payload.game,
            phase: 'PLAYING',
            remainingSeconds: payload.remainingSeconds ?? payload.game?.remainingSeconds ?? prev.game.remainingSeconds,
            activeExplainerId: payload.activeExplainerId ?? payload.game?.activeExplainerId ?? prev.game.activeExplainerId,
            currentWord: payload.currentWord ?? payload.word ?? payload.game?.currentWord ?? prev.game.currentWord,
          },
        }
      })
      navigate(`${routes.game}?roomId=${roomId}`)
    }

    const onGameEnded = (payload: { roomId?: string; game?: RoomGameState }) => {
      if (!active || payload.roomId !== roomId) return
      setExplainerHint(null)

      if (payload.game) {
        setRoomState((prev) => (prev ? { ...prev, game: payload.game ?? prev.game } : prev))
      }

      navigate(`${routes.results}?roomId=${roomId}`)
    }

    const onTimerTick = (payload: { roomId?: string; remainingSeconds?: number }) => {
      if (!active || payload.roomId !== roomId) return
      if (typeof payload.remainingSeconds !== 'number') return

      setRoomState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          game: {
            ...prev.game,
            remainingSeconds: payload.remainingSeconds ?? prev.game.remainingSeconds,
          },
        }
      })
    }

    const onScoreUpdated = (payload: {
      roomId?: string
      teamA?: number
      teamB?: number
      currentWord?: { id: number; word: string }
      lastAction?: {
        playerId?: string
        direction?: 'up' | 'down'
        word?: { id?: number; word?: string }
        timestamp?: string
      }
      game?: Partial<RoomGameState>
    }) => {
      if (!active || payload.roomId !== roomId) return

      const direction = payload.lastAction?.direction
      const actionWord = payload.lastAction?.word?.word?.trim()
      if ((direction === 'up' || direction === 'down') && actionWord) {
        const key = `${payload.lastAction?.timestamp ?? 'na'}-${payload.lastAction?.playerId ?? 'na'}-${payload.lastAction?.word?.id ?? actionWord}-${direction}`
        if (!seenRoundActionKeysRef.current.has(key)) {
          seenRoundActionKeysRef.current.add(key)
          setRoundStats((prev) =>
            direction === 'up'
              ? { ...prev, guessedWords: [...prev.guessedWords, actionWord] }
              : { ...prev, skippedWords: [...prev.skippedWords, actionWord] },
          )
        }
      }

      if (payload.currentWord) {
        setExplainerHint(null)
      }

      setRoomState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          game: {
            ...prev.game,
            ...payload.game,
            score: {
              A: payload.teamA ?? payload.game?.score?.A ?? prev.game.score.A,
              B: payload.teamB ?? payload.game?.score?.B ?? prev.game.score.B,
            },
            currentWord: payload.currentWord ?? payload.game?.currentWord ?? prev.game.currentWord,
          },
        }
      })
    }

    const onRoundEnded = (payload: {
      roomId?: string
      score?: { A?: number; B?: number }
      game?: Partial<RoomGameState>
      roundStats?: RoundStatsPayload
    }) => {
      if (!active || payload.roomId !== roomId) return
      setExplainerHint(null)

      setRoomState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          game: {
            ...prev.game,
            ...payload.game,
            phase: (payload.game?.phase ?? 'ROUND_END') as RoomGameState['phase'],
            score: {
              A: payload.score?.A ?? payload.game?.score?.A ?? prev.game.score.A,
              B: payload.score?.B ?? payload.game?.score?.B ?? prev.game.score.B,
            },
            currentWord: payload.game?.currentWord,
          },
        }
      })

      if (payload.roundStats) {
        setRoundStats(normalizeRoundStats(payload.roundStats))
        return
      }

      const endedRound = payload.game?.currentRound
      const safeRound = typeof endedRound === 'number' && Number.isFinite(endedRound) ? endedRound : undefined
      socket.emit(
        'get_round_stats',
        { roomId, round: safeRound },
        (response: { ok?: boolean; roundStats?: RoundStatsPayload }) => {
          if (!active || !response?.ok) return
          setRoundStats(normalizeRoundStats(response.roundStats))
        },
      )
    }

    const onExplainerHint = (payload: { roomId?: string; hint?: string }) => {
      if (!active || payload.roomId !== roomId) return
      const normalizedHint = typeof payload.hint === 'string' ? payload.hint.trim() : ''
      setExplainerHint(normalizedHint.length > 0 ? normalizedHint : null)
    }

    socket.on('PLAYER_JOINED', onPlayersPayload)
    socket.on('PLAYER_LEFT', onPlayersPayload)
    socket.on('PLAYER_UPDATED', onPlayersPayload)
    socket.on('TEAM_BALANCED', onPlayersPayload)
    socket.on('ROUND_STARTED', onRoundStarted)
    socket.on('TIMER_TICK', onTimerTick)
    socket.on('SCORE_UPDATED', onScoreUpdated)
    socket.on('ROUND_ENDED', onRoundEnded)
    socket.on('GAME_ENDED', onGameEnded)
    socket.on('EXPLAINER_HINT', onExplainerHint)

    init()

    return () => {
      active = false
      socket.off('PLAYER_JOINED', onPlayersPayload)
      socket.off('PLAYER_LEFT', onPlayersPayload)
      socket.off('PLAYER_UPDATED', onPlayersPayload)
      socket.off('TEAM_BALANCED', onPlayersPayload)
      socket.off('ROUND_STARTED', onRoundStarted)
      socket.off('TIMER_TICK', onTimerTick)
      socket.off('SCORE_UPDATED', onScoreUpdated)
      socket.off('ROUND_ENDED', onRoundEnded)
      socket.off('GAME_ENDED', onGameEnded)
      socket.off('EXPLAINER_HINT', onExplainerHint)
    }
  }, [navigate, roomId])

  const emit = (event: string, payload?: unknown, ack?: EmitAck) => {
    if (ack) {
      socket.emit(event, payload, ack)
      return
    }

    socket.emit(event, payload)
  }

  return {
    roomState,
    roomId,
    currentPlayerId,
    isJoining,
    error,
    roundStats,
    explainerHint,
    emit,
    socket,
  }
}

export type { SessionPlayer, SessionRoomState, RoundStats }
