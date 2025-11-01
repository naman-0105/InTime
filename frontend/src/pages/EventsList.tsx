import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { eventService } from '../services/eventService'
import type { EventType } from '../types'
import { Plus, Clock, Copy, Check, Edit2, Trash2, ExternalLink } from 'lucide-react'

export const EventsList = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await eventService.getEvents()
      setEvents(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load event types')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleCopyLink = (slug: string) => {
    if (!user) return
    const url = `${window.location.origin}/book/${user.username}/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return
    }
    try {
      await eventService.deleteEvent(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message)
      } else {
        alert('Failed to delete event')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            Event Types
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Create and manage different meeting durations and types.
          </p>
        </div>
        <Link
          to="/events/new"
          className="inline-flex items-center justify-center space-x-2 h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Event Type</span>
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-neutral-500 text-sm">Loading event types...</div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 mx-auto mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">No event types yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto mb-6">
            Create your first event type so guests can start booking meetings with you.
          </p>
          <Link
            to="/events/new"
            className="inline-flex items-center space-x-2 h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event Type</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm text-neutral-900">{event.name}</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                      event.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    {event.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-neutral-500 mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{event.durationMin} mins</span>
                </div>

                {event.description && (
                  <p className="text-xs text-neutral-600 line-clamp-2 mb-4">
                    {event.description}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between mt-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCopyLink(event.slug)}
                    title="Copy booking link"
                    className="h-8 px-2 rounded border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    {copiedSlug === event.slug ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 text-[11px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copy link</span>
                      </>
                    )}
                  </button>

                  {user && (
                    <a
                      href={`/book/${user.username}/${event.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Preview public booking page"
                      className="w-8 h-8 rounded border border-neutral-200 hover:bg-neutral-50 text-neutral-700 flex items-center justify-center transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <Link
                    to={`/events/${event.id}/edit`}
                    className="w-8 h-8 rounded border border-neutral-200 hover:bg-neutral-50 text-neutral-700 flex items-center justify-center transition-colors"
                    title="Edit event"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(event.id, event.name)}
                    className="w-8 h-8 rounded border border-neutral-200 hover:bg-red-50 text-neutral-600 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
