/**
 * Smoke-test Socket.IO JWT handshake.
 *
 * Usage:
 *   TOKEN=$(npm run token -w @taskflow/backend --silent)
 *   npm run smoke:socket -w @taskflow/backend -- "$TOKEN"
 */
import { io } from 'socket.io-client'

const token = process.argv[2]
if (!token) {
  console.error('Usage: tsx src/scripts/smoke-socket.ts <jwt>')
  process.exit(1)
}

const socket = io('http://localhost:3001', {
  path: '/socket.io',
  auth: { token },
  transports: ['websocket'],
})

socket.on('connect', () => {
  console.log('connected', socket.id)
})

socket.on('system:ready', (payload) => {
  console.log('system:ready', payload)
  socket.close()
  process.exit(0)
})

socket.on('connect_error', (err) => {
  console.error('connect_error', err.message)
  process.exit(1)
})

setTimeout(() => {
  console.error('timeout waiting for system:ready')
  process.exit(1)
}, 8000)
