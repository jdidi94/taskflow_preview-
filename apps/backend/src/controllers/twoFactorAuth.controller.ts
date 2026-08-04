import type { Response } from 'express'
import { User } from '../models/User.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { twoFactorAuthService } from '../services/twoFactorAuth.service.js'

async function getUserFor2FA(sub: string) {
  const user = await User.findById(sub).select(
    '+twoFactorAuth.secret +twoFactorAuth.backupCodes.code +twoFactorAuth.recoveryToken',
  )
  if (!user || !user.isActive) throw new AppError('User not found', 404)
  return user
}

export const enable2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)

  if (user.hasTwoFactorAuth) {
    throw new AppError('2FA is already enabled', 400)
  }

  const { secret, otpauthUrl, qrCode } = await twoFactorAuthService.generateSecret(user.email)
  const backupCodes = twoFactorAuthService.generateBackupCodes(10)

  user.twoFactorAuth = {
    ...(user.twoFactorAuth ?? { backupCodes: [] }),
    secret,
    backupCodes: backupCodes.map((code) => ({ code, used: false, usedAt: null })),
    enabledAt: null,
    lastUsed: null,
    recoveryToken: null,
    recoveryTokenExpires: null,
  }

  await user.save()

  res.json({
    success: true,
    data: {
      qrCode,
      otpauthUrl,
      secret,
      backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code to complete setup',
    },
  })
})

export const verify2FASetup = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)
  const token = req.body.token as string

  if (!user.twoFactorAuth?.secret) {
    throw new AppError('2FA setup not initiated', 400)
  }
  if (user.hasTwoFactorAuth) {
    throw new AppError('2FA is already enabled', 400)
  }

  const valid = twoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret)
  if (!valid) throw new AppError('Invalid verification code', 400)

  user.hasTwoFactorAuth = true
  user.twoFactorAuth.enabledAt = new Date()
  user.twoFactorAuth.lastUsed = new Date()
  await user.save()

  res.json({
    success: true,
    data: { message: 'Two-factor authentication has been enabled for your account' },
  })
})

export const verify2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)
  const token = req.body.token as string

  if (!user.hasTwoFactorAuth || !user.twoFactorAuth?.secret) {
    throw new AppError('2FA is not enabled for this account', 400)
  }

  const backupCode = user.twoFactorAuth.backupCodes.find((code) => code.code === token && !code.used)
  let valid = false

  if (backupCode) {
    backupCode.used = true
    backupCode.usedAt = new Date()
    valid = true
  } else {
    valid = twoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret)
  }

  if (!valid) throw new AppError('Invalid verification code', 401)

  user.twoFactorAuth.lastUsed = new Date()
  await user.save()

  res.json({
    success: true,
    data: {
      verified: true,
      usedBackupCode: Boolean(backupCode),
      requiresNewBackupCodes: user.twoFactorAuth.backupCodes.filter((item) => !item.used).length < 3,
    },
  })
})

export const disable2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)
  const token = req.body.token as string | undefined
  const recoveryToken = req.body.recoveryToken as string | undefined

  if (!user.hasTwoFactorAuth || !user.twoFactorAuth?.secret) {
    throw new AppError('2FA is not enabled for this account', 400)
  }

  const tokenValid =
    token && user.twoFactorAuth.secret
      ? twoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret)
      : false

  const recoveryValid =
    recoveryToken &&
    user.twoFactorAuth.recoveryToken &&
    user.twoFactorAuth.recoveryTokenExpires &&
    user.twoFactorAuth.recoveryToken === recoveryToken &&
    user.twoFactorAuth.recoveryTokenExpires > new Date()

  if (!tokenValid && !recoveryValid) {
    throw new AppError('Invalid verification token', 401)
  }

  user.hasTwoFactorAuth = false
  user.twoFactorAuth = {
    secret: undefined,
    backupCodes: [],
    recoveryToken: null,
    recoveryTokenExpires: null,
    enabledAt: null,
    lastUsed: null,
  }
  await user.save()

  res.json({ success: true, data: { message: 'Two-factor authentication disabled' } })
})

export const generateBackupCodes = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)
  const token = req.body.token as string

  if (!user.hasTwoFactorAuth || !user.twoFactorAuth?.secret) {
    throw new AppError('2FA is not enabled for this account', 400)
  }

  const valid = twoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret)
  if (!valid) throw new AppError('Invalid verification code', 401)

  const backupCodes = twoFactorAuthService.generateBackupCodes(10)
  user.twoFactorAuth.backupCodes = backupCodes.map((code) => ({ code, used: false, usedAt: null }))
  user.twoFactorAuth.lastUsed = new Date()
  await user.save()

  res.json({ success: true, data: { backupCodes } })
})

export const get2FAStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)

  res.json({
    success: true,
    data: {
      enabled: user.hasTwoFactorAuth,
      enabledAt: user.twoFactorAuth?.enabledAt ?? null,
      lastUsed: user.twoFactorAuth?.lastUsed ?? null,
      backupCodesRemaining: user.twoFactorAuth?.backupCodes?.filter((code) => !code.used).length ?? 0,
    },
  })
})

export const generateRecoveryToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserFor2FA(req.user!.sub)
  const token = req.body.token as string

  if (!user.hasTwoFactorAuth || !user.twoFactorAuth?.secret) {
    throw new AppError('2FA is not enabled for this account', 400)
  }

  const valid = twoFactorAuthService.verifyToken(token, user.twoFactorAuth.secret)
  if (!valid) throw new AppError('Invalid verification code', 401)

  const recovery = twoFactorAuthService.generateRecoveryToken()
  user.twoFactorAuth.recoveryToken = recovery.token
  user.twoFactorAuth.recoveryTokenExpires = recovery.expiresAt
  user.twoFactorAuth.lastUsed = new Date()
  await user.save()

  res.json({
    success: true,
    data: {
      recoveryToken: recovery.token,
      expiresAt: recovery.expiresAt,
    },
  })
})

