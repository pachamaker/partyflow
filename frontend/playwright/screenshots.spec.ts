import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEAM_A_PLAYERS = [
  { id: 'a1', name: 'Паша', connected: true, role: 'explainer' as const },
  { id: 'a2', name: 'Дима', connected: true, role: 'guesser' as const },
];

const TEAM_B_PLAYERS = [
  { id: 'b1', name: 'Саша', connected: true, role: 'guesser' as const },
  { id: 'b2', name: 'Катя', connected: true, role: 'spectator' as const },
];

function harnessUrl(component: string, props: Record<string, unknown>): string {
  return `/__test-harness?component=${component}&props=${encodeURIComponent(JSON.stringify(props))}`;
}

async function renderAndScreenshot(page: Page, component: string, props: Record<string, unknown>, name: string) {
  await page.goto(harnessUrl(component, props));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; animation-duration: 0s !important; transition: none !important; transition-duration: 0s !important; }',
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot(`${name}.png`);
}

// ---------------------------------------------------------------------------
// ExplainerScreen
// ---------------------------------------------------------------------------

test.describe('ExplainerScreen', () => {
  test('active round with word', async ({ page }) => {
    await renderAndScreenshot(page, 'ExplainerScreen', {
      word: 'КОШКА',
      hint: 'Домашнее животное',
      isRoundActive: true,
      timeRemaining: 45,
      teamAScore: 3,
      teamBScore: 2,
      roundNumber: 2,
      activeTeam: 'A',
      myName: 'Паша',
      myTeam: 'A',
      myRole: 'explainer',
      teamAPlayers: TEAM_A_PLAYERS,
      teamBPlayers: TEAM_B_PLAYERS,
    }, 'explainer-active-round');
  });

  test('can start round', async ({ page }) => {
    await renderAndScreenshot(page, 'ExplainerScreen', {
      canStartRound: true,
      isRoundActive: false,
      timeRemaining: 60,
      roundNumber: 3,
      teamAScore: 5,
      teamBScore: 4,
      activeTeam: 'A',
      teamAPlayers: TEAM_A_PLAYERS,
      teamBPlayers: TEAM_B_PLAYERS,
    }, 'explainer-can-start');
  });

  test('urgent timer', async ({ page }) => {
    await renderAndScreenshot(page, 'ExplainerScreen', {
      word: 'СЛОН',
      isRoundActive: true,
      timeRemaining: 5,
      teamAScore: 7,
      teamBScore: 8,
      roundNumber: 4,
      activeTeam: 'B',
      myName: 'Саша',
      myTeam: 'B',
      myRole: 'explainer',
    }, 'explainer-urgent-timer');
  });

  test('no hint', async ({ page }) => {
    await renderAndScreenshot(page, 'ExplainerScreen', {
      word: 'ДЕРЕВО',
      isRoundActive: true,
      timeRemaining: 30,
      teamAScore: 1,
      teamBScore: 0,
      roundNumber: 1,
      activeTeam: 'A',
    }, 'explainer-no-hint');
  });
});

// ---------------------------------------------------------------------------
// GuesserScreen
// ---------------------------------------------------------------------------

test.describe('GuesserScreen', () => {
  test('active round', async ({ page }) => {
    await renderAndScreenshot(page, 'GuesserScreen', {
      explainerName: 'Алекс',
      isRoundActive: true,
      timeRemaining: 40,
      teamAScore: 2,
      teamBScore: 1,
      roundNumber: 1,
      activeTeam: 'A',
      myName: 'Дима',
      myTeam: 'A',
      myRole: 'guesser',
      teamAPlayers: TEAM_A_PLAYERS,
      teamBPlayers: TEAM_B_PLAYERS,
    }, 'guesser-active');
  });

  test('waiting for round', async ({ page }) => {
    await renderAndScreenshot(page, 'GuesserScreen', {
      explainerName: 'Алекс',
      isRoundActive: false,
      timeRemaining: 60,
      teamAScore: 5,
      teamBScore: 3,
      roundNumber: 2,
      activeTeam: 'A',
    }, 'guesser-waiting');
  });
});

// ---------------------------------------------------------------------------
// SpectatorScreen
// ---------------------------------------------------------------------------

