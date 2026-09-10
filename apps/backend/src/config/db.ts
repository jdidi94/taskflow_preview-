import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from './logger.js'

export async function connectDB(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true)

  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL || env.DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
    })
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    logger.error({ err: error }, 'Database connection error')
    throw error
  }
}

export function getMongoStatus(): 'up' | 'down' {
  return mongoose.connection.readyState === 1 ? 'up' : 'down'
}
