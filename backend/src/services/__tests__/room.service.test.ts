import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GAME_MAX_ROUNDS,
  GAME_TARGET_SCORE,
  MAX_PLAYERS_PER_ROOM,
  ROUND_DURATION_SECONDS,
} from '../../models';
import { RoomService, RoomServiceError } from '../room.service';
import { createPlayer, createRoom, resetPlayerCounter } from './helpers';

// ---------------------------------------------------------------------------
// Redis mock
// ---------------------------------------------------------------------------
vi.mock('../../config/redis', () => ({
  redisClient: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(0),
  },
}));

import { redisClient } from '../../config/redis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Configures the redis `get` mock to return the given RoomState serialised as JSON.
 */
function mockRoomInRedis(room: ReturnType<typeof createRoom>) {
  vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(room));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let roomService: RoomService;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: `exists` returns 0 (room ID not taken), `get` returns null
  vi.mocked(redisClient.exists).mockResolvedValue(0);
  vi.mocked(redisClient.get).mockResolvedValue(null);
  vi.mocked(redisClient.set).mockResolvedValue('OK');

  roomService = new RoomService();
  resetPlayerCounter();
});

// ---------------------------------------------------------------------------
// RoomServiceError
// ---------------------------------------------------------------------------
describe('RoomServiceError', () => {
  it('has correct name, code, message, and statusCode', () => {
    const err = new RoomServiceError('ROOM_FULL', 'Room is full', 409);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(RoomServiceError);
    expect(err.name).toBe('RoomServiceError');
    expect(err.code).toBe('ROOM_FULL');
    expect(err.message).toBe('Room is full');
    expect(err.statusCode).toBe(409);
  });

  it('supports different codes and status codes', () => {
    const err = new RoomServiceError('ROOM_NOT_FOUND', 'Not found', 404);
    expect(err.code).toBe('ROOM_NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------
describe('createRoom', () => {
  it('creates a room with the creator as first player on team A', async () => {
    const room = await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
      creatorSocketId: 'socket-1',
    });

    expect(room.players).toHaveLength(1);
    const creator = room.players[0];
    expect(creator.id).toBe('user-1');
    expect(creator.name).toBe('Alice');
    expect(creator.team).toBe('A');
    expect(creator.connected).toBe(true);
    expect(creator.lastSocketId).toBe('socket-1');
  });

  it('sets hostId to creatorId', async () => {
    const room = await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
    });
    expect(room.hostId).toBe('user-1');
  });

  it('starts game in LOBBY phase with correct defaults', async () => {
    const room = await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
    });

    expect(room.game.phase).toBe('LOBBY');
    expect(room.game.currentRound).toBe(0);
    expect(room.game.activeTeam).toBe('A');
    expect(room.game.nextTeam).toBe('A');
    expect(room.game.roundDurationSeconds).toBe(ROUND_DURATION_SECONDS);
    expect(room.game.remainingSeconds).toBe(ROUND_DURATION_SECONDS);
    expect(room.game.score).toEqual({ A: 0, B: 0 });
    expect(room.game.maxRounds).toBe(GAME_MAX_ROUNDS);
    expect(room.game.targetScore).toBe(GAME_TARGET_SCORE);
    expect(room.game.playerGuessedScores).toEqual({});
    expect(room.game.wordsExhausted).toBe(false);
  });

  it('saves to Redis via redisClient.set', async () => {
    await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
    });

    expect(redisClient.set).toHaveBeenCalledOnce();
    // The key should start with 'room:'
    const [keyArg] = vi.mocked(redisClient.set).mock.calls[0];
    expect(String(keyArg)).toMatch(/^room:/);
  });

  it('checks Redis for existing room IDs via redisClient.exists', async () => {
    await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
    });

    expect(redisClient.exists).toHaveBeenCalledOnce();
  });

  it('works when creatorSocketId is omitted', async () => {
    const room = await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
    });
    expect(room.players[0].lastSocketId).toBeUndefined();
  });

  it('populates createdAt as a valid ISO timestamp', async () => {
    const room = await roomService.createRoom({
      creatorId: 'user-1',
      creatorName: 'Alice',
    });
    expect(() => new Date(room.createdAt)).not.toThrow();
    expect(room.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws when Redis exists returns 1 for all attempts (retry exhausted)', async () => {
    vi.mocked(redisClient.exists).mockResolvedValue(1);
    // implementation throws a plain Error (not RoomServiceError) for internal failures
    await expect(
      roomService.createRoom({ creatorId: 'user-1', creatorName: 'Alice' })
    ).rejects.toThrow('Failed to generate unique room code');
  });
});

