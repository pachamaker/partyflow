"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_http_1 = require("node:http");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const redis_1 = require("./config/redis");
const health_controller_1 = require("./controllers/health.controller");
const services_1 = require("./services");
const app = (0, express_1.default)();
const roomService = new services_1.RoomService();
app.use((0, cors_1.default)({ origin: env_1.config.corsOrigin }));
app.use(express_1.default.json());
const toErrorBody = (code, message) => ({ code, message });
app.get('/health', health_controller_1.healthCheck);
const httpServer = (0, node_http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: env_1.config.corsOrigin,
        methods: ['GET', 'POST']
    }
});
app.post('/api/rooms', async (req, res) => {
    const creatorSocketId = String(req.body?.creatorSocketId ?? '').trim();
    const creatorId = String(req.body?.creatorId ?? '').trim() || creatorSocketId || (0, node_crypto_1.randomUUID)();
    const creatorName = String(req.body?.creatorName ?? '').trim() || 'Host';
    if (!creatorId) {
        res.status(400).json(toErrorBody('VALIDATION_ERROR', 'creatorId is required'));
        return;
    }
    try {
        const room = await roomService.createRoom({ creatorId, creatorName });
        if (creatorSocketId) {
            const creatorSocket = io.sockets.sockets.get(creatorSocketId);
            if (creatorSocket) {
                creatorSocket.join(room.roomId);
                creatorSocket.data.roomId = room.roomId;
                creatorSocket.data.playerId = creatorId;
            }
            io.to(creatorSocketId).emit('ROOM_CREATED', {
                roomId: room.roomId,
                room,
                createdAt: room.createdAt
            });
        }
        res.status(201).json({
            roomId: room.roomId,
            room
        });
    }
    catch (error) {
        if (error instanceof services_1.RoomServiceError) {
            res.status(error.statusCode).json(toErrorBody(error.code, error.message));
            return;
        }
        res.status(500).json(toErrorBody('INTERNAL_ERROR', 'Failed to create room'));
    }
});
app.get('/api/rooms/:roomId', async (req, res) => {
    const roomId = String(req.params.roomId ?? '').trim();
    if (!roomId) {
        res.status(400).json(toErrorBody('VALIDATION_ERROR', 'roomId is required'));
        return;
    }
    try {
        const room = await roomService.getRoomState(roomId);
        res.status(200).json({ room });
    }
    catch (error) {
        if (error instanceof services_1.RoomServiceError) {
            res.status(error.statusCode).json(toErrorBody(error.code, error.message));
            return;
        }
        res.status(500).json(toErrorBody('INTERNAL_ERROR', 'Failed to get room state'));
    }
});
io.on('connection', (socket) => {
    console.log(`[ws] connected: ${socket.id}`);
    socket.emit('connected', {
        socketId: socket.id,
        timestamp: new Date().toISOString()
    });
    socket.on('join_room', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? '').trim();
        const playerId = String(payload?.playerId ?? '').trim();
        const playerName = String(payload?.playerName ?? '').trim() || 'Player';
        if (!roomId || !playerId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId and playerId are required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            const room = await roomService.addPlayerToRoom({ roomId, playerId, playerName });
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.playerId = playerId;
            io.to(roomId).emit('PLAYER_JOINED', {
                roomId,
                player: room.players.find((player) => player.id === playerId),
                players: room.players
            });
            if (ack)
                ack({ ok: true, room });
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                socket.emit('error', body);
                return;
            }
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to join room');
            if (ack)
                ack({ ok: false, error: body });
            socket.emit('error', body);
        }
    });
    socket.on('leave_room', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        const playerId = String(payload?.playerId ?? socket.data.playerId ?? '').trim();
        if (!roomId || !playerId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId and playerId are required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            const room = await roomService.removePlayerFromRoom({ roomId, playerId });
            socket.leave(roomId);
            socket.data.roomId = undefined;
            socket.data.playerId = undefined;
            io.to(roomId).emit('PLAYER_LEFT', {
                roomId,
                playerId,
                players: room.players
            });
            if (ack)
                ack({ ok: true, room });
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                socket.emit('error', body);
                return;
            }
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to leave room');
            if (ack)
                ack({ ok: false, error: body });
            socket.emit('error', body);
        }
    });
    socket.on('disconnect', async (reason) => {
        const roomId = String(socket.data.roomId ?? '').trim();
        const playerId = String(socket.data.playerId ?? '').trim();
        if (roomId && playerId) {
            try {
                const room = await roomService.removePlayerFromRoom({ roomId, playerId });
                io.to(roomId).emit('PLAYER_LEFT', {
                    roomId,
                    playerId,
                    players: room.players
                });
            }
            catch {
                // Ignore cleanup errors on disconnect.
            }
        }
        console.log(`[ws] disconnected: ${socket.id}, reason: ${reason}`);
    });
});
httpServer.listen(env_1.config.port, () => {
    console.log(`Server listening on http://localhost:${env_1.config.port}`);
});
const shutdown = async () => {
    console.log('Shutting down server...');
    io.close();
    try {
        await redis_1.redisClient.quit();
    }
    catch {
        redis_1.redisClient.disconnect();
    }
    httpServer.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
