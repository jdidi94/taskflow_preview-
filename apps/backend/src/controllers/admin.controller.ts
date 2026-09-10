import crypto from 'node:crypto'
import os from 'node:os'
import type { Response } from 'express'
import mongoose from 'mongoose'

import type { AuthedRequest } from '../middlewares/auth.js'
import { Admin } from '../models/Admin.js'
import { Template } from '../models/Template.js'
import { User, type UserSystemRole } from '../models/User.js'
import {
  buildAdminAnalyticsSnapshot,
  type AdminAnalyticsTimeRange,
} from '../services/adminAnalytics.service.js'
import { recordAdminAudit } from '../services/adminAudit.service.js'
import { twoFactorAuthService } from '../services/twoFactorAuth.service.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { signAccessToken } from '../utils/jwt.js'
import { param } from '../utils/params.js'
import { env } from '../config/env.js'

type AdminUsersQuery = {
  page?: number
  limit?: number
  search?: string
  role?: string
  status?: string
}

function normalizePagination(q: AdminUsersQuery) {
  return {
    page: q.page ?? 1,
    limit: q.limit ?? 20,
  }
}

function statusToIsActive(status?: string): boolean | undefined {
  if (!status) return undefined
  if (status === 'Active') return true
  if (status === 'Inactive') return false
  if (status === 'all' || status === 'All Statuses') return undefined
  return undefined
}

async function loadCurrentAdmin(req: AuthedRequest) {
  const admin = await Admin.findById(req.user!.sub)
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)
  return admin
}

async function getUserOr404(userId: string) {
  const user = await User.findById(userId).select('+password')
  if (!user) throw new AppError('User not found', 404)
  return user
}

function publicUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin ?? null,
    systemRole: user.systemRole ?? 'user',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export const getUsers = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as AdminUsersQuery
  const { page, limit } = normalizePagination(q)
  const roleFilter = q.role && q.role !== 'All Roles' ? q.role : undefined
  const activeFilter = statusToIsActive(q.status)
  const search = q.search?.trim()

  const adminFilter: Record<string, unknown> = {}
  if (search) {
    adminFilter.$or = [
      { userName: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
    ]
  }
  if (roleFilter && roleFilter !== 'user') adminFilter.role = roleFilter
  if (activeFilter !== undefined) adminFilter.isActive = activeFilter

  const userFilter: Record<string, unknown> = {
    systemRole: roleFilter ? roleFilter : { $ne: 'user' },
  }
  if (search) {
    userFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }
  if (activeFilter !== undefined) userFilter.isActive = activeFilter

  const [adminUsers, roleUsers] = await Promise.all([
    Admin.find(adminFilter).sort({ createdAt: -1 }).lean(),
    User.find(userFilter).sort({ createdAt: -1 }).lean(),
  ])

  const combined = [
    ...adminUsers.map((admin) => ({
      id: admin._id,
      name: admin.userName,
      email: admin.userEmail,
      avatar: null,
      role: admin.role,
      isActive: admin.isActive,
      lastActivity: admin.lastLoginAt ?? null,
      permissions: [],
      type: 'admin_only',
      createdAt: admin.createdAt,
    })),
    ...roleUsers.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      role: user.systemRole ?? 'user',
      isActive: user.isActive,
      lastActivity: user.lastLogin ?? null,
      permissions: [],
      type: 'regular_user',
      createdAt: user.createdAt,
    })),
  ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const total = combined.length
  const start = (page - 1) * limit
  const users = combined.slice(start, start + limit)

  res.json({
    success: true,
    data: {
      users,
      total,
      page,
      limit,
    },
  })
})

