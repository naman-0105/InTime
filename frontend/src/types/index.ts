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

export interface EventType {
  id: string
  userId: string
  name: string
  slug: string
  description: string | null
  durationMin: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EventResponse {
  event: EventType
}

export interface EventsResponse {
  events: EventType[]
}
