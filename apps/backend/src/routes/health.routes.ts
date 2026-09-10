import { Router } from 'express'
import { getMongoStatus } from '../config/db.js'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  const mongo = getMongoStatus()
  res.setHeader('Cache-Control', 'public, max-age=10')
  res.status(mongo === 'up' ? 200 : 503).json({
    status: mongo === 'up' ? 'ok' : 'degraded',
    version: '3.0.0',
    mongo,
  })
})
