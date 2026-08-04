import type { NextFunction, Request, Response } from 'express'
import passport from 'passport'

import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import { authService } from '../services/auth.service.js'
import { AppError } from '../utils/AppError.js'
import { getPassportStrategyStatus } from '../config/passport.js'
import type { IUser } from '../models/User.js'
import { env } from '../config/env.js'

export const register = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await authService.register(req.body)
  res.json({ success: true, ...result })
})

export const login = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await authService.login(req.body)
  if ('requires2FA' in result) {
    res.json({ success: true, ...result })
    return
  }
  res.json({ success: true, ...result })
})

export const completeLoginWith2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const raw = req.headers['x-device-id']
  const deviceId = Array.isArray(raw) ? raw[0] : raw
  const result = await authService.completeLoginWith2FA(req.body, {
    deviceId,
    userAgent: req.headers['user-agent'],
  })
  res.json({ success: true, ...result })
})

export const logout = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  // Stateless JWT logout: client just drops the token.
  res.json({ success: true })
})

export const getMe = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const me = await authService.getMeBySub(req.user!.sub)
  res.json({ success: true, data: me })
})

export const updateProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await authService.updateProfile(req.user!.sub, req.body)
  res.json({ success: true, data: user })
})

export const changePassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await authService.changePassword(req.user!.sub, req.body)
  res.json({ success: true })
})

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  await authService.requestPasswordReset(req.body.email)
  res.json({
    success: true,
    message: 'If an account with that email exists, a reset link has been sent',
  })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body)
  res.json({
    success: true,
    message: 'Password reset successful. Please log in with your new password.',
  })
})

export const updatePreferences = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const preferences = await authService.updatePreferences(req.user!.sub, req.body)
  res.json({ success: true, data: preferences })
})

export const getSessions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const raw = req.headers['x-device-id']
  const currentDeviceId = Array.isArray(raw) ? raw[0] : raw
  const sessions = await authService.getSessions(req.user!.sub, currentDeviceId)
  res.json({ success: true, data: sessions })
})

export const endSession = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const raw = req.params.sessionId
  const sessionId = Array.isArray(raw) ? raw[0] : raw
  await authService.endSession(req.user!.sub, sessionId)
  res.json({ success: true })
})

export function googleLogin(req: Request, res: Response, next: NextFunction) {
  const status = getPassportStrategyStatus()
  if (!status.google) {
    next(new AppError('Google OAuth is not configured', 503))
    return
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
}

export function googleCallback(req: Request, res: Response, next: NextFunction) {
  const status = getPassportStrategyStatus()
  if (!status.google) {
    next(new AppError('Google OAuth is not configured', 503))
    return
  }

  passport.authenticate('google', { session: false }, async (err: unknown, user?: IUser | false) => {
    if (err) {
      next(err)
      return
    }
    if (!user) {
      next(new AppError('Authentication failed', 401))
      return
    }

    try {
      const token = await authService.finalizeOAuthLogin(user._id.toString())
      res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}&provider=google`)
    } catch (error) {
      next(error)
    }
  })(req, res, next)
}

export function githubLogin(req: Request, res: Response, next: NextFunction) {
  const status = getPassportStrategyStatus()
  if (!status.github) {
    next(new AppError('GitHub OAuth is not configured', 503))
    return
  }
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next)
}

export function githubCallback(req: Request, res: Response, next: NextFunction) {
  const status = getPassportStrategyStatus()
  if (!status.github) {
    next(new AppError('GitHub OAuth is not configured', 503))
    return
  }

  passport.authenticate('github', { session: false }, async (err: unknown, user?: IUser | false) => {
    if (err) {
      next(err)
      return
    }
    if (!user) {
      next(new AppError('Authentication failed', 401))
      return
    }

    try {
      const token = await authService.finalizeOAuthLogin(user._id.toString())
      res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}&provider=github`)
    } catch (error) {
      next(error)
    }
  })(req, res, next)
}

