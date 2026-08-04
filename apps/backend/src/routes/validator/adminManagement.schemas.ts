import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

const adminRoleEnum = z.enum(['super_admin', 'admin', 'moderator', 'viewer'])

const permissionSchema = z.object({
  name: z.string().min(1).max(100),
  allowed: z.boolean(),
})

export const adminIdParamsSchema = z.object({ id: objectIdSchema })

export const adminListQuerySchema = z.object({
  role: adminRoleEnum.optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().min(1).optional(),
})

export const createAdminSchema = z.object({
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
  role: adminRoleEnum,
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  phoneNumber: z
    .string()
    .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number')
    .optional(),
  notes: z.string().max(500).optional(),
  permissions: z.array(permissionSchema).optional(),
})

export const updateAdminSchema = z
  .object({
    userName: z
      .string()
      .min(3)
      .max(50)
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens',
      )
      .optional(),
    userEmail: z.string().email().optional(),
    role: adminRoleEnum.optional(),
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
    phoneNumber: z
      .string()
      .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number')
      .optional(),
    notes: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const changeAdminPasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
})

export const toggleAdminStatusSchema = z.object({}).passthrough()