export const getAppUsers = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as AdminUsersQuery
  const { page, limit } = normalizePagination(q)
  const activeFilter = statusToIsActive(q.status)
  const search = q.search?.trim()
  const roleFilter = q.role && q.role !== 'all' ? q.role : undefined

  const filter: Record<string, unknown> = {}
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }
  if (activeFilter !== undefined) filter.isActive = activeFilter
  if (roleFilter) filter.systemRole = roleFilter

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: {
      users: users.map((user) => ({
        id: user._id,
        username: user.name,
        email: user.email,
        role: user.systemRole ?? 'user',
        status: user.isActive ? 'Active' : 'Inactive',
        lastLoginAt: user.lastLogin ? new Date(user.lastLogin).toISOString() : 'Never',
        createdAt: user.createdAt,
        avatar: user.avatar ?? null,
      })),
      total,
      page,
      limit,
    },
  })
})

export const createUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { username, email, role } = req.body as {
    username: string
    email: string
    role: UserSystemRole
  }

  const existing = await User.findOne({ email })
  if (existing) throw new AppError('User with this email already exists', 400)

  const user = await User.create({
    name: username,
    email,
    password: 'user123!A',
    systemRole: role,
  })

  void recordAdminAudit(req, {
    action: 'user.create',
    targetType: 'user',
    targetId: String(user._id),
    targetLabel: user.email,
    summary: `Created app user ${user.email}`,
    notify: true,
    href: '/users',
  })

  res.status(201).json({
    success: true,
    data: { user: { id: user._id, email: user.email, systemRole: user.systemRole } },
  })
})

export const getUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(param(req, 'userId')).select('-password')
  if (!user) throw new AppError('User not found', 404)
  res.json({ success: true, data: { user: publicUser(user) } })
})

export const updateUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = param(req, 'userId')
  const updateData = { ...(req.body as Record<string, unknown>) }

  delete updateData.password
  if (typeof updateData.systemRole !== 'string') delete updateData.systemRole

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select(
    '-password',
  )
  if (!user) throw new AppError('User not found', 404)

  void recordAdminAudit(req, {
    action: 'user.update',
    targetType: 'user',
    targetId: String(user._id),
    targetLabel: user.email,
    summary: `Updated app user ${user.email}`,
    href: '/users',
  })

  res.json({ success: true, data: { user: publicUser(user) } })
})

export const deactivateUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserOr404(param(req, 'userId'))
  user.isActive = false
  await user.save()
  void recordAdminAudit(req, {
    action: 'user.deactivate',
    targetType: 'user',
    targetId: String(user._id),
    targetLabel: user.email,
    summary: `Deactivated app user ${user.email}`,
    notify: true,
    notifyPriority: 'high',
    href: '/users',
  })
  res.json({ success: true, data: { user: publicUser(user) } })
})

export const activateUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserOr404(param(req, 'userId'))
  user.isActive = true
  await user.save()
  void recordAdminAudit(req, {
    action: 'user.activate',
    targetType: 'user',
    targetId: String(user._id),
    targetLabel: user.email,
    summary: `Activated app user ${user.email}`,
    notify: true,
    href: '/users',
  })
  res.json({ success: true, data: { user: publicUser(user) } })
})

export const resetUserPassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email } = req.body as { email: string }
  const user = await User.findOne({ email }).select('+password')
  if (!user) throw new AppError('User not found', 404)

  const tempPassword = `${crypto.randomBytes(4).toString('hex')}Aa1!`
  user.password = tempPassword
  await user.save()

  void recordAdminAudit(req, {
    action: 'user.reset_password',
    targetType: 'user',
    targetId: String(user._id),
    targetLabel: user.email,
    summary: `Reset password for ${user.email}`,
    notify: true,
    notifyPriority: 'high',
    href: '/users',
  })

  res.json({
    success: true,
    data: {
      temporaryPassword: tempPassword,
    },
  })
})

