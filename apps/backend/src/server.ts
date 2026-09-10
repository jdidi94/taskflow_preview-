import http from 'node:http'
import { createApp } from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
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
    logger.error({ err: error }, 'Failed to connect to MongoDB. Health will report mongo: down.')
    if (env.isProd) {
      process.exit(1)
    }
  }

  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`TaskFlow API listening on http://0.0.0.0:${env.PORT}`)
    logger.info('Socket.IO path: /socket.io')
  })
}

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Fatal startup error')
  process.exit(1)
})
