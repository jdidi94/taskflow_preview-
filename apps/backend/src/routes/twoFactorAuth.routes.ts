import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody } from '../middlewares/validate.js'
import * as twoFactorController from '../controllers/twoFactorAuth.controller.js'
import {
  disable2FASchema,
  enable2FASchema,
  generateBackupCodesSchema,
  generateRecoveryTokenSchema,
  verify2FASchema,
  verify2FASetupSchema,
} from './validator/twoFactor.schemas.js'

export const twoFactorAuthRouter = Router()

twoFactorAuthRouter.use(authenticate)

twoFactorAuthRouter.post('/enable', validateBody(enable2FASchema), twoFactorController.enable2FA)
twoFactorAuthRouter.post(
  '/verify-setup',
  validateBody(verify2FASetupSchema),
  twoFactorController.verify2FASetup,
)
twoFactorAuthRouter.post('/verify', validateBody(verify2FASchema), twoFactorController.verify2FA)
twoFactorAuthRouter.post('/disable', validateBody(disable2FASchema), twoFactorController.disable2FA)
twoFactorAuthRouter.post(
  '/backup-codes',
  validateBody(generateBackupCodesSchema),
  twoFactorController.generateBackupCodes,
)
twoFactorAuthRouter.get('/status', twoFactorController.get2FAStatus)
twoFactorAuthRouter.post(
  '/recovery-token',
  validateBody(generateRecoveryTokenSchema),
  twoFactorController.generateRecoveryToken,
)

