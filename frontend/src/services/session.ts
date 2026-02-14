const PLAYER_ID_KEY = 'partyflow_player_id'
const PLAYER_NAME_KEY = 'partyflow_player_name'
const ROOM_ID_KEY = 'partyflow_room_id'

export function getStoredPlayerId(): string | null {
  return localStorage.getItem(PLAYER_ID_KEY)
}

export function setStoredPlayerId(playerId: string): void {
  localStorage.setItem(PLAYER_ID_KEY, playerId)
}

export function ensurePlayerId(): string {
  const existing = getStoredPlayerId()
  if (existing && existing.trim()) {
    return existing
  }

  const next = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `p_${Math.random().toString(36).slice(2, 12)}`

  setStoredPlayerId(next)
  return next
}

export function getStoredPlayerName(): string | null {
  return localStorage.getItem(PLAYER_NAME_KEY)
}

export function setStoredPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name)
}

export function getStoredRoomId(): string | null {
  return sessionStorage.getItem(ROOM_ID_KEY)
}

export function setStoredRoomId(roomId: string): void {
  sessionStorage.setItem(ROOM_ID_KEY, roomId)
}

export function ensurePlayerName(): string {
  const existing = getStoredPlayerName()
  if (existing && existing.trim()) {
    return existing
  }

  const suggested = `Player-${Math.floor(Math.random() * 900 + 100)}`
  const entered = window.prompt('Введите ваше имя для комнаты', suggested)?.trim()
  const finalName = entered || suggested
  setStoredPlayerName(finalName)
  return finalName
}
