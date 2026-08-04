import type { JwtPayload } from '../utils/jwt.js'

declare global {
  namespace Express {
    interface User {
      sub?: JwtPayload['sub']
      type?: JwtPayload['type']
      email?: JwtPayload['email']
      name?: JwtPayload['name']
      role?: JwtPayload['role']
    }
  }
}

export {}

