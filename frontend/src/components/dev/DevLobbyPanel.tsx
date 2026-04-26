// frontend/src/components/dev/DevLobbyPanel.tsx
import { useState } from 'react'
import { useDevSession } from '../../contexts/DevSessionContext'

type Props = {
  roomId: string
}

export default function DevLobbyPanel({ roomId }: Props) {
  const { bots, spawnBots, destroyAllBots } = useDevSession()
  const [spawning, setSpawning] = useState(false)

  const handleSpawn = async (count: number) => {
    setSpawning(true)
    try {
      await spawnBots(roomId, count)
    } finally {
      setSpawning(false)
    }
  }

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'rgba(255,200,0,0.07)',
        border: '1px solid rgba(255,200,0,0.25)',
        fontFamily: 'monospace',
        fontSize: '13px',
        color: 'rgba(255,220,80,0.9)',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 700, opacity: 0.7 }}>
        🧪 DEV — тестовые игроки
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: bots.length > 0 ? '10px' : 0 }}>
        <button
          onClick={() => handleSpawn(1)}
          disabled={spawning}
          style={btnStyle}
        >
          +1 бот
        </button>
        <button
          onClick={() => handleSpawn(3)}
          disabled={spawning}
          style={btnStyle}
        >
          +3 бота
        </button>
        {bots.length > 0 && (
          <button
            onClick={destroyAllBots}
            style={{ ...btnStyle, background: 'rgba(255,80,80,0.15)', borderColor: 'rgba(255,80,80,0.3)', color: 'rgba(255,130,130,0.9)' }}
          >
            Удалить всех ({bots.length})
          </button>
        )}
      </div>

      {bots.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {bots.map((bot) => (
            <div key={bot.playerId} style={{ opacity: 0.8, fontSize: '12px' }}>
              {bot.playerName} <span style={{ opacity: 0.5 }}>({bot.playerId.slice(0, 8)}…)</span>
            </div>
          ))}
        </div>
      )}

      {spawning && <div style={{ marginTop: '6px', opacity: 0.6 }}>Подключаю…</div>}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: '8px',
  background: 'rgba(255,200,0,0.1)',
  border: '1px solid rgba(255,200,0,0.3)',
  color: 'rgba(255,220,80,0.9)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '12px',
}
