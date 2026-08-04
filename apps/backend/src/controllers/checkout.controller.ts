import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import { User, type SubscriptionPlan } from '../models/User.js'
import { sendEmail } from '../services/email.service.js'
import { getStripeClient, isStripeConfigured } from '../services/stripe.service.js'
import { quotaService } from '../services/quota.service.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { env } from '../config/env.js'

function normalizePlan(planName: string): SubscriptionPlan {
  const plan = planName.toLowerCase()
  if (plan === 'basic' || plan === 'premium' || plan === 'enterprise' || plan === 'free') {
    return plan
  }
  return 'premium'
}

export const createCheckoutSession = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!isStripeConfigured()) {
    throw new AppError('Stripe is not configured on the server', 503, {
      message: 'Set STRIPE_SECRET_KEY in apps/backend/.env and restart the server.',
    })
  }

  const { products, metadata } = req.body as {
    products: Array<Record<string, any>>
    metadata?: Record<string, string>
  }

  if (!Array.isArray(products) || products.length === 0) {
    throw new AppError('products are required', 400)
  }

  const userId = req.user!.sub
  const mergedMetadata: Record<string, string> = { ...(metadata ?? {}), userId }
  const planName = mergedMetadata.plan || 'premium'
  const amount = products[0]?.price_data?.unit_amount
    ? (products[0].price_data.unit_amount / 100).toFixed(2)
    : '0'
  const billingCycle = mergedMetadata.billing_cycle || 'monthly'

  const successParams = new URLSearchParams({
    session_id: '{CHECKOUT_SESSION_ID}',
    plan: planName,
    amount,
    billing_cycle: billingCycle,
  })
  const cancelParams = new URLSearchParams({
    session_id: '{CHECKOUT_SESSION_ID}',
    reason: 'user_cancelled',
    plan: planName,
    amount,
  })

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: products as any,
    mode: 'payment',
    success_url: `${env.FRONTEND_URL}/success?${successParams.toString()}`,
    cancel_url: `${env.FRONTEND_URL}/cancel?${cancelParams.toString()}`,
    metadata: mergedMetadata,
  })

  res.json({ id: session.id, url: session.url })
})

export const sendPaymentNotification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { sessionId, planName, amount, billingCycle } = req.body as {
    sessionId: string
    planName: string
    amount: string | number
    billingCycle: 'monthly' | 'yearly'
  }

  const user = await User.findById(req.user!.sub)
  if (!user || !user.isActive) throw new AppError('User not found', 404)

  const nextBillingDate = new Date()
  if (billingCycle === 'yearly') nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
  else nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

  const plan = normalizePlan(planName)
  const amountText = String(amount)

  await sendEmail({
    to: user.email,
    subject: `Payment confirmation — ${plan} plan`,
    html: `
      <p>Hi ${user.name},</p>
      <p>Your payment for the <strong>${plan}</strong> plan (${amountText}, ${billingCycle}) was received.</p>
      <p>Transaction: ${sessionId}</p>
      <p>Next billing date: ${nextBillingDate.toLocaleDateString()}</p>
      <p><a href="${env.FRONTEND_URL}/dashboard">Open dashboard</a></p>
    `,
    text: `Payment confirmation for ${plan} plan. Transaction ${sessionId}.`,
  })

  user.subscription = {
    ...(user.subscription ?? {}),
    plan,
    status: 'active',
    billingCycle,
    startDate: user.subscription?.startDate ?? new Date(),
    nextBillingDate,
    lastPaymentDate: new Date(),
    paymentSessionId: sessionId,
    lastUpdated: new Date(),
  }
  await user.save()
  await quotaService.seedDefaultsForUser(user._id.toString(), plan)

  res.json({ success: true, message: 'Payment notification sent successfully' })
})
