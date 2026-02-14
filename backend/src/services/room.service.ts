import { randomBytes } from 'node:crypto';
import { redisClient } from '../config/redis';
import {
  AddPlayerInput,
  CreateRoomInput,
  MAX_PLAYERS_PER_ROOM,
  RemovePlayerInput,
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

export class RoomService {
  async createRoom(input: CreateRoomInput): Promise<RoomState> {
    const roomId = await this.generateUniqueRoomId();
    const now = new Date().toISOString();

    const room: RoomState = {
      roomId,
      createdAt: now,
      players: [
        {
          id: input.creatorId,
          name: input.creatorName,
          joinedAt: now
        }
      ]
    };

    await this.saveRoomState(room);
    return room;
  }

  async getRoomState(roomId: string): Promise<RoomState> {
    const room = await this.getRoomOrNull(roomId);

    if (!room) {
      throw new RoomServiceError('ROOM_NOT_FOUND', 'Room does not exist', 404);
    }

    return room;
  }

  async addPlayerToRoom(input: AddPlayerInput): Promise<RoomState> {
    const room = await this.getRoomState(input.roomId);

    if (room.players.some((player) => player.id === input.playerId)) {
      return room;
    }

    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw new RoomServiceError('ROOM_FULL', `Room player limit is ${MAX_PLAYERS_PER_ROOM}`, 409);
    }

    room.players.push({
      id: input.playerId,
      name: input.playerName,
      joinedAt: new Date().toISOString()
    });

    await this.saveRoomState(room);
    return room;
  }

  async removePlayerFromRoom(input: RemovePlayerInput): Promise<RoomState> {
    const room = await this.getRoomState(input.roomId);
    room.players = room.players.filter((player) => player.id !== input.playerId);
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
