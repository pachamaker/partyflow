export const MAX_PLAYERS_PER_ROOM = 20;
export const RECONNECT_GRACE_PERIOD_MS = 5 * 60 * 1000;
export const ROUND_DURATION_SECONDS = 60;
export const GAME_TARGET_SCORE = 50;
export const GAME_MAX_ROUNDS = 12;

export type Team = 'A' | 'B';
export type SwipeDirection = 'up' | 'down';
export type GamePhase = 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'GAME_END';

export type WordItem = {
  id: number;
  word: string;
  difficulty: string;
  category: string;
  hint?: string;
};

export type ScoreState = {
  A: number;
  B: number;
};

export type GameState = {
  phase: GamePhase;
  currentRound: number;
  activeTeam: Team;
  nextTeam: Team;
  roundDurationSeconds: number;
  remainingSeconds: number;
  score: ScoreState;
  maxRounds: number;
  targetScore: number;
  winnerTeam?: Team | 'DRAW';
  roundStartedAt?: string;
  roundEndedAt?: string;
  currentWord?: WordItem;
  activeExplainerId?: string;
};

export type Player = {
  id: string;
  name: string;
  team: Team;
  joinedAt: string;
  connected: boolean;
  disconnectedAt?: string;
  lastSocketId?: string;
};

export type RoomState = {
  roomId: string;
  hostId: string;
  createdAt: string;
  players: Player[];
  game: GameState;
};

export type CreateRoomInput = {
  creatorId: string;
  creatorName: string;
  creatorSocketId?: string;
};

export type AddPlayerInput = {
  roomId: string;
  playerId: string;
  playerName: string;
  team: Team;
  socketId?: string;
};

export type RemovePlayerInput = {
  roomId: string;
  playerId: string;
};

export type JoinRoomPayload = {
  roomId: string;
  playerId?: string;
  playerName?: string;
};

export type LeaveRoomPayload = {
  roomId?: string;
  playerId?: string;
};

export type StartGamePayload = {
  roomId?: string;
  roundDurationSeconds?: number;
};

export type StartRoundPayload = {
  roomId?: string;
};

export type EndRoundPayload = {
  roomId?: string;
  winnerTeam?: Team;
  points?: number;
};

export type WordSwipedPayload = {
  roomId?: string;
  direction?: SwipeDirection;
};

export type RoundSwipeStat = {
  round: number;
  playerId: string;
  team: Team;
  direction: SwipeDirection;
  awardedPoints: number;
  word: WordItem;
  timestamp: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
};

export type SocketPlayerMapping = {
  roomId: string;
  playerId: string;
};

export type ReconnectSession = {
  roomId: string;
  playerId: string;
  connected: boolean;
  socketId?: string;
  disconnectedAt?: string;
};
