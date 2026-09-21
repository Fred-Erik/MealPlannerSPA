import { Link, NavLink, Outlet } from 'react-router'
import { LoaderPinwheel, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthProvider'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/week', label: 'Week' },
  { to: '/recepten', label: 'Recepten' },
  { to: '/categorieen', label: 'Categorieën' },
  { to: '/archief', label: 'Archief' },
  { to: '/instellingen', label: 'Instellingen' },
]

export function AppLayout() {
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/week" className="flex items-center gap-2 font-heading text-lg font-semibold">
            <LoaderPinwheel className="size-4" />
            Receptroulette
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                    isActive && 'bg-accent text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Uitloggen">
              <LogOut className="size-4" />
            </Button>
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
        {menuOpen && (
          <nav className="flex flex-col border-t px-4 py-2 sm:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    isActive && 'bg-accent text-accent-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Button
              variant="ghost"
              className="justify-start px-3"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 size-4" /> Uitloggen
            </Button>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
