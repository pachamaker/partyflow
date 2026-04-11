import { beforeEach, describe, expect, it } from 'vitest';
import { Player } from '../../models';
import { PlayerService } from '../player.service';
import { createPlayer, resetPlayerCounter } from './helpers';

const playerService = new PlayerService();

beforeEach(() => {
  resetPlayerCounter();
});

// ---------------------------------------------------------------------------
// assignTeam
// ---------------------------------------------------------------------------
describe('assignTeam', () => {
  it('assigns to team A when A has fewer connected players', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
      createPlayer({ team: 'B' }),
    ];
    expect(playerService.assignTeam(players)).toBe('A');
  });

  it('assigns to team B when B has fewer connected players', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
    ];
    expect(playerService.assignTeam(players)).toBe('B');
  });

  it('returns A or B when teams are equal', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
    ];
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(playerService.assignTeam(players));
    }
    expect(results.has('A')).toBe(true);
    expect(results.has('B')).toBe(true);
  });

  it('ignores disconnected players when counting', () => {
    const players: Player[] = [
      createPlayer({ team: 'A', connected: false }),
      createPlayer({ team: 'A', connected: false }),
      createPlayer({ team: 'B' }),
    ];
    // Connected: A=0, B=1 → should assign to A
    expect(playerService.assignTeam(players)).toBe('A');
  });

  it('assigns correctly with empty player list', () => {
    const result = playerService.assignTeam([]);
    expect(['A', 'B']).toContain(result);
  });

  it('counts only connected players for decision', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A', connected: false }),
      createPlayer({ team: 'B' }),
    ];
    // Connected: A=2, B=1 → assign to B
    expect(playerService.assignTeam(players)).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// balanceTeams
// ---------------------------------------------------------------------------
describe('balanceTeams', () => {
  it('returns changed false when teams are already balanced', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
      createPlayer({ team: 'B' }),
    ];
    const { changed } = playerService.balanceTeams(players);
    expect(changed).toBe(false);
  });

  it('returns changed false when connected difference is exactly 1', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
    ];
    const { changed } = playerService.balanceTeams(players);
    expect(changed).toBe(false);
  });

  it('moves player from larger team when connected diff > 1', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
    ];
    const { players: result, changed } = playerService.balanceTeams(players);
    expect(changed).toBe(true);
    const aCount = result.filter((p) => p.connected && p.team === 'A').length;
    const bCount = result.filter((p) => p.connected && p.team === 'B').length;
    expect(Math.abs(aCount - bCount)).toBeLessThanOrEqual(1);
  });

  it('moves most recently joined connected player', () => {
    const p1 = createPlayer({ team: 'A' }); // earliest
    const p2 = createPlayer({ team: 'A' });
    const p3 = createPlayer({ team: 'A' }); // latest — should be moved
    const p4 = createPlayer({ team: 'B' });
    const { players: result } = playerService.balanceTeams([p1, p2, p3, p4]);
    const moved = result.find((p) => p.id === p3.id);
    expect(moved?.team).toBe('B');
  });

  it('counts only connected players for balance', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A', connected: false }), // disconnected, not counted
      createPlayer({ team: 'B' }),
    ];
    // Connected: A=2, B=1, diff=1 → no rebalance needed
    const { changed } = playerService.balanceTeams(players);
    expect(changed).toBe(false);
  });

  it('does not move disconnected players', () => {
    const disconnected = createPlayer({ team: 'A', connected: false });
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      disconnected,
      createPlayer({ team: 'B' }),
    ];
    // Connected: A=3, B=1, diff=2 → should move, but NOT the disconnected one
    const { players: result } = playerService.balanceTeams(players);
    const movedDisconnected = result.find((p) => p.id === disconnected.id);
    expect(movedDisconnected?.team).toBe('A'); // stayed on original team
  });

  it('handles all players on one team', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
    ];
    const { players: result, changed } = playerService.balanceTeams(players);
    expect(changed).toBe(true);
    const aCount = result.filter((p) => p.team === 'A').length;
    const bCount = result.filter((p) => p.team === 'B').length;
    expect(Math.abs(aCount - bCount)).toBeLessThanOrEqual(1);
  });

  it('handles empty array', () => {
    const { players: result, changed } = playerService.balanceTeams([]);
    expect(changed).toBe(false);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// shuffleTeams
// ---------------------------------------------------------------------------
describe('shuffleTeams', () => {
  it('assigns ceil(n/2) to team A and floor(n/2) to team B', () => {
    const players: Player[] = [
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'A' }),
      createPlayer({ team: 'B' }),
      createPlayer({ team: 'B' }),
      createPlayer({ team: 'A' }),
    ];
    const result = playerService.shuffleTeams(players);
    const aCount = result.filter((p) => p.team === 'A').length;
    const bCount = result.filter((p) => p.team === 'B').length;
    expect(aCount).toBe(3); // ceil(5/2)
    expect(bCount).toBe(2); // floor(5/2)
  });

  it('preserves player data except team', () => {
    const players: Player[] = [
      createPlayer({ team: 'A', name: 'Alice' }),
      createPlayer({ team: 'B', name: 'Bob' }),
    ];
    const result = playerService.shuffleTeams(players);
    const names = result.map((p) => p.name).sort();
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('handles single player', () => {
    const players: Player[] = [createPlayer({ team: 'B' })];
    const result = playerService.shuffleTeams(players);
    expect(result).toHaveLength(1);
    expect(result[0].team).toBe('A'); // ceil(1/2) = 1 on A
  });

  it('handles empty array', () => {
    const result = playerService.shuffleTeams([]);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generatePlayerId
// ---------------------------------------------------------------------------
describe('generatePlayerId', () => {
  it('returns string starting with p_', () => {
    const id = playerService.generatePlayerId();
    expect(id).toMatch(/^p_[a-f0-9]{16}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 20 }, () => playerService.generatePlayerId()));
    expect(ids.size).toBe(20);
  });
});
