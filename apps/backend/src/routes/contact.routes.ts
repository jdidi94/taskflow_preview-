import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middlewares/validate.js'
import { sendContact } from '../controllers/contact.controller.js'

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(5000),
})

export const contactRouter = Router()

contactRouter.post('/', validateBody(contactSchema), sendContact)
