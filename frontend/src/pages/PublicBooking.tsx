import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { publicService } from '../services/publicService'
import type { PublicHost, PublicEvent, TimeSlot } from '../types'
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  User,
  CheckCircle2,
} from 'lucide-react'

export const PublicBooking = () => {
  const { username, eventSlug } = useParams<{ username: string; eventSlug: string }>()

  const [host, setHost] = useState<PublicHost | null>(null)
  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  useEffect(() => {
    if (!username || !eventSlug) return

    const loadEvent = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await publicService.getPublicEvent(username, eventSlug)
        setHost(data.host)
        setEvent(data.event)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Event not found or is currently inactive')
        }
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [username, eventSlug])

  useEffect(() => {
    if (!username || !eventSlug || !selectedDate) {
      setSlots([])
      setSelectedSlot(null)
      return
    }

    const loadSlots = async () => {
      try {
        setLoadingSlots(true)
        setSelectedSlot(null)
        const data = await publicService.getSlots(username, eventSlug, selectedDate)
        setSlots(data.slots)
      } catch {
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [username, eventSlug, selectedDate])

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
    return d.getTime() < today.getTime()
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
        <div className="text-neutral-500 text-sm font-medium">Loading booking page...</div>
      </div>
    )
  }

  if (error || !host || !event) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-lg p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-neutral-900 mb-1">Booking Unavailable</h2>
          <p className="text-xs text-neutral-500">{error || 'This booking link is invalid or expired.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
        <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5 text-xs text-neutral-600 font-medium">
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                <User className="w-3.5 h-3.5" />
              </div>
              <span>{host.name}</span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {event.name}
              </h1>
              {event.description && (
                <p className="text-xs text-neutral-600 mt-2 leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-2 text-xs text-neutral-600 font-medium">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>{event.durationMin} minutes</span>
              </div>

              <div className="flex items-center space-x-2 text-xs text-neutral-600 font-medium">
                <Globe className="w-4 h-4 text-neutral-400" />
                <span>{host.timezone}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100">
            <div className="flex items-center space-x-2 text-[11px] text-neutral-400">
              <span className="font-semibold text-neutral-700">InTime</span>
              <span>•</span>
              <span>Scheduling simplified</span>
            </div>
          </div>
        </div>

        <div className={`${selectedDate ? 'lg:col-span-5' : 'lg:col-span-8'} p-6 sm:p-8 space-y-5 transition-all`}>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Select a Date</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Choose a date on the calendar to view available meeting slots.
            </p>
          </div>

          <div className="border border-neutral-200 rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-neutral-900">
                {monthNames[month]} {year}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  disabled={
                    currentMonth.getFullYear() === today.getFullYear() &&
                    currentMonth.getMonth() === today.getMonth()
                  }
                  className="w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                  title="Next month"
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
        </div>

        {selectedDate && (
          <div className="lg:col-span-3 p-6 sm:p-8 space-y-4 border-t lg:border-t-0 lg:border-l border-neutral-200 bg-neutral-50/50">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                Available Times
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">{selectedDate}</p>
            </div>

            {loadingSlots ? (
              <div className="py-8 text-center text-neutral-500 text-xs">Loading available slots...</div>
            ) : slots.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-neutral-500">No available slots on this date.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.time === slot.time
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full h-10 px-3 rounded-md text-xs font-medium border flex items-center justify-between transition-colors cursor-pointer ${
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
    </div>
  )
}
