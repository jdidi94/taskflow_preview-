import type { Response } from 'express'
import { Types } from 'mongoose'

import type { AuthedRequest } from '../middlewares/auth.js'
import { Admin } from '../models/Admin.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'

function parseBooleanString(value: unknown): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function toPublicAdmin(admin: any) {
  return {
    _id: admin._id,
    userName: admin.userName,
    userEmail: admin.userEmail,
    role: admin.role,
    firstName: admin.firstName ?? null,
    lastName: admin.lastName ?? null,
    phoneNumber: admin.phoneNumber ?? null,
    notes: admin.notes ?? null,
    createdBy: admin.createdBy ?? null,
    isActive: admin.isActive,
    isEmailVerified: admin.isEmailVerified,
    lastLoginAt: admin.lastLoginAt ?? null,
    hasTwoFactorAuth: admin.hasTwoFactorAuth,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }
}

async function getAdminOr404(id: string, includePassword = false) {
  const query = Admin.findById(id)
  if (includePassword) query.select('+password')
  const admin = await query
  if (!admin) throw new AppError('Admin user not found', 404)
  return admin
}

export const createAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { userName, userEmail, password, role, firstName, lastName, phoneNumber, notes } = req.body as {
    userName: string
    userEmail: string
    password: string
    role: 'super_admin' | 'admin' | 'moderator' | 'viewer'
    firstName?: string
    lastName?: string
    phoneNumber?: string
    notes?: string
  }

  const [existingByEmail, existingByUsername] = await Promise.all([
    Admin.findOne({ userEmail }),
    Admin.findOne({ userName }),
  ])
  if (existingByEmail) throw new AppError('Admin with this email already exists', 400)
  if (existingByUsername) throw new AppError('Admin with this username already exists', 400)

  const admin = await Admin.create({
    userName,
    userEmail,
    password,
    role,
    firstName,
    lastName,
    phoneNumber,
    notes,
    createdBy: new Types.ObjectId(req.user!.sub),
    isActive: true,
  })

  res.status(201).json({ success: true, data: { admin: toPublicAdmin(admin) } })
})

export const getAllAdmins = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    role?: string
    isActive?: 'true' | 'false'
    page?: number
    limit?: number
    search?: string
  }

  const filter: Record<string, unknown> = {}
  if (q.role) filter.role = q.role
  const isActive = parseBooleanString(q.isActive)
  if (isActive !== undefined) filter.isActive = isActive
  if (q.search) {
    filter.$or = [
      { userName: { $regex: q.search, $options: 'i' } },
      { userEmail: { $regex: q.search, $options: 'i' } },
      { firstName: { $regex: q.search, $options: 'i' } },
      { lastName: { $regex: q.search, $options: 'i' } },
    ]
  }

  const page = q.page ?? 1
  const limit = q.limit ?? 10

  const [admins, total] = await Promise.all([
    Admin.find(filter)
      .populate('createdBy', 'userName userEmail')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Admin.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: {
      admins: admins.map(toPublicAdmin),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  })
})

export const getAdminById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await Admin.findById(param(req, 'id')).populate('createdBy', 'userName userEmail')
  if (!admin) throw new AppError('Admin user not found', 404)
  res.json({ success: true, data: { admin: toPublicAdmin(admin) } })
})

export const updateAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = param(req, 'id')
  const updateData = { ...(req.body as Record<string, unknown>) }

  if (id === req.user!.sub && 'role' in updateData) {
    throw new AppError('Cannot change your own role', 400)
  }

  if (typeof updateData.userEmail === 'string') {
    const existingAdmin = await Admin.findOne({ userEmail: updateData.userEmail, _id: { $ne: id } })
    if (existingAdmin) throw new AppError('Admin with this email already exists', 400)
  }
  if (typeof updateData.userName === 'string') {
    const existingAdmin = await Admin.findOne({ userName: updateData.userName, _id: { $ne: id } })
    if (existingAdmin) throw new AppError('Admin with this username already exists', 400)
  }

  delete updateData.password
  delete updateData.hasTwoFactorAuth
  delete updateData.createdBy

  const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
  if (!updatedAdmin) throw new AppError('Admin user not found', 404)

  res.json({ success: true, data: { admin: toPublicAdmin(updatedAdmin) } })
})

export const deleteAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = param(req, 'id')
  if (id === req.user!.sub) throw new AppError('Cannot delete your own account', 400)

  const admin = await getAdminOr404(id)
  if (admin.role === 'super_admin') throw new AppError('Cannot delete super admin users', 400)

  await Admin.findByIdAndDelete(id)
  res.json({ success: true })
})

export const changeAdminPassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = param(req, 'id')
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string
    newPassword: string
  }

  const admin = await getAdminOr404(id, true)

  if (id === req.user!.sub) {
    if (!currentPassword) throw new AppError('Current password is required', 400)
    const ok = await admin.comparePassword(currentPassword)
    if (!ok) throw new AppError('Current password is incorrect', 400)
  }

  admin.password = newPassword
  await admin.save()

  res.json({ success: true })
})

export const toggleAdminStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = param(req, 'id')
  if (id === req.user!.sub) throw new AppError('Cannot deactivate your own account', 400)

  const admin = await getAdminOr404(id)
  if (admin.role === 'super_admin') throw new AppError('Cannot deactivate super admin users', 400)

  admin.isActive = !admin.isActive
  await admin.save()

  const status = admin.isActive ? 'activated' : 'deactivated'
  res.json({
    success: true,
    message: `Admin user ${status} successfully`,
    data: {
      admin: {
        _id: admin._id,
        userName: admin.userName,
        userEmail: admin.userEmail,
        isActive: admin.isActive,
      },
    },
  })
})

export const getAdminStats = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const admins = await Admin.find().select('role isActive').lean()

  const roleBreakdown: Record<string, number> = {}
  for (const admin of admins) {
    const key = `${admin.role}_${admin.isActive ? 'active' : 'inactive'}`
    roleBreakdown[key] = (roleBreakdown[key] ?? 0) + 1
  }

  const total = admins.length
  const active = admins.filter((admin) => admin.isActive).length
  const inactive = total - active

  res.json({
    success: true,
    data: {
      stats: {
        total,
        active,
        inactive,
        roleBreakdown,
      },
    },
  })
})

