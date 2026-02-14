import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRoomState } from '../services/rooms'
import { ensurePlayerId, ensurePlayerName, getStoredPlayerId, getStoredPlayerName, getStoredRoomId } from '../services/session'
import { connectSocket, socket } from '../services/socket'
import { routes } from '../utils/routes'

type Winner = 'A' | 'B' | 'DRAW' | undefined
type Team = 'A' | 'B'

export function ResultsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? getStoredRoomId() ?? undefined
  const myPlayerId = getStoredPlayerId()

  const [teamA, setTeamA] = useState(0)
  const [teamB, setTeamB] = useState(0)
  const [winner, setWinner] = useState<Winner>()
  const [myName, setMyName] = useState<string | null>(getStoredPlayerName())
  const [myTeam, setMyTeam] = useState<Team | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const isHost = !!myPlayerId && !!hostId && myPlayerId === hostId
  const finalMessage = winner && myTeam
    ? winner === 'DRAW'
      ? 'Ничья'
      : winner === myTeam
        ? 'Вы победили'
        : 'Проигрыш :('
    : 'Ожидание...'

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!roomId) return
      try {
        await connectSocket()
        socket.emit('join_room', {
          roomId,
          playerId: ensurePlayerId(),
          playerName: ensurePlayerName()
        })

        const room = await getRoomState(roomId)
        if (!active) return
        setTeamA(room.game.score.A)
        setTeamB(room.game.score.B)
        setWinner(room.game.winnerTeam)
        const me = myPlayerId ? room.players.find((player) => player.id === myPlayerId) : null
        setMyName(me?.name ?? getStoredPlayerName())
        setMyTeam(me?.team ?? null)
        setHostId(room.hostId)
      } catch {
        // Ignore initial fetch errors.
      }
    }

    const onGameEnded = (payload: {
      roomId?: string
      winnerTeam?: Winner
      score?: { A?: number; B?: number }
      game?: { score?: { A?: number; B?: number } }
    }) => {
      if (!roomId || payload.roomId !== roomId) return
      setTeamA(payload.score?.A ?? payload.game?.score?.A ?? 0)
      setTeamB(payload.score?.B ?? payload.game?.score?.B ?? 0)
      setWinner(payload.winnerTeam)
    }

    const onGameReset = (payload: { roomId?: string }) => {
      if (!roomId || payload.roomId !== roomId) return
      navigate(`${routes.lobbyById(roomId)}`)
    }

    socket.on('GAME_ENDED', onGameEnded)
    socket.on('GAME_RESET', onGameReset)
    load()

    return () => {
      active = false
      socket.off('GAME_ENDED', onGameEnded)
      socket.off('GAME_RESET', onGameReset)
    }
  }, [myPlayerId, navigate, roomId])

  const restartGame = () => {
    if (!roomId || !isHost) return
    socket.emit('restart_game', { roomId })
  }

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-secondary/70 p-6">
      <h1 className="text-3xl font-bold">Game Result</h1>
      <p className="text-slate-200">Комната: {roomId ?? '—'}</p>
      <p className="text-slate-200">Вы: {myName ?? '—'} ({myTeam ? `Team ${myTeam}` : '—'})</p>

      <div className="rounded-lg bg-black/20 p-4">
        <p className="text-2xl font-bold">Team A: {teamA}</p>
        <p className="text-2xl font-bold">Team B: {teamB}</p>
      </div>

      <p className="text-xl text-accent">{finalMessage}</p>

      {isHost ? (
        <button
          type="button"
          onClick={restartGame}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white"
        >
          Начать новую игру
        </button>
      ) : null}
    </section>
  )
}
