import bcrypt from 'bcryptjs'
import prisma from '../db/prisma.js'
import { generateToken, sendTokenCookie, clearTokenCookie } from '../utils/token.js'
import { isValidEmail, isValidPassword } from '../utils/validation.js'

export const register = async (req, res, next) => {
  try {
    const { name, email, username, password, timezone } = req.body

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: 'Name, email, username, and password are required' })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character',
      })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedUsername = username.toLowerCase().trim()

    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered' })
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    })

    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken' })
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        timezone: timezone || 'UTC',
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const token = generateToken(user.id)
    sendTokenCookie(res, token)

    return res.status(201).json({ user })
  } catch (error) {
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' })
    }

    const identifier = emailOrUsername.toLowerCase().trim()

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    })

    if (!user || !user.passwordHash) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' })
    }

    const token = generateToken(user.id)
    sendTokenCookie(res, token)

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        timezone: user.timezone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const logout = (req, res) => {
  clearTokenCookie(res)
  return res.status(200).json({ message: 'Logged out successfully' })
}

export const getMe = (req, res) => {
  return res.status(200).json({ user: req.user })
}
