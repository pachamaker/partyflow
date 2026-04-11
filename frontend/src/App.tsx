import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { GamePage } from './pages/GamePage'
import { HomePage } from './pages/HomePage'
import { LobbyPage } from './pages/LobbyPage'
import { ResultsPage } from './pages/ResultsPage'
import { routes } from './utils/routes'

const HarnessPage = lazy(() => import('./test-harness/HarnessPage'))

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={routes.home} element={<HomePage />} />
        <Route path={routes.lobbyWithRoomParam} element={<LobbyPage />} />
        <Route path={routes.game} element={<GamePage />} />
        <Route path={routes.results} element={<ResultsPage />} />
      </Route>
      {import.meta.env.DEV && (
        <Route
          path="/__test-harness"
          element={
            <Suspense fallback={null}>
              <HarnessPage />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<Navigate to={routes.home} replace />} />
    </Routes>
  )
}

export default App
