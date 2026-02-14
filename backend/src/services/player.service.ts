import { randomBytes } from 'node:crypto';
import { redisClient } from '../config/redis';
import { Player, ReconnectSession, SocketPlayerMapping, Team } from '../models';

const SOCKET_PLAYER_KEY_PREFIX = 'socket_player:';
const PLAYER_SESSION_KEY_PREFIX = 'player_session:';
const RECONNECT_TTL_SECONDS = 5 * 60;

const socketPlayerKey = (socketId: string): string => `${SOCKET_PLAYER_KEY_PREFIX}${socketId}`;
const playerSessionKey = (roomId: string, playerId: string): string =>
  `${PLAYER_SESSION_KEY_PREFIX}${roomId}:${playerId}`;

export class PlayerService {
  generatePlayerId(): string {
    return `p_${randomBytes(8).toString('hex')}`;
  }

  assignTeam(players: Player[]): Team {
    const teamACount = players.filter((player) => player.team === 'A').length;
    const teamBCount = players.filter((player) => player.team === 'B').length;

    if (teamACount < teamBCount) {
      return 'A';
    }

    if (teamBCount < teamACount) {
      return 'B';
    }

    return Math.random() < 0.5 ? 'A' : 'B';
  }

  balanceTeams(players: Player[]): { players: Player[]; changed: boolean } {
    const next = [...players];

    const count = () => ({
      a: next.filter((player) => player.team === 'A').length,
      b: next.filter((player) => player.team === 'B').length
    });

    let changed = false;
    let { a, b } = count();

    while (Math.abs(a - b) > 1) {
      const fromTeam: Team = a > b ? 'A' : 'B';
      const toTeam: Team = fromTeam === 'A' ? 'B' : 'A';

      const candidates = next
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => player.team === fromTeam)
        .sort((left, right) => right.player.joinedAt.localeCompare(left.player.joinedAt));

      const target = candidates[0];
      if (!target) {
        break;
      }

      next[target.index] = {
        ...target.player,
        team: toTeam
      };

      changed = true;
      ({ a, b } = count());
    }

    return { players: next, changed };
  }

  async setSocketPlayerMapping(socketId: string, mapping: SocketPlayerMapping): Promise<void> {
    await redisClient.set(socketPlayerKey(socketId), JSON.stringify(mapping), 'EX', RECONNECT_TTL_SECONDS);
  }

  async getSocketPlayerMapping(socketId: string): Promise<SocketPlayerMapping | null> {
    const raw = await redisClient.get(socketPlayerKey(socketId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as SocketPlayerMapping;
  }

  async clearSocketPlayerMapping(socketId: string): Promise<void> {
    await redisClient.del(socketPlayerKey(socketId));
  }

  async upsertReconnectSession(session: ReconnectSession): Promise<void> {
    await redisClient.set(
      playerSessionKey(session.roomId, session.playerId),
      JSON.stringify(session),
      'EX',
      RECONNECT_TTL_SECONDS
    );
  }

  async getReconnectSession(roomId: string, playerId: string): Promise<ReconnectSession | null> {
    const raw = await redisClient.get(playerSessionKey(roomId, playerId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as ReconnectSession;
  }

  async clearReconnectSession(roomId: string, playerId: string): Promise<void> {
    await redisClient.del(playerSessionKey(roomId, playerId));
  }
}
