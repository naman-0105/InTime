import express from 'express'
import {
  initiateGoogleCalendarAuth,
  handleGoogleCalendarCallback,
  getGoogleCalendarStatus,
  syncGoogleCalendar,
  disconnectGoogleCalendar,
  handleGoogleCalendarWebhook,
  renewGoogleCalendarWatch,
} from '../controllers/calendarController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/google/connect', authenticate, initiateGoogleCalendarAuth)
router.get('/google/callback', handleGoogleCalendarCallback)
router.get('/google/status', authenticate, getGoogleCalendarStatus)
router.post('/google/sync', authenticate, syncGoogleCalendar)
router.post('/google/disconnect', authenticate, disconnectGoogleCalendar)
router.post('/google/watch', authenticate, renewGoogleCalendarWatch)
router.post('/google/webhook', handleGoogleCalendarWebhook)

export default router

