import { ROUND_DURATION_SECONDS, RoomState, Team } from '../models';
import { RoomServiceError } from './room.service';

const toggleTeam = (team: Team): Team => (team === 'A' ? 'B' : 'A');

export class GameService {
  setRoundDuration(room: RoomState, durationSeconds: number): RoomState {
    const safeDuration = Math.max(10, Math.min(300, Math.floor(durationSeconds)));
    room.game.roundDurationSeconds = safeDuration;
    room.game.remainingSeconds = safeDuration;
    return room;
  }

  setMaxRounds(room: RoomState, maxRounds: number): RoomState {
    const safeMaxRounds = Math.max(1, Math.min(100, Math.floor(maxRounds)));
    room.game.maxRounds = safeMaxRounds;
    return room;
  }

  resetGame(room: RoomState): RoomState {
    room.game.phase = 'LOBBY';
    room.game.currentRound = 0;
    room.game.activeTeam = 'A';
    room.game.nextTeam = 'A';
    room.game.roundDurationSeconds = room.game.roundDurationSeconds || ROUND_DURATION_SECONDS;
    room.game.remainingSeconds = room.game.roundDurationSeconds;
    room.game.score = { A: 0, B: 0 };
    room.game.winnerTeam = undefined;
    room.game.roundStartedAt = undefined;
    room.game.roundEndedAt = undefined;
    room.game.currentWord = undefined;
    room.game.activeExplainerId = undefined;

    return room;
  }

  startGame(room: RoomState): RoomState {
    const connectedPlayers = room.players.filter((player) => player.connected).length;

    if (connectedPlayers < 4) {
      throw new RoomServiceError('GAME_MIN_PLAYERS', 'At least 4 connected players are required to start the game', 409);
    }

    if (room.game.phase !== 'LOBBY') {
      throw new RoomServiceError('INVALID_GAME_STATE', 'Game can only start from lobby state', 409);
    }

    const now = new Date().toISOString();

    room.game.phase = 'PLAYING';
    room.game.currentRound = 1;
    room.game.activeTeam = 'A';
    room.game.nextTeam = 'B';
    room.game.roundDurationSeconds = room.game.roundDurationSeconds || ROUND_DURATION_SECONDS;
    room.game.remainingSeconds = room.game.roundDurationSeconds;
    room.game.roundStartedAt = now;
    room.game.roundEndedAt = undefined;
    room.game.winnerTeam = undefined;

    return room;
  }

  startRound(room: RoomState): RoomState {
    if (room.game.phase !== 'ROUND_END') {
      throw new RoomServiceError('INVALID_GAME_STATE', 'Round can only start after previous round ended', 409);
    }

    if (room.game.currentRound >= room.game.maxRounds) {
      throw new RoomServiceError('MAX_ROUNDS_REACHED', 'No more rounds available', 409);
    }

    const now = new Date().toISOString();
    const nextRound = room.game.currentRound + 1;
    const activeTeam = room.game.nextTeam;

    room.game.phase = 'PLAYING';
    room.game.currentRound = nextRound;
    room.game.activeTeam = activeTeam;
    room.game.nextTeam = toggleTeam(activeTeam);
    room.game.roundDurationSeconds = room.game.roundDurationSeconds || ROUND_DURATION_SECONDS;
    room.game.remainingSeconds = room.game.roundDurationSeconds;
    room.game.roundStartedAt = now;
    room.game.roundEndedAt = undefined;

    return room;
  }

  timerTick(room: RoomState): { room: RoomState; roundExpired: boolean } {
    if (room.game.phase !== 'PLAYING') {
      return { room, roundExpired: false };
    }

    room.game.remainingSeconds = Math.max(0, room.game.remainingSeconds - 1);
    return { room, roundExpired: room.game.remainingSeconds === 0 };
  }

  endRound(room: RoomState, winnerTeam?: Team, points = 0): { room: RoomState; gameEnded: boolean } {
    if (room.game.phase !== 'PLAYING') {
      throw new RoomServiceError('INVALID_GAME_STATE', 'Round can only be ended in PLAYING state', 409);
    }

    const safePoints = Math.max(0, Math.floor(points));
    if (winnerTeam) {
      room.game.score[winnerTeam] += safePoints;
    }

    room.game.phase = 'ROUND_END';
    room.game.remainingSeconds = 0;
    room.game.roundEndedAt = new Date().toISOString();
    room.game.currentWord = undefined;

    const shouldEndByScore =
      room.game.score.A >= room.game.targetScore || room.game.score.B >= room.game.targetScore;
    const shouldEndByRounds = room.game.currentRound >= room.game.maxRounds;

    if (shouldEndByScore || shouldEndByRounds) {
      this.endGame(room);
      return { room, gameEnded: true };
    }

    room.game.nextTeam = toggleTeam(room.game.activeTeam);
    return { room, gameEnded: false };
  }

  endGame(room: RoomState): RoomState {
    room.game.phase = 'GAME_END';
    room.game.remainingSeconds = 0;
    room.game.roundEndedAt = new Date().toISOString();
    room.game.currentWord = undefined;

    if (room.game.score.A > room.game.score.B) {
      room.game.winnerTeam = 'A';
    } else if (room.game.score.B > room.game.score.A) {
      room.game.winnerTeam = 'B';
    } else {
      room.game.winnerTeam = 'DRAW';
    }

    return room;
  }
}
