import { z } from 'zod'

export const createCheckoutSessionSchema = z.object({
  products: z.array(z.record(z.string(), z.any())).min(1),
  metadata: z.record(z.string(), z.string()).optional(),
})

export const sendPaymentNotificationSchema = z.object({
  sessionId: z.string().min(1),
  planName: z.string().min(1),
  amount: z.union([z.string(), z.number()]),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
})

export const updateUserPlanSchema = z.object({
  planName: z.enum(['free', 'basic', 'premium', 'enterprise']),
  sessionId: z.string().min(1),
  upgradeDate: z.string().datetime().optional(),
})
