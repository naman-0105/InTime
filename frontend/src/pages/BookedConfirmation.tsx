import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { publicService } from '../services/publicService'
import type { Booking } from '../types'
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Globe,
  User,
  Mail,
  ArrowLeft,
} from 'lucide-react'

export const BookedConfirmation = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId) return

    const loadBooking = async () => {
      try {
        setLoading(true)
        const data = await publicService.getBooking(bookingId)
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
  }, [bookingId])

  const handleCancelBooking = async () => {
    if (!bookingId) return
    try {
      setCancelling(true)
      const res = await publicService.cancelBooking(bookingId)
      setBooking(res.booking)
      setShowCancelConfirm(false)
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
      <div className="w-full max-w-lg bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs ${
              isCancelled ? 'text-red-600 bg-red-50' : 'text-emerald-600'
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
              <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
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
        </div>

        {!isCancelled && (
          <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50/50 space-y-3">
            {!showCancelConfirm ? (
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-600">
                  <span>Need to make changes?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline cursor-pointer"
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
        )}

        <div className="pt-2 text-center">
          {booking.host?.username && booking.eventType ? (
            <Link
              to={`/book/${booking.host.username}/${booking.eventType.name.toLowerCase().replace(/\s+/g, '-')}`}
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
      </div>
    </div>
  )
}
