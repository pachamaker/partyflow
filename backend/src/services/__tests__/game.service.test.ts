import { beforeEach, describe, expect, it } from 'vitest';
import { GameState } from '../../models';
import { GameService } from '../game.service';
import { RoomServiceError } from '../room.service';
import { createPlayer, createRoom, resetPlayerCounter } from './helpers';

const gameService = new GameService();

beforeEach(() => {
  resetPlayerCounter();
});

// ---------------------------------------------------------------------------
// setRoundDuration
// ---------------------------------------------------------------------------
describe('setRoundDuration', () => {
  it('sets duration within valid range', () => {
    const room = createRoom();
    const result = gameService.setRoundDuration(room, 90);
    expect(result.game.roundDurationSeconds).toBe(90);
    expect(result.game.remainingSeconds).toBe(90);
  });

  it('clamps below minimum to 10', () => {
    const room = createRoom();
    const result = gameService.setRoundDuration(room, 3);
    expect(result.game.roundDurationSeconds).toBe(10);
  });

  it('clamps above maximum to 300', () => {
    const room = createRoom();
    const result = gameService.setRoundDuration(room, 999);
    expect(result.game.roundDurationSeconds).toBe(300);
  });

  it('floors fractional values', () => {
    const room = createRoom();
    const result = gameService.setRoundDuration(room, 45.9);
    expect(result.game.roundDurationSeconds).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// setMaxRounds
// ---------------------------------------------------------------------------
describe('setMaxRounds', () => {
  it('sets maxRounds within valid range', () => {
    const room = createRoom();
    const result = gameService.setMaxRounds(room, 20);
    expect(result.game.maxRounds).toBe(20);
  });

  it('clamps below minimum to 1', () => {
    const room = createRoom();
    const result = gameService.setMaxRounds(room, -5);
    expect(result.game.maxRounds).toBe(1);
  });

  it('clamps above maximum to 100', () => {
    const room = createRoom();
    const result = gameService.setMaxRounds(room, 200);
    expect(result.game.maxRounds).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// setTargetScore
// ---------------------------------------------------------------------------
describe('setTargetScore', () => {
  it('sets targetScore within valid range', () => {
    const room = createRoom();
    const result = gameService.setTargetScore(room, 30);
    expect(result.game.targetScore).toBe(30);
  });

  it('clamps below minimum to 1', () => {
    const room = createRoom();
    const result = gameService.setTargetScore(room, 0);
    expect(result.game.targetScore).toBe(1);
  });

  it('clamps above maximum to 500', () => {
    const room = createRoom();
    const result = gameService.setTargetScore(room, 1000);
    expect(result.game.targetScore).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// resetGame
// ---------------------------------------------------------------------------
describe('resetGame', () => {
  it('resets all game state to LOBBY defaults', () => {
    const room = createRoom({
      game: {
        phase: 'GAME_END',
        currentRound: 8,
        activeTeam: 'B',
        nextTeam: 'A',
        score: { A: 45, B: 52 },
        winnerTeam: 'B',
        currentWord: { id: 1, word: 'test', difficulty: 'easy', category: 'cat' },
        activeExplainerId: 'p_1',
        playerGuessedScores: { p_1: 5 },
        wordsExhausted: true,
        roundDurationSeconds: 90,
      },
    });

    const result = gameService.resetGame(room);
    expect(result.game.phase).toBe('LOBBY');
    expect(result.game.currentRound).toBe(0);
    expect(result.game.activeTeam).toBe('A');
    expect(result.game.nextTeam).toBe('A');
    expect(result.game.score).toEqual({ A: 0, B: 0 });
    expect(result.game.winnerTeam).toBeUndefined();
    expect(result.game.currentWord).toBeUndefined();
    expect(result.game.activeExplainerId).toBeUndefined();
    expect(result.game.playerGuessedScores).toEqual({});
    expect(result.game.wordsExhausted).toBe(false);
  });

  it('preserves custom roundDurationSeconds', () => {
    const room = createRoom({ game: { roundDurationSeconds: 120 } });
    const result = gameService.resetGame(room);
    expect(result.game.roundDurationSeconds).toBe(120);
    expect(result.game.remainingSeconds).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// startGame
// ---------------------------------------------------------------------------
describe('startGame', () => {
  it('transitions from LOBBY to PLAYING with round 1', () => {
    const room = createRoom();
    const result = gameService.startGame(room);
    expect(result.game.phase).toBe('PLAYING');
    expect(result.game.currentRound).toBe(1);
    expect(result.game.activeTeam).toBe('A');
    expect(result.game.nextTeam).toBe('B');
  });

  it('sets remainingSeconds to roundDurationSeconds', () => {
    const room = createRoom({ game: { roundDurationSeconds: 90, remainingSeconds: 0 } });
    const result = gameService.startGame(room);
    expect(result.game.remainingSeconds).toBe(90);
  });

  it('sets roundStartedAt timestamp', () => {
    const room = createRoom();
    const result = gameService.startGame(room);
    expect(result.game.roundStartedAt).toBeDefined();
    expect(() => new Date(result.game.roundStartedAt!)).not.toThrow();
  });

  it('throws GAME_MIN_PLAYERS when fewer than 4 connected players', () => {
    const room = createRoom({
      players: [
        createPlayer({ team: 'A' }),
        createPlayer({ team: 'A' }),
        createPlayer({ team: 'B' }),
      ],
    });
    expect(() => gameService.startGame(room)).toThrow(RoomServiceError);
    expect(() => gameService.startGame(room)).toThrow('At least 4 connected players');
  });

  it('throws GAME_MIN_PLAYERS when 4 total but only 3 connected', () => {
    const room = createRoom({
      players: [
        createPlayer({ team: 'A' }),
        createPlayer({ team: 'A' }),
        createPlayer({ team: 'B' }),
        createPlayer({ team: 'B', connected: false }),
      ],
    });
    expect(() => gameService.startGame(room)).toThrow(RoomServiceError);
  });

  it('succeeds with exactly 4 connected players', () => {
    const room = createRoom();
    expect(() => gameService.startGame(room)).not.toThrow();
  });

  it('throws INVALID_GAME_STATE when phase is not LOBBY', () => {
    const room = createRoom({ game: { phase: 'PLAYING' } });
    expect(() => gameService.startGame(room)).toThrow('Game can only start from lobby state');
  });
});

// ---------------------------------------------------------------------------
// startRound
// ---------------------------------------------------------------------------
describe('startRound', () => {
  function roomAtRoundEnd(overrides?: { game?: Partial<GameState> }) {
    const room = createRoom({
      game: {
        phase: 'ROUND_END',
        currentRound: 1,
        activeTeam: 'A',
        nextTeam: 'B',
        remainingSeconds: 0,
        ...overrides?.game,
      },
    });
    return room;
  }

  it('transitions from ROUND_END to PLAYING', () => {
    const room = roomAtRoundEnd();
    const result = gameService.startRound(room);
    expect(result.game.phase).toBe('PLAYING');
  });

  it('increments currentRound', () => {
    const room = roomAtRoundEnd();
    const result = gameService.startRound(room);
    expect(result.game.currentRound).toBe(2);
  });

  it('sets activeTeam to previous nextTeam and toggles', () => {
    const room = roomAtRoundEnd({ game: { activeTeam: 'A', nextTeam: 'B' } });
    const result = gameService.startRound(room);
    expect(result.game.activeTeam).toBe('B');
    expect(result.game.nextTeam).toBe('A');
  });

  it('resets remainingSeconds to roundDurationSeconds', () => {
    const room = roomAtRoundEnd({ game: { roundDurationSeconds: 120, remainingSeconds: 0 } });
    const result = gameService.startRound(room);
    expect(result.game.remainingSeconds).toBe(120);
  });

  it('throws INVALID_GAME_STATE when phase is LOBBY', () => {
    const room = createRoom({ game: { phase: 'LOBBY' } });
    expect(() => gameService.startRound(room)).toThrow('Round can only start after previous round ended');
  });

  it('throws INVALID_GAME_STATE when phase is PLAYING', () => {
    const room = createRoom({ game: { phase: 'PLAYING' } });
    expect(() => gameService.startRound(room)).toThrow(RoomServiceError);
  });
});

// ---------------------------------------------------------------------------
// timerTick
// ---------------------------------------------------------------------------
describe('timerTick', () => {
  it('decrements remainingSeconds by 1 during PLAYING', () => {
    const room = createRoom({ game: { phase: 'PLAYING', remainingSeconds: 30 } });
    const { room: result, roundExpired } = gameService.timerTick(room);
    expect(result.game.remainingSeconds).toBe(29);
    expect(roundExpired).toBe(false);
  });

  it('returns roundExpired true when remainingSeconds reaches 0', () => {
    const room = createRoom({ game: { phase: 'PLAYING', remainingSeconds: 1 } });
    const { room: result, roundExpired } = gameService.timerTick(room);
    expect(result.game.remainingSeconds).toBe(0);
    expect(roundExpired).toBe(true);
  });

  it('does not decrement below 0', () => {
    const room = createRoom({ game: { phase: 'PLAYING', remainingSeconds: 0 } });
    const { room: result } = gameService.timerTick(room);
    expect(result.game.remainingSeconds).toBe(0);
  });

  it('does nothing when phase is not PLAYING', () => {
    const room = createRoom({ game: { phase: 'LOBBY', remainingSeconds: 60 } });
    const { room: result, roundExpired } = gameService.timerTick(room);
    expect(result.game.remainingSeconds).toBe(60);
    expect(roundExpired).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// endRound
// ---------------------------------------------------------------------------
describe('endRound', () => {
  function playingRoom(scoreA = 0, scoreB = 0, round = 1) {
    return createRoom({
      game: {
        phase: 'PLAYING',
        currentRound: round,
        activeTeam: 'A',
        remainingSeconds: 30,
        score: { A: scoreA, B: scoreB },
        currentWord: { id: 1, word: 'test', difficulty: 'easy', category: 'cat' },
      },
    });
  }

  it('transitions from PLAYING to ROUND_END', () => {
    const room = playingRoom();
    const { room: result } = gameService.endRound(room);
    expect(result.game.phase).toBe('ROUND_END');
  });

  it('adds points to winning team score', () => {
    const room = playingRoom(10, 5);
    const { room: result } = gameService.endRound(room, 'A', 3);
    expect(result.game.score.A).toBe(13);
    expect(result.game.score.B).toBe(5);
  });

  it('sets remainingSeconds to 0 and clears currentWord', () => {
    const room = playingRoom();
    const { room: result } = gameService.endRound(room);
    expect(result.game.remainingSeconds).toBe(0);
    expect(result.game.currentWord).toBeUndefined();
  });

  it('sets roundEndedAt timestamp', () => {
    const room = playingRoom();
    const { room: result } = gameService.endRound(room);
    expect(result.game.roundEndedAt).toBeDefined();
  });

  it('ends game when team A reaches targetScore', () => {
    const room = playingRoom(48, 10);
    const { room: result, gameEnded } = gameService.endRound(room, 'A', 3);
    expect(gameEnded).toBe(true);
    expect(result.game.phase).toBe('GAME_END');
    expect(result.game.score.A).toBe(51);
  });

  it('ends game when team B reaches targetScore', () => {
    const room = playingRoom(10, 49);
    const { room: result, gameEnded } = gameService.endRound(room, 'B', 1);
    expect(gameEnded).toBe(true);
    expect(result.game.phase).toBe('GAME_END');
    expect(result.game.winnerTeam).toBe('B');
  });

  it('does NOT end game based on maxRounds alone', () => {
    const room = playingRoom(20, 15, 12);
    room.game.maxRounds = 12;
    const { room: result, gameEnded } = gameService.endRound(room);
    expect(gameEnded).toBe(false);
    expect(result.game.phase).toBe('ROUND_END');
  });

  it('does NOT end game at round 100 if scores below target', () => {
    const room = playingRoom(30, 30, 100);
    room.game.maxRounds = 12;
    const { gameEnded } = gameService.endRound(room);
    expect(gameEnded).toBe(false);
  });

  it('returns gameEnded false when both scores below target', () => {
    const room = playingRoom(10, 20);
    const { gameEnded } = gameService.endRound(room);
    expect(gameEnded).toBe(false);
  });

  it('sets nextTeam when game continues', () => {
    const room = playingRoom();
    room.game.activeTeam = 'A';
    const { room: result } = gameService.endRound(room);
    expect(result.game.nextTeam).toBe('B');
  });

  it('floors negative points to 0', () => {
    const room = playingRoom(10, 10);
    const { room: result } = gameService.endRound(room, 'A', -5);
    expect(result.game.score.A).toBe(10);
  });

  it('throws INVALID_GAME_STATE when phase is not PLAYING', () => {
    const room = createRoom({ game: { phase: 'LOBBY' } });
    expect(() => gameService.endRound(room)).toThrow(RoomServiceError);
  });
});

// ---------------------------------------------------------------------------
// endGame
// ---------------------------------------------------------------------------
describe('endGame', () => {
  it('sets phase to GAME_END', () => {
    const room = createRoom({ game: { phase: 'PLAYING' } });
    const result = gameService.endGame(room);
    expect(result.game.phase).toBe('GAME_END');
  });

  it('sets winnerTeam to A when A has higher score', () => {
    const room = createRoom({ game: { score: { A: 50, B: 30 } } });
    const result = gameService.endGame(room);
    expect(result.game.winnerTeam).toBe('A');
  });

  it('sets winnerTeam to B when B has higher score', () => {
    const room = createRoom({ game: { score: { A: 20, B: 50 } } });
    const result = gameService.endGame(room);
    expect(result.game.winnerTeam).toBe('B');
  });

  it('sets winnerTeam to DRAW when scores are equal', () => {
    const room = createRoom({ game: { score: { A: 30, B: 30 } } });
    const result = gameService.endGame(room);
    expect(result.game.winnerTeam).toBe('DRAW');
  });

  it('clears currentWord and sets remainingSeconds to 0', () => {
    const room = createRoom({
      game: {
        currentWord: { id: 1, word: 'x', difficulty: 'd', category: 'c' },
        remainingSeconds: 30,
      },
    });
    const result = gameService.endGame(room);
    expect(result.game.currentWord).toBeUndefined();
    expect(result.game.remainingSeconds).toBe(0);
  });
});
