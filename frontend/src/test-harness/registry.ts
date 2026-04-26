import { lazy, type ComponentType } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const registry: Record<string, React.LazyExoticComponent<ComponentType<any>>> = {
  ExplainerScreen: lazy(() => import('../components/ExplainerScreen')),
  GuesserScreen: lazy(() => import('../components/GuesserScreen')),
  SpectatorScreen: lazy(() => import('../components/SpectatorScreen')),
  GameResultScreen: lazy(() => import('../components/GameResultScreen')),
  LobbyScreen: lazy(() => import('../components/LobbyScreen')),
  LandingScreen: lazy(() => import('./LandingScreenHarness')),
}
