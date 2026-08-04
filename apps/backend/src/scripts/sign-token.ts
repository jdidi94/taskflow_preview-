/**
 * Dev helper: print a JWT for smoke-testing GET /api/me and sockets.
 *
 * Usage:
 *   npm run token -w @taskflow/backend -- --sub=000000000000000000000001 --email=dev@taskflow.local
 */
import { signAccessToken } from '../utils/jwt.js'

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=')
    return [key, rest.join('=') || 'true']
  }),
)

const token = signAccessToken({
  sub: args.sub || '000000000000000000000001',
  type: (args.type as 'user' | 'admin') || 'user',
  email: args.email || 'dev@taskflow.local',
  name: args.name || 'Dev User',
  role: args.role,
})

console.log(token)
