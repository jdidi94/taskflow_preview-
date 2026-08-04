import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { getMe } from '../controllers/auth.controller.js'

export const meRouter = Router()

meRouter.get(
  '/',
  authenticate,
  getMe,
)
