import express from 'express'
import { getPublicEvent, getPublicEventSlots } from '../controllers/publicController.js'

const router = express.Router()

router.get('/:username/:eventSlug', getPublicEvent)
router.get('/:username/:eventSlug/slots', getPublicEventSlots)

export default router
