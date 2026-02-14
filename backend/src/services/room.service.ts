import { randomBytes } from 'node:crypto';
import { redisClient } from '../config/redis';
import {
  AddPlayerInput,
  CreateRoomInput,
  GAME_MAX_ROUNDS,
  GAME_TARGET_SCORE,
  MAX_PLAYERS_PER_ROOM,
  Player,
  RemovePlayerInput,
  ROUND_DURATION_SECONDS,
  RoomState
} from '../models';

const ROOM_KEY_PREFIX = 'room:';
const ROOM_TTL_SECONDS = 24 * 60 * 60;
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_RETRY_LIMIT = 10;

const toRoomKey = (roomId: string): string => `${ROOM_KEY_PREFIX}${roomId}`;

export class RoomServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'RoomServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const createInitialGameState = () => ({
  phase: 'LOBBY' as const,
  currentRound: 0,
  activeTeam: 'A' as const,
  nextTeam: 'A' as const,
  roundDurationSeconds: ROUND_DURATION_SECONDS,
  remainingSeconds: ROUND_DURATION_SECONDS,
  score: {
    A: 0,
    B: 0
  },
  maxRounds: GAME_MAX_ROUNDS,
  targetScore: GAME_TARGET_SCORE
});

export class RoomService {
  async createRoom(input: CreateRoomInput): Promise<RoomState> {
    const roomId = await this.generateUniqueRoomId();
    const now = new Date().toISOString();

    const room: RoomState = {
      roomId,
      hostId: input.creatorId,
      createdAt: now,
      players: [
        {
          id: input.creatorId,
          name: input.creatorName,
          team: 'A',
          joinedAt: now,
          connected: true,
          lastSocketId: input.creatorSocketId
        }
      ],
      game: createInitialGameState()
    };

    await this.saveRoomState(room);
    return room;
  }

  async getRoomState(roomId: string): Promise<RoomState> {
    const room = await this.getRoomOrNull(roomId);

    if (!room) {
      throw new RoomServiceError('ROOM_NOT_FOUND', 'Room does not exist', 404);
    }

    if (!room.game) {
      room.game = createInitialGameState();
      await this.saveRoomState(room);
    }

    if (!room.hostId && room.players.length > 0) {
      room.hostId = room.players[0].id;
      await this.saveRoomState(room);
    }

    return room;
  }

  async addPlayerToRoom(input: AddPlayerInput): Promise<{ room: RoomState; isNewPlayer: boolean }> {
    const room = await this.getRoomState(input.roomId);
    const existingPlayer = room.players.find((player) => player.id === input.playerId);

    if (existingPlayer) {
      existingPlayer.name = input.playerName || existingPlayer.name;
      existingPlayer.connected = true;
      existingPlayer.disconnectedAt = undefined;
      existingPlayer.lastSocketId = input.socketId ?? existingPlayer.lastSocketId;
      await this.saveRoomState(room);
      return { room, isNewPlayer: false };
    }

    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw new RoomServiceError('ROOM_FULL', `Room player limit is ${MAX_PLAYERS_PER_ROOM}`, 409);
    }

    room.players.push({
      id: input.playerId,
      name: input.playerName,
      team: input.team,
      joinedAt: new Date().toISOString(),
      connected: true,
      lastSocketId: input.socketId
    });

    await this.saveRoomState(room);
    return { room, isNewPlayer: true };
  }

  async removePlayerFromRoom(input: RemovePlayerInput): Promise<RoomState> {
    const room = await this.getRoomState(input.roomId);
    const removedHost = room.hostId === input.playerId;
    room.players = room.players.filter((player) => player.id !== input.playerId);

    if (removedHost) {
      const nextHost = room.players
        .slice()
        .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))[0];
      room.hostId = nextHost?.id ?? '';
    }

    await this.saveRoomState(room);
    return room;
  }

  async markPlayerDisconnected(roomId: string, playerId: string): Promise<RoomState> {
    const room = await this.getRoomState(roomId);
    const player = room.players.find((item) => item.id === playerId);

    if (!player) {
      throw new RoomServiceError('PLAYER_NOT_FOUND', 'Player not found in room', 404);
    }

    player.connected = false;
    player.disconnectedAt = new Date().toISOString();
    await this.saveRoomState(room);
    return room;
  }

  async updatePlayers(roomId: string, players: Player[]): Promise<RoomState> {
    const room = await this.getRoomState(roomId);
    room.players = players;
    await this.saveRoomState(room);
    return room;
  }

  async updateRoom(room: RoomState): Promise<RoomState> {
    await this.saveRoomState(room);
    return room;
  }

  private async saveRoomState(room: RoomState): Promise<void> {
    await redisClient.set(toRoomKey(room.roomId), JSON.stringify(room), 'EX', ROOM_TTL_SECONDS);
  }

  private async getRoomOrNull(roomId: string): Promise<RoomState | null> {
    const raw = await redisClient.get(toRoomKey(roomId));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RoomState;
  }

  private async generateUniqueRoomId(): Promise<string> {
    for (let attempt = 0; attempt < ROOM_CODE_RETRY_LIMIT; attempt += 1) {
      const roomId = this.generateRoomCode();
      const exists = await redisClient.exists(toRoomKey(roomId));

      if (!exists) {
        return roomId;
      }
    }

    throw new Error('Failed to generate unique room code');
  }

  private generateRoomCode(): string {
    let result = '';

    while (result.length < ROOM_CODE_LENGTH) {
      const raw = randomBytes(ROOM_CODE_LENGTH).toString('base64url').toUpperCase();
      result += raw.replace(/[^A-Z0-9]/g, '');
    }

    return result.slice(0, ROOM_CODE_LENGTH);
  }
}