// ---------------------------------------------------------------------------
// getRoomState
// ---------------------------------------------------------------------------
describe('getRoomState', () => {
  it('throws RoomServiceError ROOM_NOT_FOUND (404) when room does not exist', async () => {
    vi.mocked(redisClient.get).mockResolvedValue(null);

    await expect(roomService.getRoomState('NOROOM')).rejects.toMatchObject({
      code: 'ROOM_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('returns the parsed room state from Redis', async () => {
    const room = createRoom();
    mockRoomInRedis(room);

    const result = await roomService.getRoomState('TEST01');
    expect(result.roomId).toBe('TEST01');
    expect(result.players).toHaveLength(room.players.length);
  });

  it('backfills missing game field and calls saveRoomState', async () => {
    const room = createRoom();
    const { game: _game, ...roomWithoutGame } = room;
    vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(roomWithoutGame));

    const result = await roomService.getRoomState('TEST01');
    expect(result.game).toBeDefined();
    expect(result.game.phase).toBe('LOBBY');
    // saveRoomState calls redisClient.set
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('backfills missing game.playerGuessedScores and calls saveRoomState', async () => {
    const room = createRoom();
    const { playerGuessedScores: _pgs, ...gameWithoutScores } = room.game;
    const roomData = { ...room, game: gameWithoutScores };
    vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(roomData));

    const result = await roomService.getRoomState('TEST01');
    expect(result.game.playerGuessedScores).toEqual({});
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('backfills wordsExhausted when not a boolean and calls saveRoomState', async () => {
    const room = createRoom();
    // JSON.stringify silently drops undefined values, so build the JSON string manually
    // to place null (a realistic Redis corruption value) in the wordsExhausted field
    const json = JSON.stringify({ ...room, game: { ...room.game, wordsExhausted: false } })
      .replace('"wordsExhausted":false', '"wordsExhausted":null');
    vi.mocked(redisClient.get).mockResolvedValue(json);

    const result = await roomService.getRoomState('TEST01');
    expect(result.game.wordsExhausted).toBe(false);
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('sets hostId from first player when hostId is missing', async () => {
    const room = createRoom();
    const firstPlayerId = room.players[0].id;
    const { hostId: _hostId, ...roomWithoutHost } = room;
    const roomData = { ...roomWithoutHost, hostId: '' };
    vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(roomData));

    const result = await roomService.getRoomState('TEST01');
    expect(result.hostId).toBe(firstPlayerId);
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('does not call saveRoomState when all fields are present and valid', async () => {
    // Explicitly include wordsExhausted so no backfill is triggered
    const room = createRoom({ game: { wordsExhausted: false } });
    mockRoomInRedis(room);

    await roomService.getRoomState('TEST01');
    // No backfill needed → set should not be called
    expect(redisClient.set).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// addPlayerToRoom
// ---------------------------------------------------------------------------
describe('addPlayerToRoom', () => {
  it('returns isNewPlayer: false when player already exists (reconnect)', async () => {
    const existingPlayer = createPlayer({ team: 'A' });
    const room = createRoom({ players: [existingPlayer] });
    mockRoomInRedis(room);

    const { isNewPlayer, room: updatedRoom } = await roomService.addPlayerToRoom({
      roomId: 'TEST01',
      playerId: existingPlayer.id,
      playerName: 'UpdatedName',
      team: 'A',
      socketId: 'new-socket',
    });

    expect(isNewPlayer).toBe(false);
    const player = updatedRoom.players.find((p) => p.id === existingPlayer.id)!;
    expect(player.name).toBe('UpdatedName');
    expect(player.connected).toBe(true);
    expect(player.disconnectedAt).toBeUndefined();
    expect(player.lastSocketId).toBe('new-socket');
  });

  it('clears disconnectedAt on reconnect', async () => {
    const existingPlayer = createPlayer({
      team: 'A',
      connected: false,
      disconnectedAt: new Date().toISOString(),
    });
    const room = createRoom({ players: [existingPlayer] });
    mockRoomInRedis(room);

    const { room: updatedRoom } = await roomService.addPlayerToRoom({
      roomId: 'TEST01',
      playerId: existingPlayer.id,
      playerName: existingPlayer.name,
      team: 'A',
    });

    const player = updatedRoom.players.find((p) => p.id === existingPlayer.id)!;
    expect(player.disconnectedAt).toBeUndefined();
    expect(player.connected).toBe(true);
  });

  it('returns isNewPlayer: true for a genuinely new player', async () => {
    const room = createRoom({ players: [createPlayer({ team: 'A' })] });
    mockRoomInRedis(room);

    const { isNewPlayer, room: updatedRoom } = await roomService.addPlayerToRoom({
      roomId: 'TEST01',
      playerId: 'brand-new-player',
      playerName: 'Bob',
      team: 'B',
      socketId: 'socket-bob',
    });

    expect(isNewPlayer).toBe(true);
    expect(updatedRoom.players).toHaveLength(2);
    const newPlayer = updatedRoom.players.find((p) => p.id === 'brand-new-player')!;
    expect(newPlayer.name).toBe('Bob');
    expect(newPlayer.team).toBe('B');
    expect(newPlayer.connected).toBe(true);
  });

  it('throws RoomServiceError ROOM_FULL (409) when at max capacity', async () => {
    const players = Array.from({ length: MAX_PLAYERS_PER_ROOM }, (_, i) =>
      createPlayer({ id: `p_${i}`, team: i % 2 === 0 ? 'A' : 'B' })
    );
    const room = createRoom({ players });
    mockRoomInRedis(room);

    await expect(
      roomService.addPlayerToRoom({
        roomId: 'TEST01',
        playerId: 'overflow-player',
        playerName: 'Extra',
        team: 'A',
      })
    ).rejects.toMatchObject({ code: 'ROOM_FULL', statusCode: 409 });
  });

  it('saves to Redis after adding a new player', async () => {
    const room = createRoom({ players: [createPlayer({ team: 'A' })] });
    mockRoomInRedis(room);

    await roomService.addPlayerToRoom({
      roomId: 'TEST01',
      playerId: 'new-player',
      playerName: 'Bob',
      team: 'B',
    });

    expect(redisClient.set).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// removePlayerFromRoom
// ---------------------------------------------------------------------------
describe('removePlayerFromRoom', () => {
  it('removes the player from the room', async () => {
    const playerA = createPlayer({ team: 'A' });
    const playerB = createPlayer({ team: 'B' });
    const room = createRoom({ players: [playerA, playerB] });
    room.hostId = playerA.id;
    mockRoomInRedis(room);

    const result = await roomService.removePlayerFromRoom({
      roomId: 'TEST01',
      playerId: playerB.id,
    });

    expect(result.players).toHaveLength(1);
    expect(result.players.find((p) => p.id === playerB.id)).toBeUndefined();
  });

  it('reassigns host to earliest-joined remaining player when host leaves', async () => {
    const host = createPlayer({ team: 'A' });
    const other = createPlayer({ team: 'B' });
    const room = createRoom({ players: [host, other] });
    room.hostId = host.id;
    mockRoomInRedis(room);

    const result = await roomService.removePlayerFromRoom({
      roomId: 'TEST01',
      playerId: host.id,
    });

    expect(result.hostId).toBe(other.id);
  });

  it('keeps hostId unchanged when a non-host player is removed', async () => {
    const host = createPlayer({ team: 'A' });
    const other = createPlayer({ team: 'B' });
    const room = createRoom({ players: [host, other] });
    room.hostId = host.id;
    mockRoomInRedis(room);

    const result = await roomService.removePlayerFromRoom({
      roomId: 'TEST01',
      playerId: other.id,
    });

    expect(result.hostId).toBe(host.id);
  });

  it('sets hostId to empty string when the only player is removed', async () => {
    const host = createPlayer({ team: 'A' });
    const room = createRoom({ players: [host] });
    room.hostId = host.id;
    mockRoomInRedis(room);

    const result = await roomService.removePlayerFromRoom({
      roomId: 'TEST01',
      playerId: host.id,
    });

    expect(result.players).toHaveLength(0);
    expect(result.hostId).toBe('');
  });

  it('reassigns host to the player with the earliest joinedAt', async () => {
    // Create players with controlled joinedAt
    const host = createPlayer({ team: 'A' });
    const earliest = {
      ...createPlayer({ team: 'A' }),
      joinedAt: new Date(Date.now() - 5000).toISOString(),
    };
    const latest = {
      ...createPlayer({ team: 'B' }),
      joinedAt: new Date(Date.now() - 1000).toISOString(),
    };
    const room = createRoom({ players: [host, earliest, latest] });
    room.hostId = host.id;
    mockRoomInRedis(room);

    const result = await roomService.removePlayerFromRoom({
      roomId: 'TEST01',
      playerId: host.id,
    });

    expect(result.hostId).toBe(earliest.id);
  });

  it('saves to Redis after removal', async () => {
    const player = createPlayer({ team: 'A' });
    const room = createRoom({ players: [player] });
    room.hostId = player.id;
    mockRoomInRedis(room);

    await roomService.removePlayerFromRoom({
      roomId: 'TEST01',
      playerId: player.id,
    });

    expect(redisClient.set).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markPlayerDisconnected
// ---------------------------------------------------------------------------
describe('markPlayerDisconnected', () => {
  it('sets player.connected to false', async () => {
    const player = createPlayer({ team: 'A' });
    const room = createRoom({ players: [player] });
    mockRoomInRedis(room);

    const result = await roomService.markPlayerDisconnected('TEST01', player.id);
    const found = result.players.find((p) => p.id === player.id)!;
    expect(found.connected).toBe(false);
  });

  it('sets player.disconnectedAt to a valid ISO timestamp', async () => {
    const player = createPlayer({ team: 'A' });
    const room = createRoom({ players: [player] });
    mockRoomInRedis(room);

    const result = await roomService.markPlayerDisconnected('TEST01', player.id);
    const found = result.players.find((p) => p.id === player.id)!;
    expect(found.disconnectedAt).toBeDefined();
    expect(() => new Date(found.disconnectedAt!)).not.toThrow();
  });

  it('throws RoomServiceError PLAYER_NOT_FOUND (404) when player is not in room', async () => {
    const room = createRoom({ players: [createPlayer({ team: 'A' })] });
    mockRoomInRedis(room);

    await expect(
      roomService.markPlayerDisconnected('TEST01', 'nonexistent-player')
    ).rejects.toMatchObject({ code: 'PLAYER_NOT_FOUND', statusCode: 404 });
  });

  it('saves to Redis after marking disconnected', async () => {
    const player = createPlayer({ team: 'A' });
    const room = createRoom({ players: [player] });
    mockRoomInRedis(room);

    await roomService.markPlayerDisconnected('TEST01', player.id);
    expect(redisClient.set).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePlayers
// ---------------------------------------------------------------------------
describe('updatePlayers', () => {
  it('replaces the players array with the provided list', async () => {
    const original = createRoom();
    mockRoomInRedis(original);

    const newPlayers = [createPlayer({ team: 'A' }), createPlayer({ team: 'B' })];
    const result = await roomService.updatePlayers('TEST01', newPlayers);

    expect(result.players).toHaveLength(2);
    expect(result.players.map((p) => p.id)).toEqual(newPlayers.map((p) => p.id));
  });

  it('saves to Redis after updating players', async () => {
    const room = createRoom();
    mockRoomInRedis(room);

    await roomService.updatePlayers('TEST01', []);
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('throws ROOM_NOT_FOUND when room does not exist', async () => {
    vi.mocked(redisClient.get).mockResolvedValue(null);

    await expect(roomService.updatePlayers('NOROOM', [])).rejects.toMatchObject({
      code: 'ROOM_NOT_FOUND',
      statusCode: 404,
    });
  });
});

// ---------------------------------------------------------------------------
// updateRoom
// ---------------------------------------------------------------------------
describe('updateRoom', () => {
  it('saves the room to Redis and returns it', async () => {
    const room = createRoom();

    const result = await roomService.updateRoom(room);

    expect(result).toBe(room);
    expect(redisClient.set).toHaveBeenCalledOnce();
    const [keyArg, valueArg] = vi.mocked(redisClient.set).mock.calls[0];
    expect(String(keyArg)).toBe(`room:${room.roomId}`);
    expect(JSON.parse(String(valueArg))).toMatchObject({ roomId: room.roomId });
  });

  it('persists game state changes', async () => {
    const room = createRoom({ game: { phase: 'PLAYING', currentRound: 3 } });

    await roomService.updateRoom(room);

    const [, valueArg] = vi.mocked(redisClient.set).mock.calls[0];
    const saved = JSON.parse(String(valueArg));
    expect(saved.game.phase).toBe('PLAYING');
    expect(saved.game.currentRound).toBe(3);
  });

  it('sets TTL when saving room state', async () => {
    const room = createRoom();

    await roomService.updateRoom(room);

    // verify TTL was set
    const [, , exArg, ttlArg] = vi.mocked(redisClient.set).mock.calls[0];
    expect(exArg).toBe('EX');
    expect(ttlArg).toBe(24 * 60 * 60); // ROOM_TTL_SECONDS = 86400
  });
});
