import { z } from 'zod'

export const enable2FASchema = z.object({})

export const verify2FASetupSchema = z.object({
  token: z.string().min(1),
})

export const verify2FASchema = z.object({
  token: z.string().min(1),
})

export const disable2FASchema = z
  .object({
    token: z.string().min(1).optional(),
    recoveryToken: z.string().min(1).optional(),
  })
  .refine((data) => data.token !== undefined || data.recoveryToken !== undefined, {
    message: 'A token or recovery token is required',
  })

export const generateBackupCodesSchema = z.object({
  token: z.string().min(1),
})

export const generateRecoveryTokenSchema = z.object({
  token: z.string().min(1),
})

