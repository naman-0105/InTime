import express from 'express'
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../controllers/eventController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', getEvents)
router.post('/', createEvent)
router.get('/:id', getEventById)
router.patch('/:id', updateEvent)
router.delete('/:id', deleteEvent)

export default router