export const changeUserRole = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = param(req, 'userId')
  const { newRole } = req.body as { newRole: UserSystemRole }
  const user = await getUserOr404(userId)

  user.systemRole = newRole
  await user.save()

  void recordAdminAudit(req, {
    action: 'user.role',
    targetType: 'user',
    targetId: String(user._id),
    targetLabel: user.email,
    summary: `Changed role for ${user.email} to ${newRole}`,
    metadata: { newRole },
    notify: true,
    notifyPriority: 'high',
    href: '/users',
  })

  res.json({
    success: true,
    message: `User role changed to ${newRole} successfully`,
    data: {
      user: publicUser(user),
      newRole,
    },
  })
})

export const addUserWithEmail = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { username, email, password, role } = req.body as {
    username: string
    email: string
    password: string
    role: 'super_admin' | 'admin' | 'moderator' | 'viewer'
  }

  const existingAdmin = await Admin.findOne({ userEmail: email })
  if (existingAdmin) throw new AppError('Admin user with this email already exists', 400)

  const adminUser = await Admin.create({
    userEmail: email,
    userName: username,
    password,
    role,
    isActive: true,
    createdBy: req.user!.sub,
  })

  void recordAdminAudit(req, {
    action: 'admin.create',
    targetType: 'admin',
    targetId: String(adminUser._id),
    targetLabel: adminUser.userEmail,
    summary: `Created staff admin ${adminUser.userEmail}`,
    metadata: { role },
    notify: true,
    notifyPriority: 'high',
    href: '/users',
  })

  res.status(201).json({
    success: true,
    data: {
      adminUser: {
        id: adminUser._id,
        email: adminUser.userEmail,
        username: adminUser.userName,
        role: adminUser.role,
        isActive: adminUser.isActive,
        createdAt: adminUser.createdAt,
      },
    },
  })
})

export const addAdminUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email, password, role } = req.body as {
    email: string
    password: string
    role: 'super_admin' | 'admin' | 'moderator' | 'viewer'
  }

  const existingAdmin = await Admin.findOne({ userEmail: email })
  if (existingAdmin) throw new AppError('Admin user with this email already exists', 400)

  const admin = await Admin.create({
    userEmail: email,
    userName: email.split('@')[0],
    password,
    role,
    isActive: true,
    createdBy: req.user!.sub,
  })

  void recordAdminAudit(req, {
    action: 'admin.create',
    targetType: 'admin',
    targetId: String(admin._id),
    targetLabel: admin.userEmail,
    summary: `Created staff admin ${admin.userEmail}`,
    metadata: { role },
    notify: true,
    notifyPriority: 'high',
    href: '/settings',
  })

  res.status(201).json({
    success: true,
    data: {
      admin: {
        id: admin._id,
        email: admin.userEmail,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
      },
    },
  })
})

export const getAvailableRoles = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await loadCurrentAdmin(req)
  let availableRoles: string[] = []

  if (admin.role === 'super_admin') availableRoles = ['admin', 'super_admin', 'moderator', 'viewer']
  else if (admin.role === 'admin') availableRoles = ['admin', 'moderator', 'viewer']
  else if (admin.role === 'moderator') availableRoles = ['moderator', 'viewer']

  res.json({
    success: true,
    data: {
      availableRoles,
      userRole: admin.role,
    },
  })
})

function publicAdmin(admin: any) {
  return {
    id: admin._id,
    userId: null,
    name: admin.userName,
    email: admin.userEmail,
    role: admin.role,
    avatar: admin.avatar ?? null,
    firstName: admin.firstName ?? null,
    lastName: admin.lastName ?? null,
    phoneNumber: admin.phoneNumber ?? null,
    notes: admin.notes ?? null,
    isActive: admin.isActive,
    hasTwoFactorAuth: admin.hasTwoFactorAuth,
    lastActivity: admin.lastLoginAt ?? null,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  }
}

function buildAdminToken(admin: any, expiresIn?: string) {
  return signAccessToken(
    {
      sub: admin._id.toString(),
      type: 'admin',
      email: admin.userEmail,
      name: admin.userName,
      role: admin.role,
    },
    expiresIn,
  )
}

