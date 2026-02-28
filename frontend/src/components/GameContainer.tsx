import { useCallback, useMemo } from 'react'
import ExplainerScreen from './ExplainerScreen'
import GuesserScreen from './GuesserScreen'
import SpectatorScreen from './SpectatorScreen'
import useBreakpoint from '../hooks/useBreakpoint'
import { useGameSession } from '../hooks/useGameSession'

type TeamCode = 'A' | 'B'
type RoundRole = 'explainer' | 'guesser' | 'spectator'

type GameScore = {
  A: number
  B: number
}

type GameState = {
  phase: 'LOBBY' | 'PLAYING' | 'ROUND_END' | 'GAME_END'
  currentRound: number
  activeTeam: TeamCode
  activeExplainerId?: string
  remainingSeconds: number
  currentWord?: {
    id: number
    word: string
  }
  score: GameScore
}

type SessionPlayer = {
  id: string
  name: string
  team: TeamCode
  connected: boolean
  isHost?: boolean
}

type SessionRoomState = {
  roomId: string
  players: SessionPlayer[]
  game: GameState
}

type GameSessionLike = {
  roomState: SessionRoomState | null
  currentPlayerId: string | null | undefined
  isJoining?: boolean
  explainerHint?: string | null
  roundStats?: {
    guessedWords: string[]
    skippedWords: string[]
  }
  emit: (event: string, payload?: unknown) => void
}

function getRole(
  currentPlayerId: string | null | undefined,
  me: SessionPlayer | undefined,
  game: GameState,
): RoundRole {
  if (currentPlayerId && game.activeExplainerId && currentPlayerId === game.activeExplainerId) {
    return 'explainer'
  }

  if (me && me.team === game.activeTeam) {
    return 'guesser'
  }

  return 'spectator'
}

