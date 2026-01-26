import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicService } from '../services/publicService'
import { generateGoogleCalendarUrl } from '../utils/calendar'
import type { Booking, TimeSlot } from '../types'
import {
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  CalendarPlus,
  Clock,
  Globe,
  User,
  Mail,
  ArrowLeft,
  CalendarSync,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

export const BookedConfirmation = () => {
  const { token } = useParams<{ token: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [isRescheduling, setIsRescheduling] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [reschedulingSubmitting, setReschedulingSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')

  useEffect(() => {
    if (!token) return

    const loadBooking = async () => {
      try {
        setLoading(true)
        const data = await publicService.getBooking(token)
        setBooking(data.booking)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load booking details')
        }
      } finally {
        setLoading(false)
      }
    }

    loadBooking()
  }, [token])

  useEffect(() => {
    if (!isRescheduling || !booking?.host?.username || !booking?.eventType?.slug || !selectedDate) {
      setSlots([])
      setSelectedSlot(null)
      return
    }

    const loadSlots = async () => {
      try {
        setLoadingSlots(true)
        setSelectedSlot(null)
        setRescheduleError('')
        const data = await publicService.getSlots(
          booking.host!.username!,
          booking.eventType!.slug!,
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
  }, [isRescheduling, booking, selectedDate])

  const handleCancelBooking = async () => {
    if (!token) return
    try {
      setCancelling(true)
      const res = await publicService.cancelBooking(token)
      setBooking(res.booking)
      setShowCancelConfirm(false)
      setSuccessMessage('Booking cancelled successfully')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to cancel booking')
      }
    } finally {
      setCancelling(false)
    }
  }

  const handleConfirmReschedule = async () => {
    if (!token || !selectedSlot) return
    setRescheduleError('')
    setReschedulingSubmitting(true)

    try {
      const res = await publicService.rescheduleBooking(token, {
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      })
      setBooking(res.booking)
      setIsRescheduling(false)
      setSelectedSlot(null)
      setSelectedDate(null)
      setSuccessMessage('Meeting successfully rescheduled!')
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

  const formatMeetingDateTime = (startTimeIso: string, endTimeIso: string, timezone?: string) => {
    try {
      const start = new Date(startTimeIso)
      const end = new Date(endTimeIso)

      const dateStr = start.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone || 'UTC',
      })

      const startTimeStr = start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone || 'UTC',
      })

      const endTimeStr = end.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone || 'UTC',
      })

      return { dateStr, timeStr: `${startTimeStr} - ${endTimeStr}` }
    } catch {
      return { dateStr: startTimeIso, timeStr: endTimeIso }
    }
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

  const formatSlotTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 === 0 ? 12 : h % 12
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-neutral-500 text-sm font-medium">Loading booking confirmation...</div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-lg p-8 text-center shadow-xs">
          <h2 className="text-base font-semibold text-neutral-900 mb-1">Booking Not Found</h2>
          <p className="text-xs text-neutral-500 mb-6">{error || 'Unable to locate this booking.'}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 h-9 px-4 bg-neutral-900 text-white text-xs font-medium rounded-md hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Homepage</span>
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const isCancelled = booking.status === 'CANCELLED'

  const { dateStr, timeStr } = formatMeetingDateTime(
    booking.startTime,
    booking.endTime,
    booking.host?.timezone
  )

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        {!isRescheduling ? (
          <>
            <div className="text-center space-y-2">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  isCancelled ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {isCancelled ? <XCircle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {isCancelled ? 'Booking Cancelled' : 'Booking Confirmed'}
              </h1>
              <p className="text-xs text-neutral-500">
                {isCancelled
                  ? 'This scheduled meeting has been cancelled.'
                  : 'A confirmation has been recorded for your meeting.'}
              </p>
            </div>

            {successMessage && (
              <div className="border border-emerald-200 text-emerald-700 text-xs p-3 rounded-md flex items-center justify-between">
                <span>{successMessage}</span>
                <button
                  type="button"
                  onClick={() => setSuccessMessage('')}
                  className="text-emerald-600 font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="bg-neutral-50 rounded-lg border border-neutral-200 divide-y divide-neutral-200">
              <div className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400">
                    Event
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      isCancelled
                        ? 'text-red-700 border border-red-200'
                        : 'text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {booking.eventType?.name || 'Scheduled Meeting'}
                </p>
                {booking.host && (
                  <p className="text-xs text-neutral-600">with {booking.host.name}</p>
                )}
              </div>

              <div className="p-4 space-y-2.5 text-xs text-neutral-700">
                <div className="flex items-center space-x-2.5">
                  <CalendarIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span className="font-medium text-neutral-900">{dateStr}</span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>
                    {timeStr} ({booking.eventType?.durationMin || 30} mins)
                  </span>
                </div>

                {booking.host?.timezone && (
                  <div className="flex items-center space-x-2.5">
                    <Globe className="w-4 h-4 text-neutral-400 shrink-0" />
                    <span className="text-neutral-500">Time zone: {booking.host.timezone}</span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2 text-xs text-neutral-600">
                <div className="flex items-center space-x-2">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Guest: {booking.guestName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Email: {booking.guestEmail}</span>
                </div>
              </div>

              {booking.answers && booking.answers.length > 0 && (
                <div className="p-4 space-y-1.5 bg-neutral-50/80">
                  <p className="text-[11px] font-semibold text-neutral-700">Your Responses:</p>
                  {booking.answers.map((ans) => (
                    <div key={ans.id || ans.label} className="text-xs">
                      <span className="font-medium text-neutral-700">{ans.label}: </span>
                      <span className="text-neutral-600">{ans.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isCancelled && (
              <div className="space-y-3">
                <a
                  href={generateGoogleCalendarUrl({
                    title: `${booking.eventType?.name || 'Meeting'} with ${booking.host?.name || 'Host'}`,
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    description: booking.eventType?.description,
                    guestName: booking.guestName,
                    guestEmail: booking.guestEmail,
                    hostName: booking.host?.name || 'Host',
                    hostEmail: booking.host?.email,
                    location: 'InTime Meeting',
                    manageUrl: token ? `${window.location.origin}/booked/${token}` : undefined,
                    answers: booking.answers,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Add to Google Calendar</span>
                </a>

                <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50/50 space-y-3">
                  {!showCancelConfirm ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRescheduling(true)
                          setRescheduleError('')
                        }}
                        className="h-9 px-4 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
                      >
                        <CalendarSync className="w-3.5 h-3.5" />
                        <span>Reschedule Meeting</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline cursor-pointer self-center"
                      >
                        Cancel booking
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-neutral-800">
                        Are you sure you want to cancel this booking?
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={handleCancelBooking}
                          className="h-8 px-3 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                        </button>
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => setShowCancelConfirm(false)}
                          className="h-8 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Keep Booking
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 text-center">
              {booking.host?.username && booking.eventType?.slug ? (
                <Link
                  to={`/book/${booking.host.username}/${booking.eventType.slug}`}
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Schedule another meeting</span>
                </Link>
              ) : (
                <Link
                  to="/"
                  className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to home</span>
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setIsRescheduling(false)}
                className="w-8 h-8 rounded-md border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                title="Back to booking confirmation"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-semibold text-neutral-900">Reschedule Meeting</h2>
                <p className="text-xs text-neutral-500">
                  Select a new date and time for {booking.eventType?.name}.
                </p>
              </div>
            </div>

            {rescheduleError && (
              <div className="p-3.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-600 space-y-1">
              <p className="font-semibold text-neutral-800">Current Booking:</p>
              <p>
                {dateStr} at {timeStr}
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
                  {selectedDate} at {formatSlotTime(selectedSlot.time)} (
                  {booking.host?.timezone})
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsRescheduling(false)}
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
                <span>
                  {reschedulingSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
