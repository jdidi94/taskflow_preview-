import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

const userSystemRoleEnum = z.enum(['super_admin', 'admin', 'moderator', 'user', 'viewer'])
const adminRoleEnum = z.enum(['super_admin', 'admin', 'moderator', 'viewer'])

export const adminUserIdParamsSchema = z.object({ userId: objectIdSchema })

export const adminUsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
})

export const createManagedUserSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email(),
  role: userSystemRoleEnum.default('user'),
})

export const createAdminOnlyWithEmailSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
  role: adminRoleEnum,
})

export const createAdminOnlySchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
  role: adminRoleEnum,
})

export const resetManagedUserPasswordSchema = z.object({
  email: z.string().email(),
})

export const updateManagedUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    avatar: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    systemRole: userSystemRoleEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const changeManagedUserRoleSchema = z.object({
  newRole: userSystemRoleEnum,
})

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
})

export const adminComplete2FASchema = z.object({
  userId: objectIdSchema,
  token: z.string().min(6).max(64),
  rememberMe: z.boolean().optional(),
})

export const setupFirstAdminSchema = z.object({
  userName: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  userEmail: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
})

export const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
})

export const adminUpdateProfileSchema = z
  .object({
    userName: z.string().min(3).max(50).optional(),
    firstName: z.string().max(50).nullable().optional(),
    lastName: z.string().max(50).nullable().optional(),
    phoneNumber: z.string().max(30).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const adminVerify2FASetupSchema = z.object({
  token: z.string().min(6).max(12),
})

export const adminDisable2FASchema = z.object({
  password: z.string().min(1),
  token: z.string().min(6).max(64).optional(),
})

export const adminTemplateIdParamsSchema = z.object({ templateId: objectIdSchema })

export const createAdminProjectTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  content: z.any(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
})

export const updateAdminProjectTemplateSchema = createAdminProjectTemplateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const adminAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['1-month', '3-months', '6-months', '1-year']).optional(),
  format: z.enum(['json', 'csv']).optional(),
})

