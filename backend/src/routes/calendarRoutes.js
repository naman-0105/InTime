import express from 'express'
import {
  initiateGoogleCalendarAuth,
  handleGoogleCalendarCallback,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
} from '../controllers/calendarController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/google/connect', authenticate, initiateGoogleCalendarAuth)
router.get('/google/callback', handleGoogleCalendarCallback)
router.get('/google/status', authenticate, getGoogleCalendarStatus)
router.post('/google/disconnect', authenticate, disconnectGoogleCalendar)

export default router
