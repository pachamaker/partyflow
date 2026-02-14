import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { createRoom } from '../services/rooms'
import { ensurePlayerId, getStoredPlayerName, setStoredPlayerName } from '../services/session'
import { connectSocket } from '../services/socket'
import { routes } from '../utils/routes'

const ROOM_ID_PATTERN = /^[A-Z0-9]{6}$/

export function HomeScreen() {
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [playerName, setPlayerName] = useState(getStoredPlayerName() ?? '')
  const [joinCode, setJoinCode] = useState('')
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const joinUrl = useMemo(() => {
    if (!createdRoomId) {
      return ''
    }

    return `https://partyflow.ru/join/${createdRoomId}`
  }, [createdRoomId])

  useEffect(() => {
    if (!createdRoomId) {
      return
    }

    const timer = window.setTimeout(() => {
      navigate(routes.lobbyById(createdRoomId))
    }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [createdRoomId, navigate])

  const commitPlayerName = (): string | null => {
    const normalizedName = playerName.trim()
    if (!normalizedName) {
      setErrorMessage('Введите ваше имя')
      return null
    }

    setStoredPlayerName(normalizedName)
    return normalizedName
  }

  const handleCreateRoom = async () => {
    try {
      setErrorMessage(null)
      setIsCreating(true)

      const creatorName = commitPlayerName()
      if (!creatorName) {
        setIsCreating(false)
        return
      }

      const creatorId = ensurePlayerId()
      const creatorSocketId = await connectSocket()
      const { roomId } = await createRoom({ creatorSocketId, creatorId, creatorName })

      setCreatedRoomId(roomId)
    } catch (error) {
      setCreatedRoomId(null)
      setErrorMessage(error instanceof Error ? error.message : 'Произошла ошибка при создании комнаты')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = commitPlayerName()
    if (!normalizedName) {
      return
    }

    const normalizedCode = joinCode.trim().toUpperCase()
    if (!ROOM_ID_PATTERN.test(normalizedCode)) {
      setErrorMessage('Введите 6-символьный код комнаты')
      return
    }

    setErrorMessage(null)
    navigate(routes.lobbyById(normalizedCode))
  }

  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-secondary/70 p-6 shadow-xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-accent">PartyFlow</h1>
        <p className="text-slate-200">Создайте комнату или присоединитесь по 6-символьному коду.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="space-y-3"
      >
        <div className="space-y-1">
          <label htmlFor="player-name" className="block text-sm text-slate-300">
            Ваше имя
          </label>
          <input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            maxLength={32}
            placeholder="Например, Саша"
            className="w-full rounded-lg border border-white/20 bg-secondary px-3 py-2 text-base text-white outline-none transition focus:border-accent"
          />
        </div>

        <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCreateRoom}
          disabled={isCreating}
          className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isCreating ? 'Создание...' : 'Новая игра'}
        </button>
        <button
          type="button"
          onClick={() => {
            setShowJoinForm((value) => !value)
            setErrorMessage(null)
          }}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
        >
          Присоединиться
        </button>
        </div>
      </motion.div>

      {showJoinForm ? (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          onSubmit={handleJoinSubmit}
          className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4"
        >
          <label htmlFor="room-code" className="block text-sm text-slate-300">
            Код комнаты
          </label>
          <input
            id="room-code"
            value={joinCode}
            onChange={(event) => {
              setJoinCode(event.target.value.toUpperCase())
            }}
            maxLength={6}
            placeholder="ABC123"
            className="w-full rounded-lg border border-white/20 bg-secondary px-3 py-2 text-lg font-semibold tracking-[0.2em] uppercase text-white outline-none transition focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-secondary transition hover:brightness-110"
          >
            Войти в комнату
          </button>
        </motion.form>
      ) : null}

      {createdRoomId ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3 rounded-xl border border-accent/30 bg-black/20 p-4"
        >
          <p className="text-sm text-slate-300">Комната создана</p>
          <p className="text-3xl font-black tracking-[0.3em] text-accent">{createdRoomId}</p>
          <div className="inline-flex rounded-xl bg-white p-3">
            <QRCodeSVG value={joinUrl} size={140} />
          </div>
          <p className="text-xs text-slate-400">Переход в lobby...</p>
        </motion.div>
      ) : null}

      {errorMessage ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200"
        >
          {errorMessage}
        </motion.p>
      ) : null}
    </section>
  )
}
