import type {
  PublicEventResponse,
  SlotsResponse,
  BookingResponse,
  CreatedBookingResponse,
} from '../types'

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
      answers?: Array<{ questionId?: string; label?: string; value: string }>
    }
  ): Promise<CreatedBookingResponse> {
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

  async getBooking(token: string): Promise<BookingResponse> {
    const res = await fetch(`${API_BASE}/bookings/${token}`)
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to load booking confirmation')
    }
    return json
  },

  async cancelBooking(token: string): Promise<BookingResponse> {
    const res = await fetch(`${API_BASE}/bookings/${token}/cancel`, {
      method: 'POST',
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to cancel booking')
    }
    return json
  },

  async rescheduleBooking(
    token: string,
    data: {
      startTime: string
      endTime: string
    }
  ): Promise<BookingResponse> {
    const res = await fetch(`${API_BASE}/bookings/${token}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || 'Failed to reschedule booking')
    }
    return json
  },
}
