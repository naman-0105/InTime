import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AppLayout } from '../components/AppLayout'
import { bookingService } from '../services/bookingService'
import { publicService } from '../services/publicService'
import { eventService } from '../services/eventService'
import { calendarService } from '../services/calendarService'
import { generateGoogleCalendarUrl } from '../utils/calendar'
import type { Booking, EventType, TimeSlot, CalendarStatusResponse } from '../types'
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
  CalendarSync,
  CalendarPlus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react'

export const Dashboard = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [bookingTab, setBookingTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [events, setEvents] = useState<EventType[]>([])
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatusResponse | null>(null)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [reschedulingSubmitting, setReschedulingSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

  const loadDashboardData = async () => {
    try {
      setLoadingBookings(true)
      const [fetchedBookings, fetchedEvents, fetchedCalStatus] = await Promise.all([
        bookingService.getBookings({ type: bookingTab }),
        eventService.getEvents(),
        calendarService.getStatus().catch(() => null),
      ])
      setBookings(fetchedBookings)
      setEvents(fetchedEvents)
      setCalendarStatus(fetchedCalStatus)
    } catch {
      setBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [bookingTab])

  useEffect(() => {
    const calParam = searchParams.get('calendar')
    const errorParam = searchParams.get('error')

    if (calParam === 'connected') {
      setActionSuccess('Google Calendar connected and initial sync completed successfully!')
      searchParams.delete('calendar')
      setSearchParams(searchParams, { replace: true })
      calendarService.getStatus().then(setCalendarStatus).catch(() => {})
    } else if (errorParam) {
      setActionError(`Google Calendar connection error: ${errorParam}`)
      searchParams.delete('error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSyncCalendar = async () => {
    try {
      setSyncingCalendar(true)
      setActionError(null)
      setActionSuccess(null)
      await calendarService.sync()
      const status = await calendarService.getStatus()
      setCalendarStatus(status)
      setActionSuccess('Google Calendar synchronized successfully')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message)
      } else {
        setActionError('Failed to sync Google Calendar')
      }
    } finally {
      setSyncingCalendar(false)
    }
  }

  const handleDisconnectCalendar = async () => {
    try {
      setDisconnectingCalendar(true)
      setActionError(null)
      setActionSuccess(null)
      await calendarService.disconnect()
      setCalendarStatus({
        connected: false,
        calendarId: null,
        lastSyncedAt: null,
        watchExpiration: null,
        busySlotsCount: 0,
      })
      setActionSuccess('Google Calendar disconnected successfully')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message)
      } else {
        setActionError('Failed to disconnect Google Calendar')
      }
    } finally {
      setDisconnectingCalendar(false)
    }
  }

  useEffect(() => {
    if (!reschedulingBooking || !user?.username || !reschedulingBooking.eventType?.slug || !selectedDate) {
      setSlots([])
      setSelectedSlot(null)
      return
    }

    const loadSlots = async () => {
      try {
        setLoadingSlots(true)
        setSelectedSlot(null)
        setRescheduleError(null)
        const data = await publicService.getSlots(
          user.username,
          reschedulingBooking.eventType!.slug!,
          selectedDate
        )
        setSlots(data.slots)
      } catch {
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [reschedulingBooking, user, selectedDate])

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

  const handleOpenReschedule = (booking: Booking) => {
    setReschedulingBooking(booking)
    setSelectedDate(null)
    setSelectedSlot(null)
    setSlots([])
    setRescheduleError(null)
    setCurrentMonth(new Date())
    setActionError(null)
    setActionSuccess(null)
  }

  const handleCloseReschedule = () => {
    setReschedulingBooking(null)
    setSelectedDate(null)
    setSelectedSlot(null)
    setSlots([])
    setRescheduleError(null)
  }

  const handleConfirmReschedule = async () => {
    if (!reschedulingBooking || !selectedSlot) return
    setRescheduleError(null)
    setReschedulingSubmitting(true)

    try {
      const res = await bookingService.rescheduleBooking(reschedulingBooking.id, {
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      })
      setBookings((prev) =>
        prev.map((b) => (b.id === reschedulingBooking.id ? res.booking : b))
      )
      setActionSuccess(`Meeting with ${reschedulingBooking.guestName} rescheduled successfully`)
      handleCloseReschedule()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRescheduleError(err.message)
      } else {
        setRescheduleError('Failed to reschedule booking')
      }
    } finally {
      setReschedulingSubmitting(false)
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

  const formatSlotTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`
  }

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    const today = new Date()
    if (
      currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() === today.getMonth()
    ) {
      return
    }
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isDateDisabled = (dayNumber: number) => {
    const d = new Date(year, month, dayNumber)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() < today.getTime()) {
      return true
    }
    return false
  }

  const formatDateKey = (dayNumber: number) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(dayNumber).padStart(2, '0')
    return `${year}-${mm}-${dd}`
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

        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0 mt-0.5">
                <CalendarSync className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-sm font-semibold text-neutral-900">Google Calendar Availability Sync</h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      calendarStatus?.connected
                        ? 'text-emerald-700 border border-emerald-200 bg-emerald-50'
                        : 'text-neutral-600 border border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    {calendarStatus?.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {calendarStatus?.connected
                    ? `Synced with ${calendarStatus.calendarId || 'primary'} calendar (${calendarStatus.busySlotsCount} busy slot${calendarStatus.busySlotsCount === 1 ? '' : 's'} cached)`
                    : 'Connect your Google Calendar to automatically block conflicting busy slots from InTime booking.'}
                </p>
                {calendarStatus?.connected && calendarStatus.lastSyncedAt && (
                  <p className="text-[11px] text-neutral-400">
                    Last synced: {new Date(calendarStatus.lastSyncedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 sm:self-center">
              {calendarStatus?.connected ? (
                <>
                  <button
                    type="button"
                    disabled={syncingCalendar}
                    onClick={handleSyncCalendar}
                    className="h-8 px-3 rounded-md border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700 text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingCalendar ? 'animate-spin' : ''}`} />
                    <span>{syncingCalendar ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={disconnectingCalendar}
                    onClick={handleDisconnectCalendar}
                    className="h-8 px-3 rounded-md border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {disconnectingCalendar ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              ) : (
                <a
                  href="/api/calendar/google/connect"
                  className="h-8 px-3.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Connect Google Calendar</span>
                </a>
              )}
            </div>
          </div>
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
                      <div className="flex items-center space-x-2 sm:self-center shrink-0">
                        <a
                          href={generateGoogleCalendarUrl({
                            title: `${b.eventType?.name || 'Meeting'} with ${b.guestName}`,
                            startTime: b.startTime,
                            endTime: b.endTime,
                            description: b.eventType?.description,
                            guestName: b.guestName,
                            guestEmail: b.guestEmail,
                            hostName: user.name,
                            hostEmail: user.email,
                            location: 'InTime Meeting',
                            answers: b.answers,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-400 bg-white px-2.5 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          title="Add to Google Calendar"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="hidden sm:inline">Add to Calendar</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenReschedule(b)}
                          className="text-xs font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-400 bg-white px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <CalendarSync className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Reschedule</span>
                        </button>

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
                            Cancel
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

      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-neutral-900 flex items-center space-x-2">
                  <CalendarSync className="w-4 h-4 text-neutral-700" />
                  <span>Reschedule Meeting</span>
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {reschedulingBooking.guestName} — {reschedulingBooking.eventType?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseReschedule}
                className="w-7 h-7 rounded-md border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-600 space-y-1">
              <p className="font-semibold text-neutral-800">Current Scheduled Time:</p>
              <p>
                {formatBookingDateTime(
                  reschedulingBooking.startTime,
                  reschedulingBooking.endTime,
                  user.timezone
                ).dateStr}{' '}
                at{' '}
                {formatBookingDateTime(
                  reschedulingBooking.startTime,
                  reschedulingBooking.endTime,
                  user.timezone
                ).timeStr}{' '}
                ({user.timezone})
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-neutral-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-neutral-900">
                    {monthNames[month]} {year}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={prevMonth}
                      disabled={
                        currentMonth.getFullYear() === today.getFullYear() &&
                        currentMonth.getMonth() === today.getMonth()
                      }
                      className="w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {dayHeaders.map((dh) => (
                    <div key={dh} className="text-[11px] font-medium text-neutral-400 py-1">
                      {dh}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1
                    const dateKey = formatDateKey(dayNum)
                    const disabled = isDateDisabled(dayNum)
                    const isSelected = selectedDate === dateKey

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedDate(dateKey)}
                        className={`h-9 rounded-md text-xs font-medium flex items-center justify-center transition-colors cursor-pointer ${
                          disabled
                            ? 'text-neutral-300 cursor-not-allowed'
                            : isSelected
                            ? 'bg-neutral-900 text-white font-semibold'
                            : 'text-neutral-800 hover:bg-neutral-100'
                        }`}
                      >
                        {dayNum}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedDate && (
                <div className="border border-neutral-200 rounded-lg p-4 bg-white space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                    Available Times for {selectedDate}
                  </h3>

                  {loadingSlots ? (
                    <div className="py-6 text-center text-neutral-500 text-xs">
                      Loading available slots...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-6 text-center text-neutral-500 text-xs">
                      No available slots on this date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.time === slot.time
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`h-9 px-2 rounded-md text-xs font-medium border flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs'
                                : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-900 hover:bg-neutral-50'
                            }`}
                          >
                            <span>{formatSlotTime(slot.time)}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedSlot && (
              <div className="p-3.5 border border-emerald-200 rounded-md text-xs text-emerald-900 space-y-1">
                <p className="font-semibold">New Selected Slot:</p>
                <p>
                  {selectedDate} at {formatSlotTime(selectedSlot.time)} ({user.timezone})
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCloseReschedule}
                className="h-10 px-4 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedSlot || reschedulingSubmitting}
                onClick={handleConfirmReschedule}
                className="flex-1 h-10 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>{reschedulingSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

