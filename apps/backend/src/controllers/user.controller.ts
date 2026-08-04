import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import { User, type SubscriptionPlan } from '../models/User.js'
import { quotaService } from '../services/quota.service.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

function normalizePlan(planName: string): SubscriptionPlan {
  const plan = planName.toLowerCase()
  if (plan === 'basic' || plan === 'premium' || plan === 'enterprise' || plan === 'free') {
    return plan
  }
  throw new AppError('Invalid plan name', 400)
}

export const updateUserPlan = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { planName, sessionId, upgradeDate } = req.body as {
    planName: string
    sessionId: string
    upgradeDate?: string
  }

  const plan = normalizePlan(planName)
  const user = await User.findById(req.user!.sub)
  if (!user || !user.isActive) throw new AppError('User not found', 404)

  user.subscription = {
    ...(user.subscription ?? {}),
    plan,
    status: 'active',
    billingCycle: user.subscription?.billingCycle ?? 'monthly',
    startDate: upgradeDate ? new Date(upgradeDate) : new Date(),
    nextBillingDate: user.subscription?.nextBillingDate ?? null,
    lastPaymentDate: user.subscription?.lastPaymentDate ?? new Date(),
    paymentSessionId: sessionId,
    lastUpdated: new Date(),
  }
  await user.save()
  await quotaService.seedDefaultsForUser(user._id.toString(), plan)

  res.json({
    success: true,
    message: 'Plan updated successfully',
    data: {
      id: user._id,
      email: user.email,
      name: user.name,
      subscription: user.subscription,
    },
  })
})
