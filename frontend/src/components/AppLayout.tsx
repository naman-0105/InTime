import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Calendar, Clock, LogOut, LayoutGrid } from 'lucide-react'
import type { ReactNode } from 'react'

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) {
    return null
  }

  const navItems = [
    { label: 'Event Types', path: '/events', icon: LayoutGrid },
    { label: 'Availability', path: '/availability', icon: Clock },
    { label: 'Dashboard', path: '/dashboard', icon: Calendar },
  ]

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex flex-col">
      <header className="bg-white border-b border-neutral-200 w-full sticky top-0 z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link to="/events" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-md bg-neutral-900 flex items-center justify-center text-white">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="font-semibold text-base tracking-tight text-neutral-900">InTime</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/events' && location.pathname.startsWith('/events'))
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-neutral-800">{user.name}</span>
              <span className="text-[11px] text-neutral-500">@{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 px-2.5 sm:px-3 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
