import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { bookingService } from '../services/bookingService'
import { eventService } from '../services/eventService'
import type { Booking, EventType } from '../types'
import {
  Calendar,
  Clock,
  LayoutGrid,
  User,
  Mail,
  Globe,
  AtSign,
  ArrowRight,
  UserCheck,
} from 'lucide-react'

export const Dashboard = () => {
  const { user } = useAuth()

  const [bookingTab, setBookingTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<EventType[]>([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadDashboardData = async () => {
    try {
      setLoadingBookings(true)
      const [fetchedBookings, fetchedEvents] = await Promise.all([
        bookingService.getBookings({ type: bookingTab }),
        eventService.getEvents(),
      ])
      setBookings(fetchedBookings)
      setEvents(fetchedEvents)
    } catch {
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [bookingTab])

  const handleCancelBooking = async (bookingId: string) => {
    try {
      setCancellingId(bookingId)
      setActionError(null)
      setActionSuccess(null)
      const res = await bookingService.cancelBooking(bookingId)
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? res.booking : b))
      )
      setConfirmingCancelId(null)
      setActionSuccess('Booking cancelled successfully')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message)
      } else {
        setActionError('Failed to cancel booking')
      }
    } finally {
      setCancellingId(null)
    }
  }

  if (!user) {
    return null
  }

  const formatBookingDateTime = (startIso: string, endIso: string, timezone?: string) => {
    try {
      const start = new Date(startIso)
      const end = new Date(endIso)

      const dateFormatted = start.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone || 'UTC',
      })

      const startTimeFormatted = start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone || 'UTC',
      })

      const endTimeFormatted = end.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone || 'UTC',
      })

      return {
        dateStr: dateFormatted,
        timeStr: `${startTimeFormatted} - ${endTimeFormatted}`,
      }
    } catch {
      return { dateStr: startIso, timeStr: endIso }
    }
  }

  const upcomingCount = bookings.filter((b) => b.status === 'CONFIRMED').length

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
              Welcome back, {user.name}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Overview of your scheduled meetings, event types, and availability.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 font-medium">Upcoming Meetings</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{upcomingCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <Link
            to="/events"
            className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-lg p-5 shadow-xs flex items-center justify-between transition-colors group"
          >
            <div>
              <p className="text-xs text-neutral-500 font-medium">Active Event Types</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                {events.filter((e) => e.isActive).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center text-neutral-700 transition-colors">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </Link>

          <Link
            to="/availability"
            className="bg-white border border-neutral-200 hover:border-neutral-300 rounded-lg p-5 shadow-xs flex items-center justify-between transition-colors group"
          >
            <div>
              <p className="text-xs text-neutral-500 font-medium">Time Zone</p>
              <p className="text-sm font-semibold text-neutral-900 mt-2 truncate max-w-[170px]">
                {user.timezone}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center text-neutral-700 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </Link>
        </div>

        <div className="space-y-4">
          {actionError && (
            <div className="border border-red-200 text-red-700 text-xs p-3 rounded-md flex items-center justify-between">
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="border border-emerald-200 text-emerald-700 text-xs p-3 rounded-md flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                className="text-emerald-500 hover:text-emerald-700 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setBookingTab('upcoming')}
                className={`text-xs font-semibold pb-2 border-b-2 -mb-2 transition-colors cursor-pointer ${
                  bookingTab === 'upcoming'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Upcoming Bookings
              </button>
              <button
                onClick={() => setBookingTab('past')}
                className={`text-xs font-semibold pb-2 border-b-2 -mb-2 transition-colors cursor-pointer ${
                  bookingTab === 'past'
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Past Bookings
              </button>
            </div>

            {events.length > 0 && (
              <a
                href={`/book/${user.username}/${events[0]?.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
              >
                <span>View Public Booking Link</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {loadingBookings ? (
            <div className="py-12 text-center text-neutral-500 text-xs">Loading bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-10 text-center shadow-xs">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-semibold text-neutral-900 mb-1">
                No {bookingTab} bookings
              </h3>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                {bookingTab === 'upcoming'
                  ? 'When guests schedule meetings via your booking links, they will appear here.'
                  : 'Past meetings you have hosted will be listed here.'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg divide-y divide-neutral-100 shadow-xs">
              {bookings.map((b) => {
                const { dateStr, timeStr } = formatBookingDateTime(
                  b.startTime,
                  b.endTime,
                  user.timezone
                )
                return (
                  <div
                    key={b.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-neutral-900">
                          {b.eventType?.name || 'Scheduled Meeting'}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            b.status === 'CONFIRMED'
                              ? 'text-emerald-700 border border-emerald-200'
                              : 'text-red-700 border border-red-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-neutral-600">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{dateStr}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{timeStr}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-neutral-500 pt-1">
                        <div className="flex items-center space-x-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{b.guestName}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{b.guestEmail}</span>
                        </div>
                      </div>

                      {b.answers && b.answers.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-neutral-100 space-y-1 bg-neutral-50/80 p-2.5 rounded">
                          <p className="text-[11px] font-semibold text-neutral-700">Guest Responses:</p>
                          {b.answers.map((ans) => (
                            <div key={ans.id || ans.label} className="text-xs">
                              <span className="font-medium text-neutral-700">{ans.label}: </span>
                              <span className="text-neutral-600">{ans.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {b.status === 'CONFIRMED' && (
                      <div className="flex items-center sm:self-center shrink-0">
                        {confirmingCancelId === b.id ? (
                          <div className="flex items-center space-x-2 bg-neutral-100 p-1.5 rounded-md">
                            <span className="text-[11px] font-medium text-neutral-700 mr-1">
                              Cancel?
                            </span>
                            <button
                              type="button"
                              disabled={cancellingId === b.id}
                              onClick={() => handleCancelBooking(b.id)}
                              className="px-2 py-1 text-[11px] font-medium text-red-600 rounded transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {cancellingId === b.id ? 'Cancelling...' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              disabled={cancellingId === b.id}
                              onClick={() => setConfirmingCancelId(null)}
                              className="px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 rounded transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null)
                              setActionSuccess(null)
                              setConfirmingCancelId(b.id)
                            }}
                            className="text-xs font-medium text-neutral-600 hover:text-red-700 border border-neutral-200 hover:border-red-200 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                          >
                            Cancel Meeting
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
    </AppLayout>
  )
}
