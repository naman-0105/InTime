import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Calendar, User, LogOut, Mail, Globe, AtSign } from 'lucide-react'

export const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 flex flex-col">
      <header className="bg-white border-b border-neutral-200 w-full sticky top-0 z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-neutral-900 flex items-center justify-center text-white">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-neutral-900">InTime</span>
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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
                Welcome back, {user.name}
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Manage your profile, availability, and booking links.
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-neutral-900">Account Details</h2>
              <p className="text-xs text-neutral-500">Your personal profile and scheduling configuration</p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 shadow-xs">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Full Name</p>
                    <p className="text-sm font-medium text-neutral-900">{user.name}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <AtSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Username</p>
                    <p className="text-sm font-medium text-neutral-900">@{user.username}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Email Address</p>
                    <p className="text-sm font-medium text-neutral-900">{user.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Timezone</p>
                    <p className="text-sm font-medium text-neutral-900">{user.timezone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
