import express from 'express'
import {
  getAvailability,
  setAvailability,
  deleteAvailabilityRule,
  getOverrides,
  setOverride,
  deleteOverride,
  getHostLimits,
  setHostLimits,
} from '../controllers/availabilityController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/limits', getHostLimits)
router.post('/limits', setHostLimits)

router.get('/overrides', getOverrides)
router.post('/overrides', setOverride)
router.delete('/overrides/:id', deleteOverride)

router.get('/', getAvailability)
router.post('/', setAvailability)
router.delete('/:id', deleteAvailabilityRule)

export default router

