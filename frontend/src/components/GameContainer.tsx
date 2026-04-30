import { useCallback, useEffect, useMemo, useRef } from 'react'
import ExplainerScreen from './ExplainerScreen'
import GuesserScreen from './GuesserScreen'
import SpectatorScreen from './SpectatorScreen'
import useBreakpoint from '../hooks/useBreakpoint'
import { useGameSession } from '../hooks/useGameSession'
import { useDevSession } from '../contexts/DevSessionContext'
import DevPlayerSwitcher from './dev/DevPlayerSwitcher'

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
  isHost: boolean
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
  emit: (event: string, payload?: unknown, ack?: (response: unknown) => void) => void
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

  const { viewAsPlayerId, getBotSocket, getBotHint, bots, setViewAsPlayerId } = useDevSession()

  const effectivePlayerId = viewAsPlayerId ?? currentPlayerId

  const effectiveEmit = (event: string, payload?: unknown, ack?: (response: unknown) => void) => {
    if (viewAsPlayerId) {
      const botSocket = getBotSocket(viewAsPlayerId)
      if (botSocket) {
        if (ack) {
          botSocket.emit(event, payload, ack)
        } else {
          botSocket.emit(event, payload)
        }
        return
      }
    }
    emit(event, payload, ack)
  }

  const effectiveExplainerHint = viewAsPlayerId ? getBotHint(viewAsPlayerId) : explainerHint

  // Keep a stable ref to the current bot ID set to avoid stale closures in effects below.
  const botIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    botIdsRef.current = new Set(bots.map((b) => b.playerId))
  }, [bots])

  // Auto-switch perspective: bot turn → view as bot; human turn → return to self.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const activeId = roomState?.game.activeExplainerId
    if (!activeId) return
    setViewAsPlayerId(botIdsRef.current.has(activeId) ? activeId : null)
  }, [roomState?.game.activeExplainerId, setViewAsPlayerId])

  // Auto-start round when the next explainer is a bot.
  const autoStartedRoundRef = useRef<number>(0)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (roomState?.game.phase !== 'ROUND_END') return
    if (!viewAsPlayerId || !botIdsRef.current.has(viewAsPlayerId)) return
    if (viewAsPlayerId !== roomState.game.activeExplainerId) return
    const round = roomState.game.currentRound ?? 0
    if (autoStartedRoundRef.current === round) return
    const botSocket = getBotSocket(viewAsPlayerId)
    if (!botSocket) return
    autoStartedRoundRef.current = round
    botSocket.emit('start_round', { roomId: roomState.roomId })
  }, [roomState?.game.phase, viewAsPlayerId, roomState?.game.activeExplainerId, roomState?.game.currentRound, roomState?.roomId, getBotSocket])

  const safeScore = roomState?.game.score ?? { A: 0, B: 0 }
  const safeRemainingSeconds = roomState?.game.remainingSeconds ?? 0
  const gamePhase = roomState?.game.phase ?? 'LOBBY'
  const roundNumber = roomState?.game.currentRound ?? 1
  const isRoundActive = gamePhase === 'PLAYING'
  const currentWord = roomState?.game.currentWord?.word ?? ''
  const waitingWord = isRoundActive ? currentWord : 'Ожидаем начало нового раунда'

  const me = useMemo(
    () => roomState?.players.find((player) => player.id === effectivePlayerId),
    [effectivePlayerId, roomState?.players],
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

    return getRole(effectivePlayerId, me, roomState.game)
  }, [effectivePlayerId, me, roomState?.game])

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
    effectiveEmit('WORD_SWIPED', payload)

    // Backward-compatible transport for current backend contract.
    effectiveEmit('word_swiped', { roomId: roomState.roomId, direction: 'up' as const })
  }, [effectiveEmit, role, roomState])

  const handleSwipeDown = useCallback(() => {
    if (!roomState?.roomId || role !== 'explainer' || roomState.game.phase !== 'PLAYING') {
      return
    }

    navigator.vibrate?.([30, 50, 30])

    const payload = { roomId: roomState.roomId, action: 'skipped' as const }
    effectiveEmit('WORD_SWIPED', payload)

    // Backward-compatible transport for current backend contract.
    effectiveEmit('word_swiped', { roomId: roomState.roomId, direction: 'down' as const })
  }, [effectiveEmit, role, roomState])

  const handleStartRound = useCallback(() => {
    if (!roomState?.roomId) {
      return
    }

    const canStart = role === 'explainer'
    if (!canStart) {
      return
    }

    effectiveEmit('start_round', { roomId: roomState.roomId })
  }, [effectiveEmit, role, roomState?.roomId])

  const renderScreen = () => {
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
            hint={effectiveExplainerHint ?? undefined}
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
          hint={effectiveExplainerHint ?? undefined}
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

  return (
    <>
      {renderScreen()}
      {import.meta.env.DEV && roomState?.players && (
        <DevPlayerSwitcher
          players={roomState.players}
          realPlayerId={currentPlayerId}
          activeExplainerId={roomState.game?.activeExplainerId}
          activeTeam={roomState.game?.activeTeam}
        />
      )}
    </>
  )
}
