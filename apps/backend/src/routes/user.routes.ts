import { Router } from 'express'

import * as userController from '../controllers/user.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { validateBody } from '../middlewares/validate.js'
import { updateUserPlanSchema } from './validator/checkout.schemas.js'

export const userRouter = Router()

userRouter.use(authenticate)
userRouter.post('/update-plan', validateBody(updateUserPlanSchema), userController.updateUserPlan)
