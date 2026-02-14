export const routes = {
  home: '/',
  lobby: '/lobby',
  lobbyWithRoomParam: '/lobby/:roomId',
  lobbyById: (roomId: string) => `/lobby/${roomId}`,
  game: '/game',
  results: '/results',
} as const
