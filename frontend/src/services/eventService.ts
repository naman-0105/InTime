import type { EventType, EventsResponse, EventResponse, BookingQuestion } from '../types'

const API_BASE = '/api/events'

export const eventService = {
  async getEvents(): Promise<EventType[]> {
    const res = await fetch(API_BASE, {
      credentials: 'include',
    })
    const json: EventsResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to fetch event types')
    }
    return json.events
  },

  async getEventById(id: string): Promise<EventType> {
    const res = await fetch(`${API_BASE}/${id}`, {
      credentials: 'include',
    })
    const json: EventResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to fetch event type')
    }
    return json.event
  },

  async createEvent(data: {
    name: string
    slug?: string
    description?: string
    durationMin: number
    isActive?: boolean
    minNoticeMin?: number
    maxNoticeDays?: number
    bufferBeforeMin?: number
    bufferAfterMin?: number
    customQuestions?: BookingQuestion[]
  }): Promise<EventType> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const json: EventResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to create event type')
    }
    return json.event
  },

  async updateEvent(
    id: string,
    data: {
      name?: string
      slug?: string
      description?: string
      durationMin?: number
      isActive?: boolean
      minNoticeMin?: number
      maxNoticeDays?: number
      bufferBeforeMin?: number
      bufferAfterMin?: number
      customQuestions?: BookingQuestion[]
    }
  ): Promise<EventType> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    const json: EventResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to update event type')
    }
    return json.event
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to delete event type')
    }
  },
}
