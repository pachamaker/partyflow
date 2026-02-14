import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_WS_URL || window.location.origin

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: '/socket.io',
  transports: ['websocket', 'polling'],
})
