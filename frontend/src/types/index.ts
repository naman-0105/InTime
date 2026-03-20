export interface User {
  id: string
  name: string
  email: string
  username: string
  timezone: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
}

export interface BookingQuestion {
  id?: string
  label: string
  required: boolean
  order: number
}

export interface BookingAnswer {
  id?: string
  questionId?: string | null
  label: string
  value: string
}

export interface EventType {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  durationMin: number
  location?: string | null
  isActive: boolean
  minNoticeMin: number
  maxNoticeDays: number
  bufferBeforeMin: number
  bufferAfterMin: number
  createdAt: string
  updatedAt: string
  customQuestions?: BookingQuestion[]
}

export interface EventResponse {
  event: EventType
}

export interface EventsResponse {
  events: EventType[]
}

export interface AvailabilityRule {
  id: string
  userId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  createdAt: string
}

export interface AvailabilityResponse {
  rules: AvailabilityRule[]
}

export interface AvailabilityOverride {
  id: string
  userId: string
  date: string
  isAvailable: boolean
  startTime: string | null
  endTime: string | null
  createdAt: string
}

export interface OverridesResponse {
  overrides: AvailabilityOverride[]
}

export interface OverrideResponse {
  override: AvailabilityOverride
}

export interface PublicHost {
  name: string
  username: string
  timezone: string
}

export interface PublicEvent {
  id: string
  name: string
  slug: string
  description: string | null
  durationMin: number
  location?: string | null
  maxNoticeDays?: number
  customQuestions?: BookingQuestion[]
}

export interface PublicEventResponse {
  host: PublicHost
  event: PublicEvent
}

export interface TimeSlot {
  time: string
  startTime: string
  endTime: string
}

export interface SlotsResponse {
  date: string
  timezone: string
  slots: TimeSlot[]
}

export interface Booking {
  id: string
  eventTypeId: string
  hostId: string
  guestName: string
  guestEmail: string
  startTime: string
  endTime: string
  status: 'CONFIRMED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  eventType?: {
    id?: string
    name: string
    slug?: string
    durationMin: number
    description?: string | null
    location?: string | null
  }
  host?: {
    name: string
    email: string
    username?: string
    timezone: string
  }
  answers?: BookingAnswer[]
}

export interface BookingResponse {
  booking: Booking
}

export interface CreatedBookingResponse {
  booking: Booking & { token: string }
}

export interface BookingsResponse {
  bookings: Booking[]
}

export interface CalendarStatusResponse {
  connected: boolean
  calendarId: string | null
  lastSyncedAt: string | null
  watchExpiration: string | null
  busySlotsCount?: number
}
