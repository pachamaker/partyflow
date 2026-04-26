// frontend/src/services/devBots.ts
import { io, type Socket } from 'socket.io-client'

export type BotSession = {
  playerId: string
  playerName: string
  socket: Socket
  explainerHint: string | null
  onHintChange: ((hint: string | null) => void) | null
}

const SOCKET_URL = import.meta.env.VITE_WS_URL || window.location.origin

const BOT_NAMES = [
  'Бот-Алёша', 'Бот-Маша', 'Бот-Петя', 'Бот-Света',
  'Бот-Вася', 'Бот-Катя', 'Бот-Женя', 'Бот-Дима',
]

let nameIndex = 0

function nextBotName(): string {
  const name = BOT_NAMES[nameIndex % BOT_NAMES.length]
  nameIndex++
  return name
}

function generateBotId(): string {
  return `bot_${Math.random().toString(36).slice(2, 10)}`
}

export class DevBotManager {
  private bots: Map<string, BotSession> = new Map()

  async spawnBot(roomId: string): Promise<BotSession> {
    const playerId = generateBotId()
    const playerName = nextBotName()

    const socket: Socket = io(SOCKET_URL, {
      autoConnect: false,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    })

    const session: BotSession = {
      playerId,
      playerName,
      socket,
      explainerHint: null,
      onHintChange: null,
    }

    this.bots.set(playerId, session)

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve())
      socket.on('connect_error', reject)
      socket.connect()
    })

    await new Promise<void>((resolve) => {
      socket.emit(
        'join_room',
        { roomId, playerId, playerName },
        (response: { ok: boolean; playerId?: string }) => {
          if (response.ok && response.playerId) {
            session.playerId = response.playerId
            this.bots.delete(playerId)
            this.bots.set(session.playerId, session)
          }
          resolve()
        },
      )
    })

    socket.on('EXPLAINER_HINT', (payload: { roomId?: string; hint?: string }) => {
      const hint = typeof payload.hint === 'string' && payload.hint.trim() ? payload.hint.trim() : null
      session.explainerHint = hint
      session.onHintChange?.(hint)
    })

    return session
  }

  async spawnBots(roomId: string, count: number): Promise<BotSession[]> {
    const results: BotSession[] = []
    for (let i = 0; i < count; i++) {
      const bot = await this.spawnBot(roomId)
      results.push(bot)
    }
    return results
  }

  destroyBot(playerId: string): void {
    const session = this.bots.get(playerId)
    if (!session) return
    session.socket.emit('leave_room', { roomId: undefined, playerId })
    session.socket.disconnect()
    this.bots.delete(playerId)
  }

  destroyAll(): void {
    for (const [playerId] of this.bots) {
      this.destroyBot(playerId)
    }
  }

  getAll(): BotSession[] {
    return Array.from(this.bots.values())
  }
}
