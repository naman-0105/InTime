import express from 'express'
import { getPublicEvent } from '../controllers/publicController.js'

const router = express.Router()

router.get('/:username/:eventSlug', getPublicEvent)

export default router
