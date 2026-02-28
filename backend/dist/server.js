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
const models_1 = require("./models");
const services_1 = require("./services");
const app = (0, express_1.default)();
const roomService = new services_1.RoomService();
const playerService = new services_1.PlayerService();
const gameService = new services_1.GameService();
const wordService = new services_1.WordService();
const SWIPE_DEBOUNCE_MS = 200;
const disconnectTimers = new Map();
const roundTimers = new Map();
const explainerRotationByTeam = new Map();
const swipeDebounceExpiresAt = new Map();
app.use((0, cors_1.default)({ origin: env_1.config.corsOrigin }));
app.use(express_1.default.json());
const toErrorBody = (code, message) => ({ code, message });
const disconnectKey = (roomId, playerId) => `${roomId}:${playerId}`;
const swipeKey = (roomId, playerId) => `${roomId}:${playerId}`;
const explainerRotationKey = (roomId, team) => `${roomId}:${team}`;
const toPublicWord = (word) => {
    if (!word) {
        return undefined;
    }
    const { hint: _hint, ...rest } = word;
    return rest;
};
const toPublicRoom = (room) => ({
    ...room,
    game: {
        ...room.game,
        currentWord: toPublicWord(room.game.currentWord)
    }
});
const toPublicGame = (room) => toPublicRoom(room).game;
const toRoundStatsSummary = (stats) => {
    const guessedWords = [];
    const skippedWords = [];
    for (const item of stats) {
        const word = item.word?.word?.trim();
        if (!word) {
            continue;
        }
        if (item.direction === 'up') {
            guessedWords.push(word);
            continue;
        }
        if (item.direction === 'down') {
            skippedWords.push(word);
        }
    }
    return { guessedWords, skippedWords };
};
const resolveHostId = (room) => {
    if (room.hostId) {
        return room.hostId;
    }
    const firstJoinedPlayer = room.players
        .slice()
        .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))[0];
    return firstJoinedPlayer?.id;
};
const broadcastPlayerUpdated = (io, room) => {
    io.to(room.roomId).emit('PLAYER_UPDATED', {
        roomId: room.roomId,
        hostId: resolveHostId(room),
        players: room.players
    });
};
const rebalanceAndBroadcast = async (io, room) => {
    const balanced = playerService.balanceTeams(room.players);
    if (!balanced.changed) {
        return room;
    }
    const updatedRoom = await roomService.updatePlayers(room.roomId, balanced.players);
    io.to(room.roomId).emit('TEAM_BALANCED', {
        roomId: room.roomId,
        hostId: resolveHostId(updatedRoom),
        players: updatedRoom.players
    });
    return updatedRoom;
};
const selectActiveExplainerId = (room, team = room.game.activeTeam) => {
    const connectedTeamPlayers = room.players
        .filter((player) => player.team === team && player.connected)
        .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt));
    const pool = connectedTeamPlayers;
    if (pool.length === 0) {
        return undefined;
    }
    const rotationKey = explainerRotationKey(room.roomId, team);
    const previousExplainerId = explainerRotationByTeam.get(rotationKey);
    const previousExplainerIndex = previousExplainerId
        ? pool.findIndex((player) => player.id === previousExplainerId)
        : -1;
    const nextIndex = previousExplainerIndex >= 0 ? (previousExplainerIndex + 1) % pool.length : 0;
    const nextExplainerId = pool[nextIndex].id;
    explainerRotationByTeam.set(rotationKey, nextExplainerId);
    return nextExplainerId;
};
const ensureActiveExplainer = async (room, team = room.game.activeTeam) => {
    const activeExplainerId = room.game.activeExplainerId;
    if (activeExplainerId) {
        const valid = room.players.some((player) => player.id === activeExplainerId && player.team === team && player.connected);
        if (valid) {
            return room;
        }
    }
    room.game.activeExplainerId = selectActiveExplainerId(room, team);
    return roomService.updateRoom(room);
};
const prepareRoundWord = async (room, options) => {
    await wordService.resetRoundStats(room.roomId, room.game.currentRound);
    const nextWord = await wordService.getRandomWord(room.roomId);
    room.game.currentWord = nextWord;
    const shouldKeepActiveExplainer = Boolean(options?.keepActiveExplainer);
    const currentExplainer = room.game.activeExplainerId;
    const currentExplainerStillValid = Boolean(currentExplainer &&
        room.players.some((player) => player.id === currentExplainer && player.team === room.game.activeTeam && player.connected));
    if (shouldKeepActiveExplainer && currentExplainerStillValid && currentExplainer) {
        explainerRotationByTeam.set(explainerRotationKey(room.roomId, room.game.activeTeam), currentExplainer);
    }
    else {
        room.game.activeExplainerId = selectActiveExplainerId(room);
    }
    return roomService.updateRoom(room);
};
const resetWordsForFreshGame = async (roomId) => {
    await wordService.resetUsedWords(roomId);
};
const resetWordsForRestartedGame = async (roomId) => {
    await wordService.markPreserveUsedWordsOnNextStart(roomId);
    await wordService.resetWordQueue(roomId);
};
const endGameNoWords = async (io, room) => {
    room = gameService.endGame(room);
    room.game.wordsExhausted = true;
    room = await roomService.updateRoom(room);
    io.to(room.roomId).emit('GAME_ENDED', {
        roomId: room.roomId,
        game: room.game,
        winnerTeam: room.game.winnerTeam,
        score: room.game.score,
        reason: 'no_words'
    });
    return room;
};
const emitExplainerHint = (io, room) => {
    const activeExplainerId = room.game.activeExplainerId;
    const hint = room.game.currentWord?.hint;
    if (!activeExplainerId || !hint) {
        return;
    }
    const activeExplainer = room.players.find((player) => player.id === activeExplainerId && player.connected && player.lastSocketId);
    if (!activeExplainer?.lastSocketId) {
        return;
    }
    io.to(activeExplainer.lastSocketId).emit('EXPLAINER_HINT', {
        roomId: room.roomId,
        wordId: room.game.currentWord?.id,
        hint
    });
};
const clearRoundTimer = (roomId) => {
    const timer = roundTimers.get(roomId);
    if (!timer) {
        return;
    }
    clearInterval(timer);
    roundTimers.delete(roomId);
};
const resetExplainerRotation = (roomId) => {
    explainerRotationByTeam.delete(explainerRotationKey(roomId, 'A'));
    explainerRotationByTeam.delete(explainerRotationKey(roomId, 'B'));
};
const startRoundTimer = (io, roomId) => {
    clearRoundTimer(roomId);
    const timer = setInterval(async () => {
        try {
            const room = await roomService.getRoomState(roomId);
            if (room.game.phase !== 'PLAYING') {
                clearRoundTimer(roomId);
                return;
            }
            const ticked = gameService.timerTick(room);
            let updatedRoom = await roomService.updateRoom(ticked.room);
            io.to(roomId).emit('TIMER_TICK', {
                roomId,
                remainingSeconds: updatedRoom.game.remainingSeconds,
                currentRound: updatedRoom.game.currentRound,
                activeTeam: updatedRoom.game.activeTeam
            });
            if (!ticked.roundExpired) {
                return;
            }
            clearRoundTimer(roomId);
            const ended = gameService.endRound(updatedRoom, undefined, 0);
            updatedRoom = ended.room;
            if (!ended.gameEnded) {
                updatedRoom.game.activeExplainerId = selectActiveExplainerId(updatedRoom, updatedRoom.game.nextTeam);
            }
            updatedRoom = await roomService.updateRoom(updatedRoom);
            const roundStats = toRoundStatsSummary(await wordService.getRoundStats(roomId, updatedRoom.game.currentRound));
            io.to(roomId).emit('ROUND_ENDED', {
                roomId,
                game: updatedRoom.game,
                score: updatedRoom.game.score,
                reason: 'timer',
                roundStats
            });
            if (ended.gameEnded) {
                io.to(roomId).emit('GAME_ENDED', {
                    roomId,
                    game: updatedRoom.game,
                    winnerTeam: updatedRoom.game.winnerTeam,
                    score: updatedRoom.game.score
                });
            }
        }
        catch {
            clearRoundTimer(roomId);
        }
    }, 1000);
    roundTimers.set(roomId, timer);
};
const scheduleDisconnectCleanup = (io, roomId, playerId) => {
    const key = disconnectKey(roomId, playerId);
    const existingTimer = disconnectTimers.get(key);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    const timer = setTimeout(async () => {
        disconnectTimers.delete(key);
        try {
            const session = await playerService.getReconnectSession(roomId, playerId);
            if (session?.connected) {
                return;
            }
            const room = await roomService.getRoomState(roomId);
            const player = room.players.find((item) => item.id === playerId);
            if (!player || player.connected) {
                return;
            }
            const updatedRoom = await roomService.removePlayerFromRoom({ roomId, playerId });
            const balancedRoom = await rebalanceAndBroadcast(io, updatedRoom);
            io.to(roomId).emit('PLAYER_LEFT', {
                roomId,
                playerId,
                players: balancedRoom.players,
                reason: 'disconnect_timeout'
            });
            broadcastPlayerUpdated(io, balancedRoom);
            await playerService.clearReconnectSession(roomId, playerId);
        }
        catch {
            // Ignore deferred cleanup errors.
        }
    }, models_1.RECONNECT_GRACE_PERIOD_MS);
    disconnectTimers.set(key, timer);
};
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
        const room = await roomService.createRoom({ creatorId, creatorName, creatorSocketId });
        if (creatorSocketId) {
            const creatorSocket = io.sockets.sockets.get(creatorSocketId);
            if (creatorSocket) {
                creatorSocket.join(room.roomId);
                creatorSocket.data.roomId = room.roomId;
                creatorSocket.data.playerId = creatorId;
            }
            await playerService.setSocketPlayerMapping(creatorSocketId, {
                roomId: room.roomId,
                playerId: creatorId
            });
            await playerService.upsertReconnectSession({
                roomId: room.roomId,
                playerId: creatorId,
                connected: true,
                socketId: creatorSocketId
            });
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
        res.status(200).json({ room: toPublicRoom(room) });
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
        const playerName = String(payload?.playerName ?? '').trim() || 'Player';
        const requestedPlayerId = String(payload?.playerId ?? '').trim();
        if (!roomId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId is required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            const socketMapping = await playerService.getSocketPlayerMapping(socket.id);
            const mappedPlayerId = socketMapping?.roomId === roomId ? socketMapping.playerId : undefined;
            const playerId = mappedPlayerId || requestedPlayerId || playerService.generatePlayerId();
            let currentRoom = await roomService.getRoomState(roomId);
            const staleSocketPlayers = currentRoom.players.filter((player) => player.id !== playerId && player.lastSocketId === socket.id && player.connected);
            if (staleSocketPlayers.length > 0) {
                const disconnectedAt = new Date().toISOString();
                currentRoom.players = currentRoom.players.map((player) => {
                    if (!staleSocketPlayers.some((stale) => stale.id === player.id)) {
                        return player;
                    }
                    return {
                        ...player,
                        connected: false,
                        disconnectedAt
                    };
                });
                currentRoom = await roomService.updateRoom(currentRoom);
            }
            const existingPlayer = currentRoom.players.find((player) => player.id === playerId);
            const team = existingPlayer?.team ?? playerService.assignTeam(currentRoom.players);
            const priorSocketId = existingPlayer?.lastSocketId;
            const result = await roomService.addPlayerToRoom({
                roomId,
                playerId,
                playerName,
                team,
                socketId: socket.id
            });
            let room = result.room;
            room = await rebalanceAndBroadcast(io, room);
            const timerKey = disconnectKey(roomId, playerId);
            const timer = disconnectTimers.get(timerKey);
            if (timer) {
                clearTimeout(timer);
                disconnectTimers.delete(timerKey);
            }
            if (priorSocketId && priorSocketId !== socket.id) {
                await playerService.clearSocketPlayerMapping(priorSocketId);
            }
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.playerId = playerId;
            await playerService.setSocketPlayerMapping(socket.id, { roomId, playerId });
            await playerService.upsertReconnectSession({
                roomId,
                playerId,
                connected: true,
                socketId: socket.id
            });
            const player = room.players.find((item) => item.id === playerId);
            if (result.isNewPlayer) {
                io.to(roomId).emit('PLAYER_JOINED', {
                    roomId,
                    hostId: resolveHostId(room),
                    player,
                    players: room.players
                });
            }
            else {
                io.to(roomId).emit('PLAYER_UPDATED', {
                    roomId,
                    hostId: resolveHostId(room),
                    player,
                    players: room.players,
                    reason: 'reconnected'
                });
            }
            broadcastPlayerUpdated(io, room);
            if (ack) {
                ack({
                    ok: true,
                    room: toPublicRoom(room),
                    playerId,
                    reconnected: !result.isNewPlayer
                });
            }
            if (room.game.phase === 'PLAYING' && room.game.activeExplainerId === playerId) {
                emitExplainerHint(io, room);
            }
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
    socket.on('start_game', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        const playerId = String(socket.data.playerId ?? '').trim();
        const requestedRoundDuration = Number(payload?.roundDurationSeconds);
        const requestedMaxRounds = Number(payload?.maxRounds);
        const requestedTargetScore = Number(payload?.targetScore);
        if (!roomId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId is required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            resetExplainerRotation(roomId);
            clearRoundTimer(roomId);
            let room = await roomService.getRoomState(roomId);
            const hostId = resolveHostId(room);
            if (!playerId || playerId !== hostId) {
                throw new services_1.RoomServiceError('FORBIDDEN', 'Only host can start the game', 403);
            }
            const preserveUsedWords = await wordService.consumePreserveUsedWordsOnNextStart(roomId);
            if (preserveUsedWords) {
                await wordService.resetWordQueue(roomId);
            }
            else {
                await resetWordsForFreshGame(roomId);
            }
            if (Number.isFinite(requestedRoundDuration)) {
                room = gameService.setRoundDuration(room, requestedRoundDuration);
            }
            else if (!Number.isFinite(room.game.roundDurationSeconds)) {
                room = gameService.setRoundDuration(room, models_1.ROUND_DURATION_SECONDS);
            }
            if (Number.isFinite(requestedMaxRounds)) {
                room = gameService.setMaxRounds(room, requestedMaxRounds);
            }
            else if (!Number.isFinite(room.game.maxRounds)) {
                room = gameService.setMaxRounds(room, models_1.GAME_MAX_ROUNDS);
            }
            if (Number.isFinite(requestedTargetScore)) {
                room = gameService.setTargetScore(room, requestedTargetScore);
            }
            else if (!Number.isFinite(room.game.targetScore)) {
                room = gameService.setTargetScore(room, models_1.GAME_TARGET_SCORE);
            }
            room = gameService.startGame(room);
            try {
                room = await prepareRoundWord(room);
            }
            catch (error) {
                if (error instanceof services_1.RoomServiceError && error.code === 'NO_WORDS_AVAILABLE') {
                    room = await endGameNoWords(io, room);
                    if (ack)
                        ack({ ok: true, room, gameEnded: true });
                    return;
                }
                throw error;
            }
            io.to(roomId).emit('GAME_STARTED', {
                roomId,
                game: toPublicGame(room),
                score: room.game.score
            });
            io.to(roomId).emit('ROUND_STARTED', {
                roomId,
                game: toPublicGame(room),
                currentRound: room.game.currentRound,
                activeTeam: room.game.activeTeam,
                activeExplainerId: room.game.activeExplainerId,
                remainingSeconds: room.game.remainingSeconds,
                word: toPublicWord(room.game.currentWord)
            });
            emitExplainerHint(io, room);
            startRoundTimer(io, roomId);
            if (ack)
                ack({ ok: true, room: toPublicRoom(room) });
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                socket.emit('error', body);
                return;
            }
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to start game');
            if (ack)
                ack({ ok: false, error: body });
            socket.emit('error', body);
        }
    });
    socket.on('start_round', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        const playerId = String(socket.data.playerId ?? '').trim();
        if (!roomId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId is required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            let room = await roomService.getRoomState(roomId);
            if (room.game.phase !== 'ROUND_END') {
                throw new services_1.RoomServiceError('INVALID_GAME_STATE', 'Round can only start after previous round ended', 409);
            }
            room = await ensureActiveExplainer(room, room.game.nextTeam);
            if (!playerId || playerId !== room.game.activeExplainerId) {
                throw new services_1.RoomServiceError('FORBIDDEN', 'Only active explainer can start the next round', 403);
            }
            room = gameService.startRound(room);
            try {
                room = await prepareRoundWord(room, { keepActiveExplainer: true });
            }
            catch (error) {
                if (error instanceof services_1.RoomServiceError && error.code === 'NO_WORDS_AVAILABLE') {
                    room = await endGameNoWords(io, room);
                    if (ack)
                        ack({ ok: true, room, gameEnded: true });
                    return;
                }
                throw error;
            }
            io.to(roomId).emit('ROUND_STARTED', {
                roomId,
                game: toPublicGame(room),
                currentRound: room.game.currentRound,
                activeTeam: room.game.activeTeam,
                activeExplainerId: room.game.activeExplainerId,
                remainingSeconds: room.game.remainingSeconds,
                word: toPublicWord(room.game.currentWord)
            });
            emitExplainerHint(io, room);
            startRoundTimer(io, roomId);
            if (ack)
                ack({ ok: true, room: toPublicRoom(room) });
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                socket.emit('error', body);
                return;
            }
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to start round');
            if (ack)
                ack({ ok: false, error: body });
            socket.emit('error', body);
        }
    });
    socket.on('word_swiped', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        const direction = payload?.direction;
        const playerId = String(socket.data.playerId ?? '').trim();
        if (!roomId || !direction || !playerId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId, direction and playerId are required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        if (direction !== 'up' && direction !== 'down') {
            const error = toErrorBody('VALIDATION_ERROR', "direction must be 'up' or 'down'");
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        const debounceEntryKey = swipeKey(roomId, playerId);
        const now = Date.now();
        const blockedUntil = swipeDebounceExpiresAt.get(debounceEntryKey) ?? 0;
        if (now < blockedUntil) {
            if (ack)
                ack({ ok: true, ignored: true, reason: 'DEBOUNCED' });
            return;
        }
        swipeDebounceExpiresAt.set(debounceEntryKey, now + SWIPE_DEBOUNCE_MS);
        try {
            let room = await roomService.getRoomState(roomId);
            if (room.game.phase !== 'PLAYING') {
                throw new services_1.RoomServiceError('INVALID_GAME_STATE', 'Cannot swipe words when game is not in PLAYING state', 409);
            }
            room = await ensureActiveExplainer(room);
            if (!room.game.activeExplainerId) {
                const swipingPlayer = room.players.find((player) => player.id === playerId);
                if (!swipingPlayer || swipingPlayer.team !== room.game.activeTeam) {
                    throw new services_1.RoomServiceError('FORBIDDEN_SWIPE', 'Only active team explainer can send swipes', 403);
                }
                room.game.activeExplainerId = playerId;
                explainerRotationByTeam.set(explainerRotationKey(roomId, room.game.activeTeam), playerId);
                room = await roomService.updateRoom(room);
            }
            if (!room.game.activeExplainerId || room.game.activeExplainerId !== playerId) {
                throw new services_1.RoomServiceError('FORBIDDEN_SWIPE', 'Only active explainer can send swipes', 403);
            }
            const currentWord = room.game.currentWord;
            if (!currentWord) {
                throw new services_1.RoomServiceError('NO_ACTIVE_WORD', 'No active word in current round', 409);
            }
            const timestamp = new Date().toISOString();
            const awardedPoints = direction === 'up' ? 1 : -1;
            room.game.score[room.game.activeTeam] += awardedPoints;
            room.game.playerGuessedScores = room.game.playerGuessedScores || {};
            if (direction === 'up') {
                room.game.playerGuessedScores[playerId] =
                    (room.game.playerGuessedScores[playerId] ?? 0) + 1;
            }
            await wordService.appendRoundStat(roomId, room.game.currentRound, {
                round: room.game.currentRound,
                playerId,
                team: room.game.activeTeam,
                direction,
                awardedPoints,
                word: currentWord,
                timestamp
            });
            try {
                room.game.currentWord = await wordService.getRandomWord(roomId);
                room = await roomService.updateRoom(room);
            }
            catch (error) {
                if (error instanceof services_1.RoomServiceError && error.code === 'NO_WORDS_AVAILABLE') {
                    room.game.currentWord = undefined;
                    room = await endGameNoWords(io, room);
                    io.to(roomId).emit('SCORE_UPDATED', {
                        roomId,
                        teamA: room.game.score.A,
                        teamB: room.game.score.B,
                        lastAction: {
                            playerId,
                            team: room.game.activeTeam,
                            direction,
                            awardedPoints,
                            word: currentWord,
                            timestamp
                        }
                    });
                    if (ack) {
                        ack({
                            ok: true,
                            teamA: room.game.score.A,
                            teamB: room.game.score.B,
                            gameEnded: true
                        });
                    }
                    return;
                }
                throw error;
            }
            io.to(roomId).emit('SCORE_UPDATED', {
                roomId,
                teamA: room.game.score.A,
                teamB: room.game.score.B,
                lastAction: {
                    playerId,
                    team: room.game.activeTeam,
                    direction,
                    awardedPoints,
                    word: currentWord,
                    timestamp
                },
                currentWord: toPublicWord(room.game.currentWord)
            });
            emitExplainerHint(io, room);
            if (ack) {
                ack({
                    ok: true,
                    teamA: room.game.score.A,
                    teamB: room.game.score.B,
                    currentWord: toPublicWord(room.game.currentWord)
                });
            }
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                socket.emit('error', body);
                return;
            }
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to process word swipe');
            if (ack)
                ack({ ok: false, error: body });
            socket.emit('error', body);
        }
    });
    socket.on('end_round', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        const winnerTeam = payload?.winnerTeam;
        const points = typeof payload?.points === 'number' ? payload.points : winnerTeam ? 1 : 0;
        if (!roomId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId is required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            clearRoundTimer(roomId);
            let room = await roomService.getRoomState(roomId);
            const ended = gameService.endRound(room, winnerTeam, points);
            room = ended.room;
            if (!ended.gameEnded) {
                room.game.activeExplainerId = selectActiveExplainerId(room, room.game.nextTeam);
            }
            room = await roomService.updateRoom(room);
            const roundStats = toRoundStatsSummary(await wordService.getRoundStats(roomId, room.game.currentRound));
            io.to(roomId).emit('ROUND_ENDED', {
                roomId,
                game: room.game,
                score: room.game.score,
                winnerTeam,
                points,
                roundStats
            });
            if (ended.gameEnded) {
                io.to(roomId).emit('GAME_ENDED', {
                    roomId,
                    game: room.game,
                    winnerTeam: room.game.winnerTeam,
                    score: room.game.score
                });
            }
            if (ack)
                ack({ ok: true, room: toPublicRoom(room), gameEnded: ended.gameEnded });
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                socket.emit('error', body);
                return;
            }
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to end round');
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
            const timerKey = disconnectKey(roomId, playerId);
            const timer = disconnectTimers.get(timerKey);
            if (timer) {
                clearTimeout(timer);
                disconnectTimers.delete(timerKey);
            }
            let room = await roomService.removePlayerFromRoom({ roomId, playerId });
            room = await rebalanceAndBroadcast(io, room);
            if (room.players.length === 0) {
                resetExplainerRotation(roomId);
            }
            socket.leave(roomId);
            socket.data.roomId = undefined;
            socket.data.playerId = undefined;
            await playerService.clearSocketPlayerMapping(socket.id);
            await playerService.clearReconnectSession(roomId, playerId);
            io.to(roomId).emit('PLAYER_LEFT', {
                roomId,
                hostId: resolveHostId(room),
                playerId,
                players: room.players
            });
            broadcastPlayerUpdated(io, room);
            if (ack)
                ack({ ok: true, room: toPublicRoom(room) });
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
    socket.on('get_round_stats', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        if (!roomId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId is required');
            if (ack)
                ack({ ok: false, error });
            return;
        }
        try {
            const room = await roomService.getRoomState(roomId);
            const resolvedRound = Number.isFinite(Number(payload?.round))
                ? Math.max(1, Math.floor(Number(payload?.round)))
                : Math.max(1, room.game.currentRound);
            const roundStats = toRoundStatsSummary(await wordService.getRoundStats(roomId, resolvedRound));
            if (ack) {
                ack({ ok: true, round: resolvedRound, roundStats });
            }
        }
        catch (error) {
            if (error instanceof services_1.RoomServiceError) {
                const body = toErrorBody(error.code, error.message);
                if (ack)
                    ack({ ok: false, error: body });
                return;
            }
            if (ack)
                ack({ ok: false, error: toErrorBody('INTERNAL_ERROR', 'Failed to get round stats') });
        }
    });
    socket.on('restart_game', async (payload, ack) => {
        const roomId = String(payload?.roomId ?? socket.data.roomId ?? '').trim();
        const playerId = String(socket.data.playerId ?? '').trim();
        if (!roomId) {
            const error = toErrorBody('VALIDATION_ERROR', 'roomId is required');
            if (ack)
                ack({ ok: false, error });
            socket.emit('error', error);
            return;
        }
        try {
            let room = await roomService.getRoomState(roomId);
            const hostId = resolveHostId(room);
            if (!playerId || playerId !== hostId) {
                throw new services_1.RoomServiceError('FORBIDDEN', 'Only host can restart the game', 403);
            }
            if (room.game.phase !== 'GAME_END') {
                throw new services_1.RoomServiceError('INVALID_GAME_STATE', 'Game can only be restarted from GAME_END state', 409);
            }
            clearRoundTimer(roomId);
            resetExplainerRotation(roomId);
            await resetWordsForRestartedGame(roomId);
            const wordsExhausted = Boolean(room.game.wordsExhausted);
            room.players = playerService.shuffleTeams(room.players);
            room = gameService.resetGame(room);
            room.game.wordsExhausted = wordsExhausted;
            room = await roomService.updateRoom(room);
            io.to(roomId).emit('GAME_RESET', {
                roomId,
                room,
                game: room.game
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
            const body = toErrorBody('INTERNAL_ERROR', 'Failed to restart game');
            if (ack)
                ack({ ok: false, error: body });
            socket.emit('error', body);
        }
    });
    socket.on('disconnect', async (reason) => {
        try {
            const mapping = await playerService.getSocketPlayerMapping(socket.id);
            const roomId = String(mapping?.roomId ?? socket.data.roomId ?? '').trim();
            const playerId = String(mapping?.playerId ?? socket.data.playerId ?? '').trim();
            await playerService.clearSocketPlayerMapping(socket.id);
            if (!roomId || !playerId) {
                console.log(`[ws] disconnected: ${socket.id}, reason: ${reason}`);
                return;
            }
            const roomState = await roomService.getRoomState(roomId);
            const currentPlayer = roomState.players.find((player) => player.id === playerId);
            if (!currentPlayer || currentPlayer.lastSocketId !== socket.id) {
                console.log(`[ws] ignored stale disconnect: ${socket.id} for player ${playerId}`);
                return;
            }
            const room = await roomService.markPlayerDisconnected(roomId, playerId);
            await playerService.upsertReconnectSession({
                roomId,
                playerId,
                connected: false,
                disconnectedAt: new Date().toISOString()
            });
            broadcastPlayerUpdated(io, room);
            scheduleDisconnectCleanup(io, roomId, playerId);
        }
        catch {
            // Ignore disconnect cleanup errors.
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
    disconnectTimers.forEach((timer) => {
        clearTimeout(timer);
    });
    disconnectTimers.clear();
    roundTimers.forEach((timer) => {
        clearInterval(timer);
    });
    roundTimers.clear();
    explainerRotationByTeam.clear();
    swipeDebounceExpiresAt.clear();
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
