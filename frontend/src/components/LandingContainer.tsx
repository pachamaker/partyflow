import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LandingScreen from './LandingScreen'
import { createRoom } from '../services/rooms'
import { ensurePlayerId, getStoredPlayerName, setStoredPlayerName, setStoredRoomId } from '../services/session'
import { connectSocket } from '../services/socket'
import { routes } from '../utils/routes'

const ROOM_ID_PATTERN = /^[A-Z0-9]{6}$/
const LOBBY_SETTINGS_KEY = 'poyasni_lobby_settings'

function persistLobbySettings(roundTime: number, scoreToWin: number): void {
  sessionStorage.setItem(
    LOBBY_SETTINGS_KEY,
    JSON.stringify({
      roundTime,
      scoreToWin,
      roundDurationSeconds: roundTime,
      targetScore: scoreToWin,
    }),
  )
}

export default function LandingContainer() {
  const navigate = useNavigate()

  const [playerName, setPlayerName] = useState(getStoredPlayerName() ?? '')
  const playerNameRef = useRef(playerName)
  const [roundTime, setRoundTime] = useState(60)
  const [scoreToWin, setScoreToWin] = useState(50)
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCreateGame = useCallback(async () => {
    const normalizedName = playerNameRef.current.trim()
    if (!normalizedName || isCreating) {
      return
    }

    try {
      setErrorMessage(null)
      setIsCreating(true)

      setStoredPlayerName(normalizedName)
      persistLobbySettings(roundTime, scoreToWin)

      const creatorId = ensurePlayerId()
      const creatorSocketId = await connectSocket()
      const { roomId } = await createRoom({
        creatorId,
        creatorName: normalizedName,
        creatorSocketId,
      })

      setStoredRoomId(roomId)
      navigate(routes.lobbyById(roomId))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Не удалось создать комнату')
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, navigate, roundTime, scoreToWin])

  const handleJoinGame = useCallback(
    (roomCode: string) => {
      const normalizedName = playerNameRef.current.trim()
      if (!normalizedName) {
        setErrorMessage('Введите имя')
        return
      }

      const normalizedRoomCode = roomCode.trim().toUpperCase()
      if (!ROOM_ID_PATTERN.test(normalizedRoomCode)) {
        setErrorMessage('Введите 6-символьный код комнаты')
        return
      }

      setErrorMessage(null)
      setStoredPlayerName(normalizedName)
      setStoredRoomId(normalizedRoomCode)
      navigate(routes.lobbyById(normalizedRoomCode))
    },
    [navigate],
  )

  return (
    <LandingScreen
      playerName={playerName}
      roundTime={roundTime}
      scoreToWin={scoreToWin}
      isCreating={isCreating}
      errorMessage={errorMessage}
      onPlayerNameChange={(value) => {
        playerNameRef.current = value
        setPlayerName(value)
        if (errorMessage) {
          setErrorMessage(null)
        }
      }}
      onRoundTimeChange={setRoundTime}
      onScoreToWinChange={setScoreToWin}
      onCreateGame={handleCreateGame}
      onJoinGame={handleJoinGame}
    />
  )
}
