import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import LobbyScreen, { type LobbyPlayer } from './LobbyScreen'
import { useGameSession } from '../hooks/useGameSession'
import { routes } from '../utils/routes'

type TeamCode = 'A' | 'B'

type StoredLobbySettings = {
  roundDurationSeconds?: number
  maxRounds?: number
  targetScore?: number
  roundTime?: number
  scoreToWin?: number
}

const LOBBY_SETTINGS_KEY = 'poyasni_lobby_settings'

function parseStoredLobbySettings(): StoredLobbySettings | null {
  const raw = sessionStorage.getItem(LOBBY_SETTINGS_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredLobbySettings
  } catch {
    return null
  }
}

function isTeamCode(team: string): team is TeamCode {
  return team === 'A' || team === 'B'
}

export default function LobbyContainer() {
  const navigate = useNavigate()
  const { roomState, currentPlayerId, isJoining, emit } = useGameSession()

  const connectedPlayers = useMemo(
    () => (roomState?.players ?? []).filter((player) => player.connected),
    [roomState?.players],
  )

  const teamAPlayers = useMemo<LobbyPlayer[]>(
    () =>
      connectedPlayers
        .filter((player) => isTeamCode(player.team) && player.team === 'A')
        .map((player) => ({ name: player.name, isHost: player.isHost })),
    [connectedPlayers],
  )

  const teamBPlayers = useMemo<LobbyPlayer[]>(
    () =>
      connectedPlayers
        .filter((player) => isTeamCode(player.team) && player.team === 'B')
        .map((player) => ({ name: player.name, isHost: player.isHost })),
    [connectedPlayers],
  )

  const isHost = useMemo(() => {
    if (!roomState || !currentPlayerId) return false
    return roomState.hostId === currentPlayerId
  }, [currentPlayerId, roomState])

  const totalPlayers = teamAPlayers.length + teamBPlayers.length
  const canStart = isHost && !isJoining && totalPlayers >= 4
  const wordsExhausted = Boolean(roomState?.game.wordsExhausted)

  const handleStartGame = useCallback(() => {
    if (!roomState?.roomId || !canStart) {
      return
    }

    if (wordsExhausted) {
      sessionStorage.removeItem('poyasni_room_id')
      sessionStorage.removeItem('partyflow_room_id')
      navigate(routes.home)
      return
    }

    const storedSettings = parseStoredLobbySettings()
    const defaultRoundDuration = roomState.game.roundDurationSeconds ?? 60
    const defaultMaxRounds = roomState.game.maxRounds ?? 12
    const defaultTargetScore = roomState.game.targetScore ?? 50

    const roundDurationSeconds = Math.max(
      10,
      Math.min(
        300,
        Math.floor(Number(storedSettings?.roundDurationSeconds ?? storedSettings?.roundTime ?? defaultRoundDuration)),
      ),
    )

    const maxRounds = Math.max(
      1,
      Math.min(
        100,
        Math.floor(Number(storedSettings?.maxRounds ?? defaultMaxRounds)),
      ),
    )

    const targetScore = Math.max(
      1,
      Math.min(
        500,
        Math.floor(Number(storedSettings?.targetScore ?? storedSettings?.scoreToWin ?? defaultTargetScore)),
      ),
    )

    const payload = { roomId: roomState.roomId, roundDurationSeconds, maxRounds, targetScore }

    emit('GAME_STARTED', payload)
    emit('start_game', payload)
  }, [canStart, emit, navigate, roomState, wordsExhausted])

  const screenHostFlag = isHost && totalPlayers >= 4

  return (
    <LobbyScreen
      roomCode={roomState?.roomId ?? ''}
      teamA={teamAPlayers}
      teamB={teamBPlayers}
      maxPlayers={5}
      isHost={screenHostFlag}
      wordsExhausted={wordsExhausted}
      onStart={handleStartGame}
    />
  )
}
