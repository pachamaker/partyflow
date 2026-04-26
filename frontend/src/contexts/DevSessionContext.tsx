// frontend/src/contexts/DevSessionContext.tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { type Socket } from 'socket.io-client'
import { DevBotManager, type BotSession } from '../services/devBots'

type DevSessionContextValue = {
  bots: BotSession[]
  viewAsPlayerId: string | null
  spawnBots: (roomId: string, count: number) => Promise<void>
  destroyAllBots: () => void
  setViewAsPlayerId: (id: string | null) => void
  getBotSocket: (playerId: string) => Socket | null
  getBotHint: (playerId: string) => string | null
}

const DevSessionContext = createContext<DevSessionContextValue>({
  bots: [],
  viewAsPlayerId: null,
  spawnBots: async () => {},
  destroyAllBots: () => {},
  setViewAsPlayerId: () => {},
  getBotSocket: () => null,
  getBotHint: () => null,
})

export function DevSessionContextProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<DevBotManager>(new DevBotManager())
  const [bots, setBots] = useState<BotSession[]>([])
  const [viewAsPlayerId, setViewAsPlayerId] = useState<string | null>(null)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const manager = managerRef.current
    return () => {
      manager.destroyAll()
    }
  }, [])

  const spawnBots = useCallback(async (roomId: string, count: number) => {
    const spawned = await managerRef.current.spawnBots(roomId, count)
    spawned.forEach((bot) => {
      bot.onHintChange = () => forceUpdate((n) => n + 1)
    })
    setBots(managerRef.current.getAll())
  }, [])

  const destroyAllBots = useCallback(() => {
    managerRef.current.destroyAll()
    setBots([])
    setViewAsPlayerId(null)
  }, [])

  const getBotSocket = useCallback((playerId: string) => {
    const bot = managerRef.current.getAll().find((b) => b.playerId === playerId)
    return bot?.socket ?? null
  }, [])

  const getBotHint = useCallback((playerId: string) => {
    const bot = managerRef.current.getAll().find((b) => b.playerId === playerId)
    return bot?.explainerHint ?? null
  }, [])

  return (
    <DevSessionContext.Provider
      value={{ bots, viewAsPlayerId, spawnBots, destroyAllBots, setViewAsPlayerId, getBotSocket, getBotHint }}
    >
      {children}
    </DevSessionContext.Provider>
  )
}

export function useDevSession(): DevSessionContextValue {
  return useContext(DevSessionContext)
}
