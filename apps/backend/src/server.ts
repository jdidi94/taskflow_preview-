import http from 'node:http'
import { createApp } from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'
import { createSocketServer } from './sockets/index.js'
import { bindNotificationIo } from './services/notification.service.js'
import './models/index.js'

async function bootstrap() {
  const app = createApp()
  const server = http.createServer(app)

  const io = createSocketServer(server)
  app.set('io', io)
  bindNotificationIo(io)

  try {
    await connectDB()
  } catch (error) {
    console.error('Failed to connect to MongoDB. Health will report mongo: down.')
    if (env.isProd) {
      process.exit(1)
    }
  }

  server.listen(env.PORT, () => {
    console.log(`TaskFlow API listening on http://localhost:${env.PORT}`)
    console.log(`Socket.IO path: /socket.io`)
  })
}

bootstrap().catch((error) => {
  console.error('Fatal startup error:', error)
  process.exit(1)
})
