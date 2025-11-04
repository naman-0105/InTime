import express from 'express'
import {
  getAvailability,
  setAvailability,
  deleteAvailabilityRule,
} from '../controllers/availabilityController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getAvailability)
router.post('/', setAvailability)
router.delete('/:id', deleteAvailabilityRule)

export default router
