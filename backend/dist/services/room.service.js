"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = exports.RoomServiceError = void 0;
const node_crypto_1 = require("node:crypto");
const redis_1 = require("../config/redis");
const models_1 = require("../models");
const ROOM_KEY_PREFIX = 'room:';
const ROOM_TTL_SECONDS = 24 * 60 * 60;
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_RETRY_LIMIT = 10;
const toRoomKey = (roomId) => `${ROOM_KEY_PREFIX}${roomId}`;
class RoomServiceError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode) {
        super(message);
        this.name = 'RoomServiceError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.RoomServiceError = RoomServiceError;
const createInitialGameState = () => ({
    phase: 'LOBBY',
    currentRound: 0,
    activeTeam: 'A',
    nextTeam: 'A',
    roundDurationSeconds: models_1.ROUND_DURATION_SECONDS,
    remainingSeconds: models_1.ROUND_DURATION_SECONDS,
    score: {
        A: 0,
        B: 0
    },
    maxRounds: models_1.GAME_MAX_ROUNDS,
    targetScore: models_1.GAME_TARGET_SCORE
});
class RoomService {
    async createRoom(input) {
        const roomId = await this.generateUniqueRoomId();
        const now = new Date().toISOString();
        const room = {
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
    async getRoomState(roomId) {
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
    async addPlayerToRoom(input) {
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
        if (room.players.length >= models_1.MAX_PLAYERS_PER_ROOM) {
            throw new RoomServiceError('ROOM_FULL', `Room player limit is ${models_1.MAX_PLAYERS_PER_ROOM}`, 409);
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
    async removePlayerFromRoom(input) {
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
    async markPlayerDisconnected(roomId, playerId) {
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
    async updatePlayers(roomId, players) {
        const room = await this.getRoomState(roomId);
        room.players = players;
        await this.saveRoomState(room);
        return room;
    }
    async updateRoom(room) {
        await this.saveRoomState(room);
        return room;
    }
    async saveRoomState(room) {
        await redis_1.redisClient.set(toRoomKey(room.roomId), JSON.stringify(room), 'EX', ROOM_TTL_SECONDS);
    }
    async getRoomOrNull(roomId) {
        const raw = await redis_1.redisClient.get(toRoomKey(roomId));
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    }
    async generateUniqueRoomId() {
        for (let attempt = 0; attempt < ROOM_CODE_RETRY_LIMIT; attempt += 1) {
            const roomId = this.generateRoomCode();
            const exists = await redis_1.redisClient.exists(toRoomKey(roomId));
            if (!exists) {
                return roomId;
            }
        }
        throw new Error('Failed to generate unique room code');
    }
    generateRoomCode() {
        let result = '';
        while (result.length < ROOM_CODE_LENGTH) {
            const raw = (0, node_crypto_1.randomBytes)(ROOM_CODE_LENGTH).toString('base64url').toUpperCase();
            result += raw.replace(/[^A-Z0-9]/g, '');
        }
        return result.slice(0, ROOM_CODE_LENGTH);
    }
}
exports.RoomService = RoomService;
