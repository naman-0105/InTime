import type { PublicEventResponse, SlotsResponse, BookingResponse } from '../types'

const API_BASE = '/api/public'

export const publicService = {
  async getPublicEvent(username: string, eventSlug: string): Promise<PublicEventResponse> {
    const res = await fetch(`${API_BASE}/${username}/${eventSlug}`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load booking page')
    }
    return json
  },

  async getSlots(
    username: string,
    eventSlug: string,
    date: string
  ): Promise<SlotsResponse> {
    const res = await fetch(`${API_BASE}/${username}/${eventSlug}/slots?date=${date}`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load available slots')
    }
    return json
  },

  async createBooking(
    username: string,
    eventSlug: string,
    data: {
      guestName: string
      guestEmail: string
      startTime: string
      endTime: string
    }
  ): Promise<BookingResponse> {
    const res = await fetch(`${API_BASE}/${username}/${eventSlug}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to confirm booking')
    }
    return json
  },

  async getBooking(id: string): Promise<BookingResponse> {
    const res = await fetch(`${API_BASE}/bookings/${id}`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load booking confirmation')
    }
    return json
  },
}