export const login = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { email, password, rememberMe } = req.body as {
    email: string
    password: string
    rememberMe?: boolean
  }

  const admin = await Admin.findOne({ userEmail: email, isActive: true }).select('+password')
  if (!admin) throw new AppError('Invalid credentials', 401)

  const ok = await admin.comparePassword(password)
  if (!ok) throw new AppError('Invalid credentials', 401)

  if (admin.hasTwoFactorAuth) {
    res.json({
      success: true,
      data: {
        requires2FA: true,
        userId: admin._id,
        message: 'Two-factor authentication is required. Please enter your 6-digit code.',
        sessionId: `admin-${Date.now()}`,
      },
    })
    return
  }

  admin.lastLoginAt = new Date()
  await admin.save()

  res.json({
    success: true,
    data: {
      admin: publicAdmin(admin),
      token: buildAdminToken(admin, rememberMe ? '30d' : '7d'),
    },
  })
})

export const completeLoginWith2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { userId, token, rememberMe } = req.body as {
    userId: string
    token: string
    rememberMe?: boolean
  }

  const admin = await Admin.findById(userId).select(
    '+password +twoFactorAuth.secret +twoFactorAuth.backupCodes.code',
  )
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)
  if (!admin.hasTwoFactorAuth || !admin.twoFactorAuth?.secret) {
    throw new AppError('2FA is not enabled for this admin', 400)
  }

  const totpOk = twoFactorAuthService.verifyToken(token, admin.twoFactorAuth.secret)
  let usedBackup = false

  if (!totpOk) {
    const backup = (admin.twoFactorAuth.backupCodes ?? []).find(
      (entry) => entry.code === token.toUpperCase() && !entry.used,
    )
    if (!backup) throw new AppError('Invalid 2FA token', 401)
    backup.used = true
    backup.usedAt = new Date()
    usedBackup = true
  }

  admin.twoFactorAuth.lastUsed = new Date()
  admin.lastLoginAt = new Date()
  await admin.save()

  res.json({
    success: true,
    data: {
      admin: publicAdmin(admin),
      token: buildAdminToken(admin, rememberMe ? '30d' : '7d'),
      usedBackupCode: usedBackup,
    },
  })
})

export const getSetupStatus = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const count = await Admin.countDocuments()
  res.json({ success: true, data: { needsSetup: count === 0 } })
})

export const setupFirstAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const count = await Admin.countDocuments()
  if (count > 0) throw new AppError('First admin already exists', 403)

  const { userName, userEmail, password } = req.body as {
    userName: string
    userEmail: string
    password: string
  }

  const admin = await Admin.create({
    userName,
    userEmail,
    password,
    role: 'super_admin',
    isActive: true,
    isEmailVerified: true,
  })

  res.status(201).json({
    success: true,
    data: {
      admin: publicAdmin(admin),
      token: buildAdminToken(admin),
    },
  })
})

export const logout = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  res.json({ success: true })
})

export const getCurrentAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await loadCurrentAdmin(req)
  res.json({ success: true, data: { admin: publicAdmin(admin) } })
})

export const changePassword = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string
    newPassword: string
  }
  const admin = await Admin.findById(req.user!.sub).select('+password')
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)

  const ok = await admin.comparePassword(currentPassword)
  if (!ok) throw new AppError('Current password is incorrect', 400)

  admin.password = newPassword
  await admin.save()
  res.json({ success: true, message: 'Password changed successfully' })
})

export const updateProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await loadCurrentAdmin(req)
  const body = req.body as {
    userName?: string
    firstName?: string | null
    lastName?: string | null
    phoneNumber?: string | null
    notes?: string | null
  }

  if (body.userName !== undefined) {
    const exists = await Admin.findOne({ userName: body.userName, _id: { $ne: admin._id } })
    if (exists) throw new AppError('Username already taken', 409)
    admin.userName = body.userName
  }
  if (body.firstName !== undefined) admin.firstName = body.firstName
  if (body.lastName !== undefined) admin.lastName = body.lastName
  if (body.phoneNumber !== undefined) admin.phoneNumber = body.phoneNumber
  if (body.notes !== undefined) admin.notes = body.notes

  await admin.save()
  res.json({ success: true, data: { admin: publicAdmin(admin) } })
})

