import type { PublicEventResponse, SlotsResponse } from '../types'

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
}
