export interface CreateRoomResponse {
  roomId: string
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

export async function createRoom(): Promise<CreateRoomResponse> {
  const response = await fetch('/api/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
