import express from 'express'
import {
  getPublicEvent,
  getPublicEventSlots,
  createBooking,
  getBookingByToken,
  cancelBookingByToken,
} from '../controllers/publicController.js'

const router = express.Router()

router.get('/bookings/:token', getBookingByToken)
router.post('/bookings/:token/cancel', cancelBookingByToken)
router.get('/:username/:eventSlug', getPublicEvent)
router.get('/:username/:eventSlug/slots', getPublicEventSlots)
router.post('/:username/:eventSlug/book', createBooking)

export default router
