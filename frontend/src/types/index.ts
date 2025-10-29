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
