import { GameState, Player, RoomState, Team } from '../../models';

let playerCounter = 0;

export function createPlayer(overrides: Partial<Player> & { team: Team }): Player {
  playerCounter += 1;
  return {
    id: `p_${playerCounter}`,
    name: `Player ${playerCounter}`,
    joinedAt: new Date(Date.now() - (100 - playerCounter) * 1000).toISOString(),
    connected: true,
    ...overrides,
  };
}

export function createRoom(overrides?: {
  players?: Player[];
  game?: Partial<GameState>;
}): RoomState {
  const players = overrides?.players ?? [
    createPlayer({ team: 'A' }),
    createPlayer({ team: 'A' }),
    createPlayer({ team: 'B' }),
    createPlayer({ team: 'B' }),
  ];

  return {
    roomId: 'TEST01',
    hostId: players[0]?.id ?? 'host',
    createdAt: new Date().toISOString(),
    players,
    game: {
      phase: 'LOBBY',
      currentRound: 0,
      activeTeam: 'A',
      nextTeam: 'A',
      roundDurationSeconds: 60,
      remainingSeconds: 60,
      score: { A: 0, B: 0 },
      maxRounds: 12,
      targetScore: 50,
      playerGuessedScores: {},
      ...overrides?.game,
    },
  };
}

export function resetPlayerCounter(): void {
  playerCounter = 0;
}
