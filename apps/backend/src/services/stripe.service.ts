import Stripe from 'stripe'

import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe is not configured on the server', 503)
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY)
  }
  return stripeClient
}

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY)
}
