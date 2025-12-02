import express from 'express'
import {
  getPublicEvent,
  getPublicEventSlots,
  createBooking,
  getBookingById,
} from '../controllers/publicController.js'

const router = express.Router()

router.get('/bookings/:id', getBookingById)
router.get('/:username/:eventSlug', getPublicEvent)
router.get('/:username/:eventSlug/slots', getPublicEventSlots)
router.post('/:username/:eventSlug/book', createBooking)

export default router
