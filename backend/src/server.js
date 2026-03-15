import 'dotenv/config'
import app from './app.js'
import {
  startCalendarWorker,
  closeCalendarWorker,
} from './workers/calendarSyncWorker.js'
import { closeCalendarSyncQueue } from './queues/calendarSyncQueue.js'
import {
  startEmailWorker,
  closeEmailWorker,
} from './workers/emailWorker.js'
import { closeEmailQueue } from './queues/emailQueue.js'
import {
  startWatchRenewalInterval,
  stopWatchRenewalInterval,
} from './services/googleCalendarService.js'

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startCalendarWorker()
  startEmailWorker()
  startWatchRenewalInterval()
})

const handleShutdown = async () => {
  server.close(async () => {
    stopWatchRenewalInterval()
    await closeCalendarWorker()
    await closeCalendarSyncQueue()
    await closeEmailWorker()
    await closeEmailQueue()
    process.exit(0)
  })
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)
