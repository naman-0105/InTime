import 'dotenv/config'
import app from './app.js'
import { startEmailWorker } from './workers/emailWorker.js'

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  startEmailWorker()
})

