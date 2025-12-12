import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes.js'
import eventRoutes from './routes/eventRoutes.js'
import availabilityRoutes from './routes/availabilityRoutes.js'
import publicRoutes from './routes/publicRoutes.js'
import bookingRoutes from './routes/bookingRoutes.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'InTime API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/availability', availabilityRoutes)
app.use('/api/public', publicRoutes)
app.use('/api/bookings', bookingRoutes)

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  res.status(statusCode).json({ error: message })
})

export default app




