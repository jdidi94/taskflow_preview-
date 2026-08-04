import { Router } from 'express'

import * as checkoutController from '../controllers/checkout.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { validateBody } from '../middlewares/validate.js'
import {
  createCheckoutSessionSchema,
  sendPaymentNotificationSchema,
} from './validator/checkout.schemas.js'

export const checkoutRouter = Router()

checkoutRouter.use(authenticate)
checkoutRouter.post(
  '/create-checkout-session',
  validateBody(createCheckoutSessionSchema),
  checkoutController.createCheckoutSession,
)
checkoutRouter.post(
  '/send-payment-notification',
  validateBody(sendPaymentNotificationSchema),
  checkoutController.sendPaymentNotification,
)