export const uploadAvatar = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) throw new AppError('Avatar file is required', 400)

  const admin = await loadCurrentAdmin(req)
  admin.avatar = `/uploads/avatars/${file.filename}`
  await admin.save()

  res.json({ success: true, data: { admin: publicAdmin(admin) } })
})

export const get2FAStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await loadCurrentAdmin(req)
  res.json({
    success: true,
    data: {
      enabled: admin.hasTwoFactorAuth,
      enabledAt: admin.twoFactorAuth?.enabledAt ?? null,
      lastUsed: admin.twoFactorAuth?.lastUsed ?? null,
    },
  })
})

export const enable2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await Admin.findById(req.user!.sub).select('+twoFactorAuth.secret')
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)
  if (admin.hasTwoFactorAuth) throw new AppError('2FA is already enabled', 400)

  const generated = await twoFactorAuthService.generateSecret(admin.userEmail, 'TaskFlow Admin')
  admin.twoFactorAuth = {
    ...(admin.twoFactorAuth ?? { backupCodes: [] }),
    secret: generated.secret,
    backupCodes: admin.twoFactorAuth?.backupCodes ?? [],
  }
  await admin.save()

  res.json({
    success: true,
    data: {
      secret: generated.secret,
      otpauthUrl: generated.otpauthUrl,
      qrCode: generated.qrCode,
    },
  })
})

export const verify2FASetup = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { token } = req.body as { token: string }
  const admin = await Admin.findById(req.user!.sub).select(
    '+twoFactorAuth.secret +twoFactorAuth.backupCodes.code',
  )
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)
  if (!admin.twoFactorAuth?.secret) throw new AppError('2FA setup has not been started', 400)

  const ok = twoFactorAuthService.verifyToken(token, admin.twoFactorAuth.secret)
  if (!ok) throw new AppError('Invalid verification code', 400)

  const codes = twoFactorAuthService.generateBackupCodes()
  admin.hasTwoFactorAuth = true
  admin.twoFactorAuth.enabledAt = new Date()
  admin.twoFactorAuth.backupCodes = codes.map((code) => ({ code, used: false, usedAt: null }))
  await admin.save()

  res.json({
    success: true,
    data: {
      enabled: true,
      backupCodes: codes,
    },
  })
})

export const disable2FA = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { password, token } = req.body as { password: string; token?: string }
  const admin = await Admin.findById(req.user!.sub).select(
    '+password +twoFactorAuth.secret +twoFactorAuth.backupCodes.code',
  )
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)

  const passwordOk = await admin.comparePassword(password)
  if (!passwordOk) throw new AppError('Password is incorrect', 400)

  if (admin.hasTwoFactorAuth && admin.twoFactorAuth?.secret) {
    if (!token) throw new AppError('2FA token is required', 400)
    const totpOk = twoFactorAuthService.verifyToken(token, admin.twoFactorAuth.secret)
    if (!totpOk) throw new AppError('Invalid 2FA token', 400)
  }

  admin.hasTwoFactorAuth = false
  admin.twoFactorAuth = {
    secret: undefined,
    backupCodes: [],
    recoveryToken: null,
    recoveryTokenExpires: null,
    enabledAt: null,
    lastUsed: null,
  }
  await admin.save()

  res.json({ success: true, message: '2FA disabled successfully' })
})

export const generateBackupCodes = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await Admin.findById(req.user!.sub).select('+twoFactorAuth.backupCodes.code')
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)
  if (!admin.hasTwoFactorAuth) throw new AppError('2FA is not enabled', 400)

  const codes = twoFactorAuthService.generateBackupCodes()
  admin.twoFactorAuth.backupCodes = codes.map((code) => ({ code, used: false, usedAt: null }))
  await admin.save()

  res.json({ success: true, data: { backupCodes: codes } })
})

