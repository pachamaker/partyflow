import { useSearchParams } from 'react-router-dom'
import { SwipeGameplay } from '../components/SwipeGameplay'
import { getStoredRoomId } from '../services/session'

export function GamePage() {
  const [searchParams] = useSearchParams()
  const roomId = searchParams.get('roomId') ?? getStoredRoomId() ?? undefined

  return <SwipeGameplay roomId={roomId} />
}
