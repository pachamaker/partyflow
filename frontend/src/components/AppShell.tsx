import { motion } from 'framer-motion'
import { Link, Outlet, useLocation } from 'react-router-dom'
import useBreakpoint from '../hooks/useBreakpoint'
import { routes } from '../utils/routes'

const navItems = [
  { to: routes.home, label: 'Главная' },
  { to: routes.game, label: 'Игра' },
  { to: routes.results, label: 'Результаты игры' },
]

export function AppShell() {
  const location = useLocation()
  const { isDesktop } = useBreakpoint()

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-slate-900 to-secondary text-white">
      <main className={isDesktop ? '' : 'mx-auto max-w-5xl p-4'}>
        <motion.div
          key={location.pathname}
          initial={isDesktop ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={isDesktop ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
