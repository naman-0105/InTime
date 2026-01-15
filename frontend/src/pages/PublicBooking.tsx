import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react'

export const PublicBooking = () => {
  const { username, eventSlug } = useParams<{ username: string; eventSlug: string }>()
  const navigate = useNavigate()

  const [host, setHost] = useState<PublicHost | null>(null)
  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  const [step, setStep] = useState<'select' | 'form'>('select')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')

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
      setStep('select')
      return
    }

    const loadSlots = async () => {
      try {
        setLoadingSlots(true)
        setSelectedSlot(null)
        setStep('select')
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
    if (d.getTime() < today.getTime()) {
      return true
    }
    const maxDays = event?.maxNoticeDays ?? 60
    const maxDate = new Date(today.getTime() + maxDays * 24 * 60 * 60 * 1000)
    maxDate.setHours(23, 59, 59, 999)
    return d.getTime() > maxDate.getTime()
  }

  const isNextMonthDisabled = () => {
    const maxDays = event?.maxNoticeDays ?? 60
    const maxDate = new Date(today.getTime() + maxDays * 24 * 60 * 60 * 1000)
    maxDate.setHours(23, 59, 59, 999)
    const nextMonthFirstDay = new Date(year, month + 1, 1)
    return nextMonthFirstDay.getTime() > maxDate.getTime()
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

  const handleSlotClick = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setBookingError('')
  }

  const handleProceedToForm = () => {
    if (selectedSlot) {
      setStep('form')
    }
  }

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username || !eventSlug || !selectedSlot) return

    setBookingError('')

    if (event?.customQuestions && event.customQuestions.length > 0) {
      for (const q of event.customQuestions) {
        const key = q.id || q.label
        const ans = (customAnswers[key] || '').trim()
        if (q.required && !ans) {
          setBookingError(`Please answer the required question: "${q.label}"`)
          return
        }
      }
    }

    const formattedAnswers = (event?.customQuestions || []).map((q) => ({
      questionId: q.id,
      label: q.label,
      value: (customAnswers[q.id || q.label] || '').trim(),
    }))

    setBookingSubmitting(true)

    try {
      const res = await publicService.createBooking(username, eventSlug, {
        guestName,
        guestEmail,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        answers: formattedAnswers,
      })

      navigate(`/booked/${res.booking.token}`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setBookingError(err.message)
      } else {
        setBookingError('Failed to confirm booking')
      }
    } finally {
      setBookingSubmitting(false)
    }
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

              {selectedDate && selectedSlot && (
                <div className="flex items-center space-x-2 text-xs text-neutral-900 font-semibold pt-2">
                  <CalendarIcon className="w-4 h-4 text-neutral-700" />
                  <span>
                    {selectedDate} at {formatSlotTime(selectedSlot.time)}
                  </span>
                </div>
              )}
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

        {step === 'select' ? (
          <>
            <div
              className={`${
                selectedDate ? 'lg:col-span-5' : 'lg:col-span-8'
              } p-6 sm:p-8 space-y-5 transition-all`}
            >
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
                      disabled={isNextMonthDisabled()}
                      className="w-7 h-7 rounded border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
              <div className="lg:col-span-3 p-6 sm:p-8 space-y-4 border-t lg:border-t-0 lg:border-l border-neutral-200 bg-neutral-50/50 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
                      Available Times
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{selectedDate}</p>
                  </div>

                  {loadingSlots ? (
                    <div className="py-8 text-center text-neutral-500 text-xs">
                      Loading available slots...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-neutral-500">No available slots on this date.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.time === slot.time
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => handleSlotClick(slot)}
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

                {selectedSlot && (
                  <div className="pt-4 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={handleProceedToForm}
                      className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Next: Enter Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="lg:col-span-8 p-6 sm:p-8 space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="w-8 h-8 rounded-md border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors cursor-pointer"
                title="Back to slot selection"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Enter Your Details</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Provide your information to confirm the booking.
                </p>
              </div>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3 h-10 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Your Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full pl-9 pr-3 h-10 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Confirmation will be sent to this email address.
                </p>
              </div>

              {event.customQuestions && event.customQuestions.length > 0 && (
                <div className="space-y-4 pt-3 border-t border-neutral-100">
                  {event.customQuestions.map((q) => {
                    const key = q.id || q.label
                    return (
                      <div key={key}>
                        <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                          {q.label} {q.required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          required={q.required}
                          value={customAnswers[key] || ''}
                          onChange={(e) =>
                            setCustomAnswers((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder="Your answer..."
                          className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                        />
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="pt-4 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="h-10 px-4 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="flex-1 h-10 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <span>{bookingSubmitting ? 'Confirming Booking...' : 'Confirm Booking'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
