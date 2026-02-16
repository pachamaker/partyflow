const PLAYER_ID_KEY = 'poyasni_player_id'
const PLAYER_NAME_KEY = 'poyasni_player_name'
const ROOM_ID_KEY = 'poyasni_room_id'

const LEGACY_PLAYER_ID_KEY = 'partyflow_player_id'
const LEGACY_PLAYER_NAME_KEY = 'partyflow_player_name'
const LEGACY_ROOM_ID_KEY = 'partyflow_room_id'

export function getStoredPlayerId(): string | null {
  const current = localStorage.getItem(PLAYER_ID_KEY)
  if (current) {
    return current
  }

  const legacy = localStorage.getItem(LEGACY_PLAYER_ID_KEY)
  if (legacy) {
    localStorage.setItem(PLAYER_ID_KEY, legacy)
    return legacy
  }

  return null
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
  const current = localStorage.getItem(PLAYER_NAME_KEY)
  if (current) {
    return current
  }

  const legacy = localStorage.getItem(LEGACY_PLAYER_NAME_KEY)
  if (legacy) {
    localStorage.setItem(PLAYER_NAME_KEY, legacy)
    return legacy
  }

  return null
}

export function setStoredPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name)
}

export function getStoredRoomId(): string | null {
  const current = sessionStorage.getItem(ROOM_ID_KEY)
  if (current) {
    return current
  }

  const legacy = sessionStorage.getItem(LEGACY_ROOM_ID_KEY)
  if (legacy) {
    sessionStorage.setItem(ROOM_ID_KEY, legacy)
    return legacy
  }

  return null
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
