import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocketStatus } from '../hooks/useSocketStatus'
import { getRoomState, type RoomGameState, type RoomPlayer } from '../services/rooms'
import { ensurePlayerId, ensurePlayerName, getStoredPlayerId, setStoredPlayerId, setStoredRoomId } from '../services/session'
import { connectSocket, socket } from '../services/socket'
import { routes } from '../utils/routes'

export function LobbyPage() {
  const navigate = useNavigate()
  const { roomId = '' } = useParams<{ roomId: string }>()
  const { isConnected } = useSocketStatus()

  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [game, setGame] = useState<RoomGameState | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [roundDurationSeconds, setRoundDurationSeconds] = useState(60)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(true)

  const me = useMemo(() => {
    const myId = getStoredPlayerId()
    return players.find((player) => player.id === myId) ?? null
  }, [players])
  const isHost = !!me && !!hostId && me.id === hostId

  useEffect(() => {
    let active = true
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

        setPlayers(room.players)
        setGame(room.game)
        setHostId(room.hostId)
        setRoundDurationSeconds(room.game.roundDurationSeconds ?? 60)

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
      if (payload.players) setPlayers(payload.players)
      if (payload.game) {
        setGame(payload.game)
        if (payload.game.phase === 'LOBBY') {
          setRoundDurationSeconds(payload.game.roundDurationSeconds ?? 60)
        }
      }
      if (payload.hostId) setHostId(payload.hostId)
    }

    const onRoundStarted = (payload: { roomId?: string }) => {
      if (!active || payload.roomId !== roomId) return
      navigate(`${routes.game}?roomId=${roomId}`)
    }

    const onGameEnded = (payload: { roomId?: string; game?: RoomGameState }) => {
      if (!active || payload.roomId !== roomId) return
      if (payload.game) setGame(payload.game)
      navigate(`${routes.results}?roomId=${roomId}`)
    }

    socket.on('PLAYER_JOINED', onPlayersPayload)
    socket.on('PLAYER_LEFT', onPlayersPayload)
    socket.on('PLAYER_UPDATED', onPlayersPayload)
    socket.on('TEAM_BALANCED', onPlayersPayload)
    socket.on('ROUND_STARTED', onRoundStarted)
    socket.on('GAME_ENDED', onGameEnded)

    init()

    return () => {
      active = false
      socket.off('PLAYER_JOINED', onPlayersPayload)
      socket.off('PLAYER_LEFT', onPlayersPayload)
      socket.off('PLAYER_UPDATED', onPlayersPayload)
      socket.off('TEAM_BALANCED', onPlayersPayload)
      socket.off('ROUND_STARTED', onRoundStarted)
      socket.off('GAME_ENDED', onGameEnded)
    }
  }, [navigate, roomId])

  const startGame = () => {
    socket.emit(
      'start_game',
      { roomId, roundDurationSeconds },
      (response: { ok: boolean; error?: { message?: string } }) => {
        if (!response.ok) {
          setError(response.error?.message ?? 'Не удалось начать игру')
        }
      }
    )
  }

  const handleRoundDurationChange = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return
    }

    const safe = Math.max(10, Math.min(300, Math.floor(parsed)))
    setRoundDurationSeconds(safe)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-secondary/70 p-6">
      <h1 className="text-3xl font-bold">Lobby</h1>
      <p className="text-slate-200">Комната: <span className="font-bold tracking-[0.2em] text-accent">{roomId}</span></p>
      <p className="font-medium">
        WebSocket:{' '}
        <span className={isConnected ? 'text-accent' : 'text-orange-300'}>
          {isConnected ? 'connected' : 'disconnected'}
        </span>
      </p>

      {me ? <p className="text-slate-300">Вы: {me.name} (Team {me.team})</p> : null}
      {game ? <p className="text-slate-300">Фаза: {game.phase} | Счёт A:{game.score.A} B:{game.score.B}</p> : null}

      <div className="rounded-lg bg-black/20 p-4">
        <h2 className="mb-2 text-lg font-semibold">Участники ({players.length})</h2>
        <ul className="space-y-1 text-sm text-slate-200">
          {players.map((player) => (
            <li key={player.id}>
              {player.name} | Team {player.team} | {player.connected ? 'online' : 'offline'}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-3">
        {isHost && game?.phase === 'LOBBY' ? (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              Таймер (сек):
              <input
                type="number"
                min={10}
                max={300}
                step={5}
                value={roundDurationSeconds}
                onChange={(event) => handleRoundDurationChange(event.target.value)}
                className="w-24 rounded-lg border border-white/20 bg-secondary px-2 py-1 text-white outline-none focus:border-accent"
              />
            </label>
            <button
              type="button"
              onClick={startGame}
              disabled={isJoining || !isConnected}
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              Start Game
            </button>
          </>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  )
}
