import express from 'express'
import { getBookings, getBookingById } from '../controllers/bookingController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getBookings)
router.get('/:id', getBookingById)

export default router
