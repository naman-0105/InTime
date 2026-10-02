import jwt from 'jsonwebtoken'

const isProduction = process.env.NODE_ENV === 'production'

const getCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  domain: isProduction
    ? (process.env.COOKIE_DOMAIN || '.namangoyal.dev')
    : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
})

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'intime_secret_key', {
    expiresIn: '7d',
  })
}

export const sendTokenCookie = (res, token) => {
  res.cookie('token', token, getCookieOptions())
}

export const clearTokenCookie = (res) => {
  const options = getCookieOptions()
  delete options.maxAge
  res.cookie('token', '', {
    ...options,
    expires: new Date(0),
  })
}
