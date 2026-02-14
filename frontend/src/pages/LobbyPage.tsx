import { useSocketStatus } from '../hooks/useSocketStatus'

export function LobbyPage() {
  const { isConnected } = useSocketStatus()

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-secondary/70 p-6">
      <h1 className="text-3xl font-bold">Lobby</h1>
      <p className="text-slate-200">Игроки ожидают старта игры.</p>
      <div className="rounded-lg bg-black/20 p-4">
        <p className="font-medium">
          WebSocket:{' '}
          <span className={isConnected ? 'text-accent' : 'text-orange-300'}>
            {isConnected ? 'connected' : 'disconnected'}
          </span>
        </p>
      </div>
    </section>
  )
}
