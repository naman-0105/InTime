import express from 'express'
import {
  getBookings,
  getBookingById,
  cancelBooking,
} from '../controllers/bookingController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getBookings)
router.get('/:id', getBookingById)
router.post('/:id/cancel', cancelBooking)

export default router
