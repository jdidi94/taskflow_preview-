import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDB(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true)

  try {
    const conn = await mongoose.connect(env.DATABASE_URL, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    console.error('Database connection error:', error)
    throw error
  }
}

export function getMongoStatus(): 'up' | 'down' {
  return mongoose.connection.readyState === 1 ? 'up' : 'down'
}
