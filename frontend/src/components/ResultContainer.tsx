import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GameResultScreen from './GameResultScreen'
import type { TeamResultPlayer } from './GameResultScreen'
import { getRoomState, type RoomStateResponse } from '../services/rooms'
import {
  ensurePlayerId,
  ensurePlayerName,
  getStoredPlayerId,
  getStoredRoomId,
} from '../services/session'
import { connectSocket, socket } from '../services/socket'
import { routes } from '../utils/routes'

type TeamCode = 'A' | 'B'
type WinnerTeam = TeamCode | 'DRAW' | undefined

type GameResultTeam = {
  label: string
  score: number
  players: TeamResultPlayer[]
}

const LOCAL_SESSION_KEYS = [
  'poyasni_player_id',
  'poyasni_player_name',
  'partyflow_player_id',
  'partyflow_player_name',
]

const ROOM_SESSION_KEYS = ['poyasni_room_id', 'partyflow_room_id', 'poyasni_lobby_settings']

function clearLocalSession(): void {
  LOCAL_SESSION_KEYS.forEach((key) => localStorage.removeItem(key))
  ROOM_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key))
}

function resolveWinner(roomState: RoomStateResponse['room'] | null): TeamCode {
  if (!roomState) {
    return 'A'
  }

  if (roomState.game.winnerTeam === 'A' || roomState.game.winnerTeam === 'B') {
    return roomState.game.winnerTeam
  }

  return roomState.game.score.A >= roomState.game.score.B ? 'A' : 'B'
}

export default function ResultContainer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const roomId = searchParams.get('roomId') ?? getStoredRoomId() ?? ''
  const currentPlayerId = getStoredPlayerId()

  const [roomState, setRoomState] = useState<RoomStateResponse['room'] | null>(null)

  const isHost = useMemo(() => {
    if (!currentPlayerId || !roomState?.hostId) {
      return false
    }

    return currentPlayerId === roomState.hostId
  }, [currentPlayerId, roomState?.hostId])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      if (!roomId) return

      try {
        await connectSocket()

        socket.emit('join_room', {
          roomId,
          playerId: ensurePlayerId(),
          playerName: ensurePlayerName(),
        })

        const room = await getRoomState(roomId)
        if (!active) return
        setRoomState(room)
      } catch {
        // Keep default UI if initial sync fails.
      }
    }

    const onGameEnded = (payload: {
      roomId?: string
      winnerTeam?: WinnerTeam
      score?: { A?: number; B?: number }
      game?: { score?: { A?: number; B?: number }; winnerTeam?: WinnerTeam }
    }) => {
      if (!active || payload.roomId !== roomId) return

      setRoomState((prev) => {
        if (!prev) return prev

        const scoreA = payload.score?.A ?? payload.game?.score?.A ?? prev.game.score.A
        const scoreB = payload.score?.B ?? payload.game?.score?.B ?? prev.game.score.B

        return {
          ...prev,
          game: {
            ...prev.game,
            score: {
              A: scoreA,
              B: scoreB,
            },
            winnerTeam: payload.winnerTeam ?? payload.game?.winnerTeam ?? prev.game.winnerTeam,
          },
        }
      })
    }

    const onGameReset = (payload: { roomId?: string }) => {
      if (!active || payload.roomId !== roomId) return
      navigate(routes.lobbyById(roomId))
    }

    socket.on('GAME_ENDED', onGameEnded)
    socket.on('GAME_RESET', onGameReset)

    void bootstrap()

    return () => {
      active = false
      socket.off('GAME_ENDED', onGameEnded)
      socket.off('GAME_RESET', onGameReset)
    }
  }, [navigate, roomId])

  const teamA = useMemo<GameResultTeam>(() => {
    if (!roomState) {
      return { label: 'Команда А', score: 0, players: [] }
    }

    const guessedScores = roomState.game.playerGuessedScores ?? {}
    return {
      label: 'Команда А',
      score: roomState.game.score.A,
      players: roomState.players
        .filter((player) => player.team === 'A')
        .map((player) => ({
          id: player.id,
          name: player.name,
          guessed: guessedScores[player.id] ?? 0,
          isHost: player.id === roomState.hostId,
        })),
    }
  }, [roomState])

  const teamB = useMemo<GameResultTeam>(() => {
    if (!roomState) {
      return { label: 'Команда Б', score: 0, players: [] }
    }

    const guessedScores = roomState.game.playerGuessedScores ?? {}
    return {
      label: 'Команда Б',
      score: roomState.game.score.B,
      players: roomState.players
        .filter((player) => player.team === 'B')
        .map((player) => ({
          id: player.id,
          name: player.name,
          guessed: guessedScores[player.id] ?? 0,
          isHost: player.id === roomState.hostId,
        })),
    }
  }, [roomState])

  const winnerTeam = useMemo<TeamCode>(() => resolveWinner(roomState), [roomState])

  const handlePlayAgain = useCallback(() => {
    if (!roomId || !isHost) {
      return
    }

    // Current backend contract.
    socket.emit('restart_game', { roomId })

    // Forward-compat event for updated UI/WebSocket contract.
    socket.emit('GAME_RESET', { roomId })
  }, [isHost, roomId])

  const handleHostNewGame = useCallback(() => {
    clearLocalSession()
    navigate(routes.home)
  }, [navigate])

  return (
    <GameResultScreen
      winnerTeam={winnerTeam}
      teamA={teamA}
      teamB={teamB}
      canPlayAgain={isHost}
      onPlayAgain={handlePlayAgain}
      onHome={handleHostNewGame}
    />
  )
}