test.describe('SpectatorScreen', () => {
  test('active round observing', async ({ page }) => {
    await renderAndScreenshot(page, 'SpectatorScreen', {
      word: 'КОШКА',
      explainerName: 'Паша',
      guesserName: 'Дима',
      spectatorTeam: 'B',
      activeTeam: 'A',
      isRoundActive: true,
      timeRemaining: 35,
      teamAScore: 4,
      teamBScore: 3,
      roundNumber: 2,
      teamAPlayers: TEAM_A_PLAYERS,
      teamBPlayers: TEAM_B_PLAYERS,
    }, 'spectator-active');
  });

  test('round ended with stats', async ({ page }) => {
    await renderAndScreenshot(page, 'SpectatorScreen', {
      word: '',
      explainerName: 'Паша',
      guesserName: 'Дима',
      spectatorTeam: 'A',
      activeTeam: 'A',
      isRoundActive: false,
      canStartRound: false,
      timeRemaining: 0,
      teamAScore: 8,
      teamBScore: 6,
      roundNumber: 3,
      teamAPlayers: TEAM_A_PLAYERS,
      teamBPlayers: TEAM_B_PLAYERS,
      roundStats: {
        guessedWords: ['Кошка', 'Собака', 'Дерево'],
        skippedWords: ['Квантовая физика'],
      },
    }, 'spectator-round-ended');
  });

  test('can start round', async ({ page }) => {
    await renderAndScreenshot(page, 'SpectatorScreen', {
      explainerName: 'Паша',
      guesserName: 'Дима',
      spectatorTeam: 'A',
      activeTeam: 'A',
      isRoundActive: false,
      canStartRound: true,
      timeRemaining: 60,
      teamAScore: 2,
      teamBScore: 1,
      roundNumber: 2,
      teamAPlayers: TEAM_A_PLAYERS,
      teamBPlayers: TEAM_B_PLAYERS,
    }, 'spectator-can-start');
  });
});

// ---------------------------------------------------------------------------
// GameResultScreen
// ---------------------------------------------------------------------------

test.describe('GameResultScreen', () => {
  const teamA = {
    label: 'Команда А',
    score: 52,
    players: [
      { id: 'a1', name: 'Паша', guessed: 18, isHost: true },
      { id: 'a2', name: 'Дима', guessed: 12, isHost: false },
    ],
  };
  const teamB = {
    label: 'Команда Б',
    score: 47,
    players: [
      { id: 'b1', name: 'Саша', guessed: 15, isHost: false },
      { id: 'b2', name: 'Катя', guessed: 10, isHost: false },
    ],
  };

  test('team A wins', async ({ page }) => {
    await renderAndScreenshot(page, 'GameResultScreen', {
      winnerTeam: 'A',
      teamA,
      teamB,
      canPlayAgain: true,
    }, 'result-team-a-wins');
  });

  test('team B wins', async ({ page }) => {
    await renderAndScreenshot(page, 'GameResultScreen', {
      winnerTeam: 'B',
      teamA: { ...teamA, score: 40 },
      teamB: { ...teamB, score: 52 },
      canPlayAgain: false,
    }, 'result-team-b-wins');
  });
});

// ---------------------------------------------------------------------------
// LobbyScreen
// ---------------------------------------------------------------------------

test.describe('LobbyScreen', () => {
  const lobbyTeamA = [
    { name: 'Паша', isHost: true },
    { name: 'Дима', isHost: false },
  ];
  const lobbyTeamB = [
    { name: 'Саша', isHost: false },
    { name: 'Катя', isHost: false },
  ];

  test('host view', async ({ page }) => {
    await renderAndScreenshot(page, 'LobbyScreen', {
      roomCode: 'ABC123',
      isHost: true,
      teamA: lobbyTeamA,
      teamB: lobbyTeamB,
      maxPlayers: 8,
    }, 'lobby-host');
  });

  test('guest view', async ({ page }) => {
    await renderAndScreenshot(page, 'LobbyScreen', {
      roomCode: 'ABC123',
      isHost: false,
      teamA: lobbyTeamA,
      teamB: lobbyTeamB,
      maxPlayers: 8,
    }, 'lobby-guest');
  });
});
