import type { Booking, BookingsResponse, BookingResponse } from '../types'

const API_BASE = '/api/bookings'

export const bookingService = {
  async getBookings(params?: { type?: 'upcoming' | 'past'; status?: string }): Promise<Booking[]> {
    const query = new URLSearchParams()
    if (params?.type) query.append('type', params.type)
    if (params?.status) query.append('status', params.status)

    const url = query.toString() ? `${API_BASE}?${query.toString()}` : API_BASE

    const res = await fetch(url, {
      credentials: 'include',
    })
    const json: BookingsResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to fetch bookings')
    }
    return json.bookings
  },

  async getBookingById(id: string): Promise<Booking> {
    const res = await fetch(`${API_BASE}/${id}`, {
      credentials: 'include',
    })
    const json: BookingResponse = await res.json()
    if (!res.ok) {
      throw new Error((json as unknown as { error: string }).error || 'Failed to fetch booking')
    }
    return json.booking
  },
}
