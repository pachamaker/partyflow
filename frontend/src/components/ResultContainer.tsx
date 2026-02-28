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
import {
  dismissInstallPrompt,
  getInstallPromptState,
  markFirstGameCompleted,
  subscribeInstallPrompt,
  triggerInstallPrompt,
} from '../services/pwaInstallPrompt'
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
  const [installState, setInstallState] = useState(() => getInstallPromptState())

  const isHost = useMemo(() => {
    if (!currentPlayerId || !roomState?.hostId) {
      return false
    }

    return currentPlayerId === roomState.hostId
  }, [currentPlayerId, roomState?.hostId])

  useEffect(() => {
    markFirstGameCompleted()
    setInstallState(getInstallPromptState())
    return subscribeInstallPrompt(() => {
      setInstallState(getInstallPromptState())
    })
  }, [])

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

  const handleInstallClick = useCallback(async () => {
    if (!installState.canTriggerNativePrompt) {
      return
    }

    const outcome = await triggerInstallPrompt()
    if (outcome === 'accepted') {
      dismissInstallPrompt()
    }

    setInstallState(getInstallPromptState())
  }, [installState.canTriggerNativePrompt])

  const handleDismissInstallPrompt = useCallback(() => {
    dismissInstallPrompt()
    setInstallState(getInstallPromptState())
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <GameResultScreen
        winnerTeam={winnerTeam}
        teamA={teamA}
        teamB={teamB}
        canPlayAgain={isHost}
        onPlayAgain={handlePlayAgain}
        onHome={handleHostNewGame}
      />

      {installState.shouldShowPrompt ? (
        <div
          role="dialog"
          aria-label="Добавить на домашний экран"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 1000,
            maxWidth: 520,
            margin: '0 auto',
            borderRadius: 16,
            background: 'rgba(26, 29, 41, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            backdropFilter: 'blur(10px)',
            padding: 14,
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>Добавить на домашний экран</p>
          <p style={{ margin: '6px 0 12px', fontSize: 13, lineHeight: 1.4, color: 'rgba(248, 250, 252, 0.8)' }}>
            {installState.shouldShowIosHint
              ? 'На iPhone: Поделиться → На экран Домой.'
              : 'Установите игру как приложение для быстрого доступа и офлайн-работы.'}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {installState.canTriggerNativePrompt ? (
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  border: 'none',
                  padding: '10px 12px',
                  background: '#FF6B00',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Добавить
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismissInstallPrompt}
              style={{
                flex: 1,
                borderRadius: 10,
                border: '1px solid rgba(248, 250, 252, 0.25)',
                padding: '10px 12px',
                background: 'transparent',
                color: '#F8FAFC',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Позже
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
