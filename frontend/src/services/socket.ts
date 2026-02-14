import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_WS_URL || window.location.origin

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
})

export function connectSocket(): Promise<string> {
  if (socket.connected) {
    return Promise.resolve(socket.id ?? '')
  }

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup()
      resolve(socket.id ?? '')
    }

    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const cleanup = () => {
      socket.off('connect', onConnect)
      socket.off('connect_error', onError)
    }

    socket.on('connect', onConnect)
    socket.on('connect_error', onError)
    socket.connect()
  })
}
