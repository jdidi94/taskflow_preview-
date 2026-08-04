import { z } from 'zod'

const passwordPattern =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(passwordPattern, {
    message: 'Password must contain at least one letter, one number, and one special character',
  }),
  deviceId: z.string().optional(),
  deviceInfo: z
    .object({
      type: z.enum(['web', 'mobile', 'desktop']).optional(),
      os: z.string().optional(),
      browser: z.string().optional(),
      version: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .partial()
    .optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
  deviceId: z.string().optional(),
  deviceInfo: z
    .object({
      type: z.enum(['web', 'mobile', 'desktop']).optional(),
      os: z.string().optional(),
      browser: z.string().optional(),
      version: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .partial()
    .optional(),
})

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    avatar: z.string().min(1).optional(),
  })
  .refine((data) => data.name !== undefined || data.avatar !== undefined, {
    message: 'No changes provided',
  })

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const completeLogin2FASchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  sessionId: z.string().min(1),
  rememberMe: z.boolean().optional(),
  rememberDevice: z.boolean().optional(),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
})

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).regex(passwordPattern, {
    message: 'Password must contain at least one letter, one number, and one special character',
  }),
})

export const updatePreferencesSchema = z
  .object({
    section: z.string().min(1).optional(),
    subsection: z.string().min(1).optional(),
    updates: z.record(z.any()).optional(),
  })
  .passthrough()
  .refine((data) => {
    const d = data as Record<string, unknown>
    const sectionDefined = d.section !== undefined
    const subsectionDefined = d.subsection !== undefined
    const updatesDefined = d.updates !== undefined

    // Nested update requires section + subsection + updates.
    // Section-based update requires section + updates.
    // Direct-key update requires no section/subsection/updates, but at least one direct preference key.
    if (subsectionDefined && !sectionDefined) return false

    if (sectionDefined) {
      if (!updatesDefined) return false
      return true
    }

    // No `section`: only allow direct preference keys (no `updates` without `section`).
    if (updatesDefined) return false

    const hasDirectSectionKeys = Object.keys(d).some((k) =>
      !['section', 'subsection', 'updates'].includes(k),
    )
    return hasDirectSectionKeys
  }, 'Invalid preferences update payload')

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1),
})

export const verifyEmailTokenSchema = z.object({
  token: z.string().min(1),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type CompleteLogin2FAInput = z.infer<typeof completeLogin2FASchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type SessionIdInput = z.infer<typeof sessionIdSchema>
export type VerifyEmailTokenInput = z.infer<typeof verifyEmailTokenSchema>