export const generateRecoveryToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await Admin.findById(req.user!.sub).select('+twoFactorAuth.recoveryToken')
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)
  if (!admin.hasTwoFactorAuth) throw new AppError('2FA is not enabled', 400)

  const { token, expiresAt } = twoFactorAuthService.generateRecoveryToken()
  admin.twoFactorAuth.recoveryToken = token
  admin.twoFactorAuth.recoveryTokenExpires = expiresAt
  await admin.save()

  res.json({ success: true, data: { recoveryToken: token, expiresAt } })
})

export const getAnalytics = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req as any).validatedQuery ?? req.query
  const timeRange = ((q as any).timeRange as AdminAnalyticsTimeRange | undefined) ?? '6-months'
  const analyticsData = await buildAdminAnalyticsSnapshot(timeRange)
  res.json({ success: true, data: analyticsData })
})

export const exportAnalytics = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req as any).validatedQuery ?? req.query
  const format = ((q as any).format as 'json' | 'csv' | undefined) ?? 'json'
  const timeRange = ((q as any).timeRange as AdminAnalyticsTimeRange | undefined) ?? '6-months'
  const analyticsData = await buildAdminAnalyticsSnapshot(timeRange)

  if (format === 'csv') {
    const headers = [
      'timeRange',
      'totalUsers',
      'dailyActiveUsers',
      'weeklyActiveUsers',
      'monthlyActiveUsers',
      'activeProjects',
      'totalWorkspaces',
      'completionRate',
      'pendingTasks',
      'inProgressTasks',
      'completedTasks',
    ]
    const row = [
      analyticsData.timeRange,
      analyticsData.totalUsers,
      analyticsData.activeUsers.daily,
      analyticsData.activeUsers.weekly,
      analyticsData.activeUsers.monthly,
      analyticsData.activeProjects,
      analyticsData.totalWorkspaces,
      analyticsData.completionRate,
      analyticsData.taskCompletionData.pending,
      analyticsData.taskCompletionData.inProgress,
      analyticsData.taskCompletionData.completed,
    ]
    const seriesHeader = ['series', 'date', 'signups', 'projects']
    const seriesRows = analyticsData.userGrowthData.map((point, index) =>
      [
        'series',
        point.date,
        point.signups,
        analyticsData.projectCreationTrends[index]?.projects ?? 0,
      ].join(','),
    )
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=admin-analytics-${timeRange}.csv`)
    res.status(200).send(
      [[headers.join(','), row.join(',')].join('\n'), seriesHeader.join(','), ...seriesRows].join('\n'),
    )
    return
  }

  res.json({ success: true, data: analyticsData })
})

function roundMb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100
}

export const getSystemHealth = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const mem = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const connected = mongoose.connection.readyState === 1
  const pingStarted = Date.now()
  let pingMs: number | null = null
  let dbError: string | null = null

  try {
    if (connected && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping()
      pingMs = Date.now() - pingStarted
    }
  } catch (error) {
    pingMs = Date.now() - pingStarted
    dbError = error instanceof Error ? error.message : 'Database ping failed'
  }

  const healthy = connected && !dbError

  res.json({
    success: true,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      systemPerformance: {
        serverUptime: process.uptime(),
        memoryRssMb: roundMb(mem.rss),
        memoryHeapUsedMb: roundMb(mem.heapUsed),
        memoryHeapTotalMb: roundMb(mem.heapTotal),
        memoryTotalMb: roundMb(totalMem),
        memoryFreeMb: roundMb(freeMem),
        memoryUsedPct: totalMem > 0 ? Math.round((usedMem / totalMem) * 1000) / 10 : 0,
        cpuCores: os.cpus().length,
        loadAverage: os.loadavg(),
        platform: os.platform(),
        nodeVersion: process.version,
        nodeEnv: env.NODE_ENV,
      },
      database: {
        connection: connected ? 'Connected' : 'Disconnected',
        readyState: mongoose.connection.readyState,
        pingMs,
        error: dbError,
      },
      features: {
        stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
        smtpEnabled: env.SMTP_ENABLED,
        defaultAiProvider: env.DEFAULT_AI_PROVIDER,
      },
      checkedAt: new Date().toISOString(),
    },
  })
})

function mapAdminTemplate(doc: any) {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    type: doc.type,
    category: doc.category,
    tags: doc.tags,
    status: doc.status,
    isPublic: doc.isPublic,
    isSystem: doc.isSystem,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export const getProjectTemplates = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const templates = await Template.find({ type: { $in: ['space', 'board', 'workflow'] } }).sort({
    createdAt: -1,
  })
  res.json({ success: true, data: { templates: templates.map(mapAdminTemplate) } })
})

export const createProjectTemplate = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body as {
    name: string
    description?: string
    content: unknown
    category?: string
    tags?: string[]
    isPublic?: boolean
  }

  const template = await Template.create({
    name: body.name,
    description: body.description ?? '',
    type: 'space',
    content: body.content,
    createdBy: req.user!.sub,
    category: (body.category as any) ?? 'General',
    tags: body.tags ?? [],
    isPublic: body.isPublic ?? false,
    isSystem: true,
    status: 'active',
  })

  void recordAdminAudit(req, {
    action: 'template.create',
    targetType: 'template',
    targetId: String(template._id),
    targetLabel: template.name,
    summary: `Created template ${template.name}`,
    href: '/templates',
  })

  res.status(201).json({ success: true, data: { template: mapAdminTemplate(template) } })
})

export const updateProjectTemplate = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const template = await Template.findById(param(req, 'templateId'))
  if (!template) throw new AppError('Template not found', 404)

  const body = req.body as Record<string, unknown>
  if (body.name !== undefined) template.name = body.name as string
  if (body.description !== undefined) template.description = body.description as string
  if (body.content !== undefined) template.content = body.content
  if (body.category !== undefined) template.category = body.category as any
  if (body.tags !== undefined) template.tags = body.tags as string[]
  if (body.isPublic !== undefined) template.isPublic = body.isPublic as boolean

  await template.save()
  void recordAdminAudit(req, {
    action: 'template.update',
    targetType: 'template',
    targetId: String(template._id),
    targetLabel: template.name,
    summary: `Updated template ${template.name}`,
    href: '/templates',
  })
  res.json({ success: true, data: { template: mapAdminTemplate(template) } })
})

export const deleteProjectTemplate = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const template = await Template.findById(param(req, 'templateId'))
  if (!template) throw new AppError('Template not found', 404)
  const name = template.name
  const id = String(template._id)
  await template.deleteOne()
  void recordAdminAudit(req, {
    action: 'template.delete',
    targetType: 'template',
    targetId: id,
    targetLabel: name,
    summary: `Deleted template ${name}`,
    notify: true,
    notifyPriority: 'high',
    href: '/templates',
  })
  res.json({ success: true })
})

export const getTaskTemplates = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const templates = await Template.find({ type: 'task' }).sort({ createdAt: -1 })
  res.json({ success: true, data: { templates: templates.map(mapAdminTemplate) } })
})

export const getAIPrompts = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const templates = await Template.find({
    $or: [{ type: 'workflow' }, { tags: { $in: ['ai', 'prompt'] } }],
  }).sort({ createdAt: -1 })
  res.json({ success: true, data: { prompts: templates.map(mapAdminTemplate) } })
})

export const getBrandingAssets = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      assets: [
        { key: 'logo', url: null, label: 'Primary logo' },
        { key: 'favicon', url: null, label: 'Favicon' },
        { key: 'ogImage', url: null, label: 'Open Graph image' },
      ],
    },
  })
})

