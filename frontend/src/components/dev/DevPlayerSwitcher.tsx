// frontend/src/components/dev/DevPlayerSwitcher.tsx
import { useDevSession } from '../../contexts/DevSessionContext'
import type { SessionPlayer } from '../../hooks/useGameSession'

type Props = {
  players: SessionPlayer[]
  realPlayerId: string | null | undefined
  activeExplainerId?: string
  activeTeam?: 'A' | 'B'
}

export default function DevPlayerSwitcher({ players, realPlayerId, activeExplainerId, activeTeam }: Props) {
  const { viewAsPlayerId, setViewAsPlayerId, bots } = useDevSession()
  const botIds = new Set(bots.map((b) => b.playerId))

  const effectiveId = viewAsPlayerId ?? realPlayerId

  const getRoleLabel = (player: SessionPlayer) => {
    if (player.id === activeExplainerId) return '🎤'
    if (player.team === activeTeam) return '👂'
    return '👁'
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        background: 'rgba(10, 8, 30, 0.92)',
        border: '1px solid rgba(255,200,0,0.3)',
        borderRadius: '14px',
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: 'rgba(255,220,80,0.9)',
        minWidth: '180px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 700, opacity: 0.6, fontSize: '11px' }}>
        🧪 DEV — смена игрока
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {players.map((player) => {
          const isSelected = player.id === effectiveId
          const isBot = botIds.has(player.id)
          const isReal = player.id === realPlayerId

          return (
            <button
              key={player.id}
              onClick={() => setViewAsPlayerId(isReal ? null : player.id)}
              style={{
                textAlign: 'left',
                padding: '5px 8px',
                borderRadius: '8px',
                border: isSelected
                  ? '1px solid rgba(255,200,0,0.6)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(255,200,0,0.12)' : 'transparent',
                color: isSelected ? 'rgba(255,220,80,1)' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{getRoleLabel(player)}</span>
              <span style={{ flex: 1 }}>
                {player.name}
                {isReal && <span style={{ opacity: 0.5, marginLeft: '4px' }}>(я)</span>}
                {isBot && !isReal && <span style={{ opacity: 0.5, marginLeft: '4px' }}>(бот)</span>}
              </span>
              <span style={{ opacity: 0.5, fontSize: '10px' }}>{player.team}</span>
            </button>
          )
        })}
      </div>

      {viewAsPlayerId && viewAsPlayerId !== realPlayerId && (
        <button
          onClick={() => setViewAsPlayerId(null)}
          style={{
            marginTop: '8px',
            width: '100%',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid rgba(255,80,80,0.3)',
            background: 'rgba(255,80,80,0.08)',
            color: 'rgba(255,130,130,0.9)',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          ← вернуться к себе
        </button>
      )}
    </div>
  )
}