export default function GameContainer() {
  const { isDesktop } = useBreakpoint()
  const { roomState, currentPlayerId, isJoining, roundStats, explainerHint, emit } = useGameSession() as GameSessionLike

  const safeScore = roomState?.game.score ?? { A: 0, B: 0 }
  const safeRemainingSeconds = roomState?.game.remainingSeconds ?? 0
  const gamePhase = roomState?.game.phase ?? 'LOBBY'
  const roundNumber = roomState?.game.currentRound ?? 1
  const isRoundActive = gamePhase === 'PLAYING'
  const currentWord = roomState?.game.currentWord?.word ?? ''
  const waitingWord = isRoundActive ? currentWord : 'Ожидаем начало нового раунда'

  const me = useMemo(
    () => roomState?.players.find((player) => player.id === currentPlayerId),
    [currentPlayerId, roomState?.players],
  )

  const activeExplainer = useMemo(
    () => roomState?.players.find((player) => player.id === roomState.game.activeExplainerId),
    [roomState?.game.activeExplainerId, roomState?.players],
  )

  const activeGuesser = useMemo(() => {
    if (!roomState?.game.activeTeam) {
      return undefined
    }

    return roomState.players.find(
      (player) =>
        player.team === roomState.game.activeTeam &&
        player.id !== roomState.game.activeExplainerId &&
        player.connected,
    )
  }, [roomState?.game.activeExplainerId, roomState?.game.activeTeam, roomState?.players])

  const role = useMemo<RoundRole>(() => {
    if (!roomState?.game) {
      return 'spectator'
    }

    return getRole(currentPlayerId, me, roomState.game)
  }, [currentPlayerId, me, roomState?.game])

  const playerRoleById = useMemo(() => {
    const map = new Map<string, RoundRole>()
    if (!roomState?.players) return map

    for (const player of roomState.players) {
      if (roomState.game.activeExplainerId && player.id === roomState.game.activeExplainerId) {
        map.set(player.id, 'explainer')
      } else if (player.team === roomState.game.activeTeam) {
        map.set(player.id, 'guesser')
      } else {
        map.set(player.id, 'spectator')
      }
    }

    return map
  }, [roomState?.game.activeExplainerId, roomState?.game.activeTeam, roomState?.players])

  const teamAPlayers = useMemo(
    () =>
      (roomState?.players ?? [])
        .filter((player) => player.team === 'A')
        .map((player) => ({
          ...player,
          role: playerRoleById.get(player.id) ?? 'spectator',
        })),
    [playerRoleById, roomState?.players],
  )

  const teamBPlayers = useMemo(
    () =>
      (roomState?.players ?? [])
        .filter((player) => player.team === 'B')
        .map((player) => ({
          ...player,
          role: playerRoleById.get(player.id) ?? 'spectator',
        })),
    [playerRoleById, roomState?.players],
  )

  const handleSwipeUp = useCallback(() => {
    if (!roomState?.roomId || role !== 'explainer' || roomState.game.phase !== 'PLAYING') {
      return
    }

    navigator.vibrate?.(50)

    const payload = { roomId: roomState.roomId, action: 'guessed' as const }
    emit('WORD_SWIPED', payload)

    // Backward-compatible transport for current backend contract.
    emit('word_swiped', { roomId: roomState.roomId, direction: 'up' as const })
  }, [emit, role, roomState])

  const handleSwipeDown = useCallback(() => {
    if (!roomState?.roomId || role !== 'explainer' || roomState.game.phase !== 'PLAYING') {
      return
    }

    navigator.vibrate?.([30, 50, 30])

    const payload = { roomId: roomState.roomId, action: 'skipped' as const }
    emit('WORD_SWIPED', payload)

    // Backward-compatible transport for current backend contract.
    emit('word_swiped', { roomId: roomState.roomId, direction: 'down' as const })
  }, [emit, role, roomState])

  const handleStartRound = useCallback(() => {
    if (!roomState?.roomId) {
      return
    }

    const canStart = role === 'explainer'
    if (!canStart) {
      return
    }

    emit('start_round', { roomId: roomState.roomId })
  }, [emit, role, roomState?.roomId])

  if (!roomState || isJoining) {
    return (
        <SpectatorScreen
          teamAScore={safeScore.A}
          teamBScore={safeScore.B}
          timeRemaining={safeRemainingSeconds}
        word={currentWord || 'Ожидание синхронизации...'}
        explainerName={activeExplainer?.name ?? '—'}
        guesserName={activeGuesser?.name ?? '—'}
        spectatorTeam={me?.team ?? 'A'}
      />
    )
  }

  if (isDesktop) {
    if (!isRoundActive) {
      return (
        <SpectatorScreen
          teamAScore={safeScore.A}
          teamBScore={safeScore.B}
          timeRemaining={safeRemainingSeconds}
          word={waitingWord}
          explainerName={activeExplainer?.name ?? '—'}
          guesserName={activeGuesser?.name ?? '—'}
          spectatorTeam={me?.team ?? 'A'}
          roundNumber={roundNumber}
          activeTeam={roomState.game.activeTeam}
          isRoundActive={isRoundActive}
          canStartRound={role === 'explainer'}
          onStartRound={handleStartRound}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          roundStats={roundStats}
        />
      )
    }

    if (role === 'explainer') {
      return (
        <ExplainerScreen
          teamAScore={safeScore.A}
          teamBScore={safeScore.B}
          timeRemaining={safeRemainingSeconds}
          word={currentWord}
          isRoundActive={isRoundActive}
          canStartRound={!isRoundActive && role === 'explainer'}
          onStartRound={handleStartRound}
          roundNumber={roundNumber}
          activeTeam={roomState.game.activeTeam}
          myName={me?.name ?? '—'}
          myTeam={me?.team ?? roomState.game.activeTeam}
          myRole={role}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          hint={explainerHint ?? undefined}
          onGuessed={handleSwipeUp}
          onSkipped={handleSwipeDown}
        />
      )
    }

    if (role === 'guesser') {
      return (
        <GuesserScreen
          teamAScore={safeScore.A}
          teamBScore={safeScore.B}
          timeRemaining={safeRemainingSeconds}
          explainerName={activeExplainer?.name ?? '—'}
          isRoundActive={isRoundActive}
          roundNumber={roundNumber}
          activeTeam={roomState.game.activeTeam}
          myName={me?.name ?? '—'}
          myTeam={me?.team ?? roomState.game.activeTeam}
          myRole={role}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
        />
      )
    }

    return (
      <SpectatorScreen
        teamAScore={safeScore.A}
        teamBScore={safeScore.B}
        timeRemaining={safeRemainingSeconds}
        word={waitingWord}
        explainerName={activeExplainer?.name ?? '—'}
        guesserName={activeGuesser?.name ?? '—'}
        spectatorTeam={me?.team ?? 'A'}
          roundNumber={roundNumber}
          activeTeam={roomState.game.activeTeam}
          isRoundActive={isRoundActive}
        canStartRound={false}
        onStartRound={handleStartRound}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        roundStats={roundStats}
      />
    )
  }

  if (!isRoundActive) {
    return (
      <SpectatorScreen
        teamAScore={safeScore.A}
        teamBScore={safeScore.B}
        timeRemaining={safeRemainingSeconds}
        word={waitingWord}
        explainerName={activeExplainer?.name ?? '—'}
        guesserName={activeGuesser?.name ?? '—'}
        spectatorTeam={me?.team ?? 'A'}
        roundNumber={roundNumber}
        activeTeam={roomState.game.activeTeam}
        isRoundActive={isRoundActive}
        canStartRound={role === 'explainer'}
        onStartRound={handleStartRound}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        roundStats={roundStats}
      />
    )
  }

  if (role === 'explainer') {
    return (
        <ExplainerScreen
        teamAScore={safeScore.A}
        teamBScore={safeScore.B}
        timeRemaining={safeRemainingSeconds}
        word={currentWord}
        isRoundActive={isRoundActive}
        canStartRound={!isRoundActive && role === 'explainer'}
        onStartRound={handleStartRound}
        roundNumber={roundNumber}
        activeTeam={roomState.game.activeTeam}
        myName={me?.name ?? '—'}
        myTeam={me?.team ?? roomState.game.activeTeam}
        myRole={role}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        hint={explainerHint ?? undefined}
        onGuessed={handleSwipeUp}
        onSkipped={handleSwipeDown}
      />
    )
  }

  if (role === 'guesser') {
    return (
      <GuesserScreen
        teamAScore={safeScore.A}
        teamBScore={safeScore.B}
        timeRemaining={safeRemainingSeconds}
        explainerName={activeExplainer?.name ?? '—'}
        isRoundActive={isRoundActive}
        roundNumber={roundNumber}
        activeTeam={roomState.game.activeTeam}
        myName={me?.name ?? '—'}
        myTeam={me?.team ?? roomState.game.activeTeam}
        myRole={role}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
      />
    )
  }

  return (
    <SpectatorScreen
      teamAScore={safeScore.A}
      teamBScore={safeScore.B}
      timeRemaining={safeRemainingSeconds}
      word={waitingWord}
      explainerName={activeExplainer?.name ?? '—'}
      guesserName={activeGuesser?.name ?? '—'}
      spectatorTeam={me?.team ?? 'A'}
      roundNumber={roundNumber}
      activeTeam={roomState.game.activeTeam}
      isRoundActive={isRoundActive}
      canStartRound={false}
      onStartRound={handleStartRound}
      teamAPlayers={teamAPlayers}
      teamBPlayers={teamBPlayers}
      roundStats={roundStats}
    />
  )
}
