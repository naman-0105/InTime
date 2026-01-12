import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { eventService } from '../services/eventService'
import { ArrowLeft, Clock, Trash2, ShieldAlert, Calendar, Hourglass } from 'lucide-react'

export const EventEdit = () => {
  const { id } = useParams<{ id: string }>()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [durationMin, setDurationMin] = useState(30)
  const [isActive, setIsActive] = useState(true)
  const [minNoticeMin, setMinNoticeMin] = useState(0)
  const [maxNoticeDays, setMaxNoticeDays] = useState(60)
  const [bufferBeforeMin, setBufferBeforeMin] = useState(0)
  const [bufferAfterMin, setBufferAfterMin] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return
    const fetchEvent = async () => {
      try {
        setLoading(true)
        const event = await eventService.getEventById(id)
        setName(event.name)
        setSlug(event.slug)
        setDescription(event.description || '')
        setDurationMin(event.durationMin)
        setIsActive(event.isActive)
        setMinNoticeMin(event.minNoticeMin ?? 0)
        setMaxNoticeDays(event.maxNoticeDays ?? 60)
        setBufferBeforeMin(event.bufferBeforeMin ?? 0)
        setBufferAfterMin(event.bufferAfterMin ?? 0)
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError('Failed to load event')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  const durationOptions = [15, 30, 45, 60]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError('')
    setIsSubmitting(true)

    try {
      await eventService.updateEvent(id, {
        name,
        slug,
        description: description || undefined,
        durationMin,
        isActive,
        minNoticeMin,
        maxNoticeDays,
        bufferBeforeMin,
        bufferAfterMin,
      })
      navigate('/events')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update event type')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm('Are you sure you want to delete this event type?')) {
      return
    }

    try {
      await eventService.deleteEvent(id)
      navigate('/events')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to delete event')
      }
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-neutral-500 text-sm">Loading event details...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <Link
            to="/events"
            className="w-8 h-8 rounded-md border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Edit Event Type
            </h1>
            <p className="text-xs text-neutral-500">Update your event settings and booking parameters.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="h-8 px-2.5 rounded-md border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-xs">
        {error && (
          <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Event Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                URL Slug
              </label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 text-neutral-500 text-xs">
                  /book/username/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-r-md text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Duration
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {durationOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDurationMin(opt)}
                    className={`h-9 px-3.5 rounded-md text-xs font-medium border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      durationMin === opt
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{opt} min</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-neutral-500">Custom minutes:</span>
                <input
                  type="number"
                  min="5"
                  max="720"
                  value={durationMin}
                  onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 15)}
                  className="w-24 px-2.5 h-8 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of what this meeting is about..."
                className="w-full p-3 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center space-x-2">
                <Hourglass className="w-4 h-4 text-neutral-700" />
                <span>Scheduling Controls</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Configure booking notice requirements and buffer times around meetings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Minimum Notice</span>
                </label>
                <select
                  value={minNoticeMin}
                  onChange={(e) => setMinNoticeMin(parseInt(e.target.value, 10))}
                  className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors cursor-pointer"
                >
                  <option value={0}>Immediately (0 min)</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={240}>4 hours before</option>
                  <option value={1440}>24 hours before (1 day)</option>
                  <option value={2880}>48 hours before (2 days)</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Prevents last-minute bookings without advance notice.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Booking Window (Days into future)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={maxNoticeDays}
                  onChange={(e) => setMaxNoticeDays(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Maximum number of days ahead guests can book.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Buffer Before Meeting
                </label>
                <select
                  value={bufferBeforeMin}
                  onChange={(e) => setBufferBeforeMin(parseInt(e.target.value, 10))}
                  className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors cursor-pointer"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Reserved prep time before meeting begins.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Buffer After Meeting
                </label>
                <select
                  value={bufferAfterMin}
                  onChange={(e) => setBufferAfterMin(parseInt(e.target.value, 10))}
                  className="w-full px-3 h-10 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors cursor-pointer"
                >
                  <option value={0}>No buffer</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Reserved cool-down or notes time after meeting ends.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-neutral-700 cursor-pointer">
              Active (allow guests to book this event)
            </label>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end space-x-3">
            <Link
              to="/events"
              className="h-9 px-4 rounded-md border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center justify-center transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
