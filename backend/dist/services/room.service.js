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
class RoomService {
    async createRoom(input) {
        const roomId = await this.generateUniqueRoomId();
        const now = new Date().toISOString();
        const room = {
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
    async getRoomState(roomId) {
        const room = await this.getRoomOrNull(roomId);
        if (!room) {
            throw new RoomServiceError('ROOM_NOT_FOUND', 'Room does not exist', 404);
        }
        return room;
    }
    async addPlayerToRoom(input) {
        const room = await this.getRoomState(input.roomId);
        if (room.players.some((player) => player.id === input.playerId)) {
            return room;
        }
        if (room.players.length >= models_1.MAX_PLAYERS_PER_ROOM) {
            throw new RoomServiceError('ROOM_FULL', `Room player limit is ${models_1.MAX_PLAYERS_PER_ROOM}`, 409);
        }
        room.players.push({
            id: input.playerId,
            name: input.playerName,
            joinedAt: new Date().toISOString()
        });
        await this.saveRoomState(room);
        return room;
    }
    async removePlayerFromRoom(input) {
        const room = await this.getRoomState(input.roomId);
        room.players = room.players.filter((player) => player.id !== input.playerId);
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
