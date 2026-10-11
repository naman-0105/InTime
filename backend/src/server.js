import 'dotenv/config'
import app from './app.js'
import {
  startEmailWorker,
  closeEmailWorker,
} from './workers/emailWorker.js'
import { closeEmailQueue } from './queues/emailQueue.js'

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startEmailWorker()
})

const handleShutdown = async () => {
  server.close(async () => {
    await closeEmailWorker()
    await closeEmailQueue()
    process.exit(0)
  })
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

