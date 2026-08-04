import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '3.0.0' })
  })

  return app
}
