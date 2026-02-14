import { motion } from 'framer-motion'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { routes } from '../utils/routes'

const navItems = [
  { to: routes.home, label: 'Главная' },
  { to: routes.game, label: 'Игра' },
  { to: routes.results, label: 'Результаты игры' },
]

export function AppShell() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-slate-900 to-secondary text-white">
      <header className="border-b border-white/10 bg-secondary/80 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-3">
          {navItems.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? 'bg-primary text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
