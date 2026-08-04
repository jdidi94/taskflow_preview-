import type { Server as HttpServer } from 'node:http'
import { Server, type Socket } from 'socket.io'
import { env } from '../config/env.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'
import { registerChatNamespace } from './chat.socket.js'

export type AuthedSocket = Socket & {
  data: {
    user?: JwtPayload
  }
}

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.isDev ? true : env.corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  io.use((socket: AuthedSocket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : undefined)

      if (!token) {
        next(new Error('Authentication required'))
        return
      }

      socket.data.user = verifyAccessToken(token)
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket: AuthedSocket) => {
    const user = socket.data.user
    console.log(`Socket connected: ${socket.id} user=${user?.sub ?? 'unknown'}`)

    socket.emit('system:ready', {
      socketId: socket.id,
      userId: user?.sub,
      type: user?.type,
    })

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`)
    })
  })

  registerChatNamespace(io)

  return io
}
