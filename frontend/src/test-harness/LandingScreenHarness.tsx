import LandingScreen from '../components/LandingScreen'

// Harness wrapper — accepts only data props, provides noop callbacks
// Props from URL: playerName, roundTime, scoreToWin, isCreating, errorMessage
export default function LandingScreenHarness(props: {
  playerName?: string
  roundTime?: number
  scoreToWin?: number
  isCreating?: boolean
  errorMessage?: string | null
}) {
  return (
    <LandingScreen
      playerName={props.playerName ?? ''}
      roundTime={props.roundTime ?? 60}
      scoreToWin={props.scoreToWin ?? 50}
      isCreating={props.isCreating}
      errorMessage={props.errorMessage}
      onPlayerNameChange={() => {}}
      onRoundTimeChange={() => {}}
      onScoreToWinChange={() => {}}
      onCreateGame={() => {}}
      onJoinGame={() => {}}
    />
  )
}
