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

const generateUniqueUsername = async (baseName, email) => {
  let base = (baseName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)

  if (!base) {
    base = 'user'
  }

  let candidate = base
  let counter = 1

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
    })
    if (!existing) {
      return candidate
    }
    candidate = `${base}${counter}`
    counter++
  }
}

export const initiateGoogleAuth = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri =
    process.env.GOOGLE_CALLBACK_URL ||
    `${req.protocol}://${req.get('host')}/api/auth/google/callback`

  if (!clientId) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    return res.redirect(`${clientUrl}/login?error=google_config_missing`)
  }

  const scope = encodeURIComponent('openid email profile')
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`

  return res.redirect(googleAuthUrl)
}

export const handleGoogleCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  try {
    const { code, error } = req.query

    if (error || !code) {
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`)
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
      process.env.GOOGLE_CALLBACK_URL ||
      `${req.protocol}://${req.get('host')}/api/auth/google/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId || '',
        client_secret: clientSecret || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${clientUrl}/login?error=google_token_failed`)
    }

    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const profile = await userinfoRes.json()
    if (!userinfoRes.ok || !profile.email) {
      return res.redirect(`${clientUrl}/login?error=google_profile_failed`)
    }

    const googleId = profile.sub
    const email = profile.email.toLowerCase().trim()
    const name = profile.name || profile.given_name || email.split('@')[0]

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    })

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        })
      }
    } else {
      const username = await generateUniqueUsername(name, email)
      user = await prisma.user.create({
        data: {
          name: name.trim(),
          email,
          username,
          googleId,
          passwordHash: null,
          timezone: 'UTC',
        },
      })
    }

    const jwtToken = generateToken(user.id)
    sendTokenCookie(res, jwtToken)

    return res.redirect(`${clientUrl}/dashboard`)
  } catch (err) {
    return res.redirect(`${clientUrl}/login?error=google_server_error`)
  }
}

