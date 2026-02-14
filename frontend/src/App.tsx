import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { LobbyPage } from './pages/LobbyPage'
import { ResultsPage } from './pages/ResultsPage'
import { routes } from './utils/routes'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={routes.home} element={<HomePage />} />
        <Route path={routes.lobby} element={<LobbyPage />} />
        <Route path={routes.game} element={<GamePage />} />
        <Route path={routes.results} element={<ResultsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={routes.home} replace />} />
    </Routes>
  )
}

export default App
