process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-phase7'
process.env.ENCRYPTION_KEY = 'test-encryption-key-phase7'
process.env.LOG_LEVEL = 'silent'
process.env.SMTP_ENABLED = 'false'
process.env.CORS_ORIGIN = 'http://localhost:5173'

import { afterAll } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

/** Prefer an external Mongo (CI service) when DATABASE_URL is already set. */
let memory: MongoMemoryServer | undefined

if (!process.env.DATABASE_URL) {
  memory = await MongoMemoryServer.create()
  process.env.DATABASE_URL = memory.getUri('taskflow-test')
}

if (mongoose.connection.readyState !== 0) {
  await mongoose.disconnect()
}
await mongoose.connect(process.env.DATABASE_URL)

afterAll(async () => {
  await mongoose.disconnect()
  if (memory) await memory.stop()
})
