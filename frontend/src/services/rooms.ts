export interface CreateRoomResponse {
  roomId: string
}

interface CreateRoomRequest {
  creatorSocketId?: string
  creatorId?: string
  creatorName?: string
}

export interface RoomPlayer {
  id: string
  name: string
  team: 'A' | 'B'
  connected: boolean
}

export interface RoomGameState {
  phase: 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'GAME_END'
  currentRound: number
  activeTeam: 'A' | 'B'
  roundDurationSeconds: number
  remainingSeconds: number
  score: {
    A: number
    B: number
  }
  currentWord?: {
    id: number
    word: string
  }
  activeExplainerId?: string
  winnerTeam?: 'A' | 'B' | 'DRAW'
}

export interface RoomStateResponse {
  room: {
    roomId: string
    hostId: string
    players: RoomPlayer[]
    game: RoomGameState
  }
}

interface ApiResponse {
  roomId?: string
  code?: string
  id?: string
  data?: {
    roomId?: string
  }
}

const ROOM_ID_PATTERN = /^[A-Z0-9]{6}$/

function normalizeRoomId(value: string): string {
  const normalized = value.trim().toUpperCase()

  if (!ROOM_ID_PATTERN.test(normalized)) {
    throw new Error('Сервер вернул некорректный код комнаты')
  }

  return normalized
}

export async function createRoom(request: CreateRoomRequest = {}): Promise<CreateRoomResponse> {
  const hasBody = Boolean(request.creatorSocketId || request.creatorId || request.creatorName)
  const body = hasBody ? JSON.stringify(request) : undefined

  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })

  if (!response.ok) {
    throw new Error('Не удалось создать комнату')
  }

  const payload = (await response.json()) as ApiResponse
  const roomId = payload.roomId ?? payload.code ?? payload.id ?? payload.data?.roomId

  if (!roomId) {
    throw new Error('Сервер не вернул код комнаты')
  }

  return { roomId: normalizeRoomId(roomId) }
}

export async function getRoomState(roomId: string): Promise<RoomStateResponse['room']> {
  const response = await fetch(`/api/rooms/${roomId}`)

  if (!response.ok) {
    throw new Error('Не удалось получить состояние комнаты')
  }

  const payload = (await response.json()) as RoomStateResponse
  return payload.room
}
