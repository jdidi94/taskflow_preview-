import { Router } from 'express'

import { validateBody, validateParams } from '../middlewares/validate.js'
import { authenticate } from '../middlewares/auth.js'
import {
  registerSchema,
  loginSchema,
  completeLogin2FASchema,
  updateProfileSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  updatePreferencesSchema,
  sessionIdSchema,
} from './validator/auth.schemas.js'
import * as authController from '../controllers/auth.controller.js'

export const authRouter = Router()

// Public routes
authRouter.post('/register', validateBody(registerSchema), authController.register)
authRouter.post('/login', validateBody(loginSchema), authController.login)
authRouter.post('/login/2fa-complete', validateBody(completeLogin2FASchema), authController.completeLoginWith2FA)
authRouter.post(
  '/password-reset/request',
  validateBody(passwordResetRequestSchema),
  authController.requestPasswordReset,
)
authRouter.put(
  '/password-reset/confirm',
  validateBody(passwordResetConfirmSchema),
  authController.resetPassword,
)
authRouter.get('/google', authController.googleLogin)
authRouter.get('/google/callback', authController.googleCallback)
authRouter.get('/github', authController.githubLogin)
authRouter.get('/github/callback', authController.githubCallback)

// Protected routes
authRouter.post('/logout', authenticate, authController.logout)
authRouter.get('/me', authenticate, authController.getMe)
authRouter.patch('/profile', authenticate, validateBody(updateProfileSchema), authController.updateProfile)
authRouter.post(
  '/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  authController.changePassword,
)

authRouter.put('/preferences', authenticate, validateBody(updatePreferencesSchema), authController.updatePreferences)
authRouter.get('/sessions', authenticate, authController.getSessions)
authRouter.delete(
  '/sessions/:sessionId',
  authenticate,
  validateParams(sessionIdSchema),
  authController.endSession,
)

