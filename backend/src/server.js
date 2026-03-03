import 'dotenv/config'
import app from './app.js'
import {
  startCalendarWorker,
  closeCalendarWorker,
} from './workers/calendarSyncWorker.js'
import { closeCalendarSyncQueue } from './queues/calendarSyncQueue.js'

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startCalendarWorker()
})

const handleShutdown = async () => {
  server.close(async () => {
    await closeCalendarWorker()
    await closeCalendarSyncQueue()
    process.exit(0)
  })
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

