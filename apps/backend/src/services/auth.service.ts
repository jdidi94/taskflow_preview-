import { AppError } from '../utils/AppError.js'
import { signAccessToken } from '../utils/jwt.js'
import { User, type IUser } from '../models/User.js'
import { UserPreferences } from '../models/UserPreferences.js'
import { UserSessions, type ISessionDeviceInfo, type IUserSession } from '../models/UserSessions.js'
import { sendEmail } from './email.service.js'
import { twoFactorAuthService } from './twoFactorAuth.service.js'
import { env } from '../config/env.js'

export interface PublicUser {
  id: string
  email: string
  name: string
  avatar: string | null
  isActive: boolean
  emailVerified: boolean
  lastLogin: Date | null
  preferences?: Record<string, unknown> | null
  activeSessionsCount?: number
  security?: {
    activeSessions: number
    emailVerified: boolean
    twoFactorEnabled: boolean
    lastLogin: Date | null
    hasOAuthProviders: boolean
  }
}

export interface AuthResult {
  token: string
  user: PublicUser
}

export interface TwoFactorPendingLoginResult {
  requires2FA: true
  userId: string
  sessionId: string
  rememberMe: boolean
  message: string
}

export type LoginResult = AuthResult | TwoFactorPendingLoginResult

export interface RegisterInput {
  name: string
  email: string
  password: string
  deviceId?: string
  deviceInfo?: Partial<ISessionDeviceInfo>
}

export interface LoginInput {
  email: string
  password: string
  rememberMe?: boolean
  deviceId?: string
  deviceInfo?: Partial<ISessionDeviceInfo>
}

export interface UpdateProfileInput {
  name?: string
  avatar?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface CompleteLogin2FAInput {
  userId: string
  token: string
  sessionId: string
  rememberMe?: boolean
  rememberDevice?: boolean
}

export interface PasswordResetConfirmInput {
  token: string
  newPassword: string
}

export interface UpdatePreferencesInput {
  section?: string
  subsection?: string
  updates?: Record<string, unknown>
  [key: string]: unknown
}

function toPublicUser(user: {
  _id: { toString(): string }
  email: string
  name: string
  systemRole?: string
  avatar: string | null
  isActive: boolean
  emailVerified: boolean
  lastLogin: Date | null
}): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    avatar: user.avatar ?? null,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin ?? null,
  }
}

function toPreferencesPayload(doc: any): Record<string, unknown> | null {
  if (!doc) return null
  const { theme, notifications, ai, dashboard, connectedApps, privacy } = doc
  return { theme, notifications, ai, dashboard, connectedApps, privacy }
}

function isDuplicateEmailError(err: unknown): boolean {
  const anyErr = err as any
  return anyErr && typeof anyErr === 'object' && anyErr.code === 11000
}

function buildTokenForUser(user: IUser, expiresIn?: string) {
  return signAccessToken(
    {
      sub: user._id.toString(),
      type: 'user',
      email: user.email,
      name: user.name,
      role: user.systemRole ?? 'user',
    },
    expiresIn,
  )
}

async function getOrCreateSessionsDoc(userId: string | { toString(): string }) {
  const normalizedId = typeof userId === 'string' ? userId : userId.toString()
  return (
    (await UserSessions.findOne({ userId: normalizedId })) ??
    (await UserSessions.create({ userId: normalizedId, sessions: [] }))
  )
}

async function getUserBySub(sub: string) {
  const user = await User.findById(sub)
  if (!user || !user.isActive) {
    throw new AppError('User not found', 401)
  }
  return user
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    try {
      const user = await User.create({
        name: input.name,
        email: input.email,
        password: input.password,
        systemRole: 'user',
      })

      const sessionsDoc = await getOrCreateSessionsDoc(user._id)
      await sessionsDoc.createSession({
        deviceId: input.deviceId,
        deviceInfo: input.deviceInfo,
        rememberMe: false,
      })

      const token = buildTokenForUser(user)
      return { token, user: toPublicUser(user) }
    } catch (err) {
      if (isDuplicateEmailError(err)) {
        throw new AppError('Email is already registered', 409)
      }
      throw err
    }
  },

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await User.findOne({ email: input.email }).select('+password')

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401)
    }

    const ok = await user.comparePassword(input.password)
    if (!ok) {
      throw new AppError('Invalid email or password', 401)
    }

    user.lastLogin = new Date()
    await user.save()

    const sessionsDoc = await getOrCreateSessionsDoc(user._id)
    const session = await sessionsDoc.createSession({
      deviceId: input.deviceId,
      deviceInfo: input.deviceInfo,
      rememberMe: input.rememberMe ?? false,
    })

    if (user.hasTwoFactorAuth) {
      return {
        requires2FA: true,
        userId: user._id.toString(),
        sessionId: session.sessionId,
        rememberMe: input.rememberMe ?? false,
        message: 'Two-factor authentication is required. Please enter your 6-digit code.',
      }
    }

    const token = buildTokenForUser(user, input.rememberMe ? '30d' : '7d')
    return { token, user: toPublicUser(user) }
  },

  async completeLoginWith2FA(
    input: CompleteLogin2FAInput,
    meta?: { deviceId?: string; userAgent?: string },
  ): Promise<AuthResult & { deviceToken?: string; requiresNewBackupCodes?: boolean }> {
    const user = await User.findById(input.userId).select(
      '+twoFactorAuth.secret +twoFactorAuth.backupCodes.code',
    )
    if (!user || !user.isActive) throw new AppError('User not found', 404)
    if (!user.hasTwoFactorAuth || !user.twoFactorAuth?.secret) {
      throw new AppError('2FA is not enabled for this account', 400)
    }

    const backupCode = user.twoFactorAuth.backupCodes.find(
      (item) => item.code === input.token && !item.used,
    )

    let valid = false
    if (backupCode) {
      backupCode.used = true
      backupCode.usedAt = new Date()
      valid = true
    } else {
      valid = twoFactorAuthService.verifyToken(input.token, user.twoFactorAuth.secret)
    }

    if (!valid) {
      throw new AppError('Invalid verification code', 401)
    }

    user.twoFactorAuth.lastUsed = new Date()
    await user.save()

    const sessionsDoc = await getOrCreateSessionsDoc(user._id)
    const session = await sessionsDoc.activateSession(input.sessionId)
    if (!session) {
      throw new AppError('Invalid session', 400)
    }

    const token = buildTokenForUser(user, input.rememberMe ? '30d' : '7d')
    const remainingBackupCodes = user.twoFactorAuth.backupCodes.filter((item) => !item.used).length
    const deviceToken =
      input.rememberDevice && meta?.deviceId && meta.userAgent
        ? twoFactorAuthService.generateDeviceToken(meta.deviceId, meta.userAgent)
        : undefined

    return {
      token,
      user: toPublicUser(user),
      ...(deviceToken ? { deviceToken } : {}),
      requiresNewBackupCodes: remainingBackupCodes < 3,
    }
  },

  async finalizeOAuthLogin(userId: string) {
    const user = await getUserBySub(userId)
    user.lastLogin = new Date()
    await user.save()
    return buildTokenForUser(user)
  },

  async getMeBySub(sub: string): Promise<PublicUser> {
    const user = await getUserBySub(sub)

    const [preferencesDoc, sessionsDoc] = await Promise.all([
      UserPreferences.findOne({ userId: sub }).lean(),
      UserSessions.findOne({ userId: sub }).lean(),
    ])

    const activeSessionsCount = sessionsDoc?.sessions?.filter((s: IUserSession) => s.isActive)?.length ?? 0
    const security = {
      activeSessions: activeSessionsCount,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.hasTwoFactorAuth,
      lastLogin: user.lastLogin ?? null,
      hasOAuthProviders: user.hasOAuthProviders,
    }

    return {
      ...toPublicUser(user),
      preferences: toPreferencesPayload(preferencesDoc),
      activeSessionsCount,
      security,
    }
  },

  async updateProfile(sub: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await getUserBySub(sub)
    if (input.name !== undefined) user.name = input.name
    if (input.avatar !== undefined) user.avatar = input.avatar
    await user.save()
    return toPublicUser(user)
  },

  async changePassword(sub: string, input: ChangePasswordInput): Promise<{ success: true }> {
    const user = await User.findById(sub).select('+password')
    if (!user || !user.isActive) throw new AppError('User not found', 401)

    const ok = await user.comparePassword(input.currentPassword)
    if (!ok) throw new AppError('Current password is incorrect', 400)

    user.password = input.newPassword
    await user.save()
    return { success: true }
  },

  async requestPasswordReset(email: string): Promise<{ success: true }> {
    const user = await User.findOne({ email, isActive: true })
    if (!user) {
      return { success: true }
    }

    const resetToken = user.generatePasswordResetToken()
    await user.save()

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`
    await sendEmail({
      to: user.email,
      subject: 'TaskFlow password reset',
      html: `<p>Hello ${user.name},</p><p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
      text: `Hello ${user.name}, reset your password here: ${resetUrl}`,
    })

    return { success: true }
  },

  async resetPassword(input: PasswordResetConfirmInput): Promise<{ success: true }> {
    const user = await User.findOne({
      'tempTokens.passwordResetToken': input.token,
      'tempTokens.passwordResetExpires': { $gt: new Date() },
    }).select('+password')

    if (!user || !user.isActive) {
      throw new AppError('Invalid or expired reset token', 400)
    }

    user.password = input.newPassword
    user.tempTokens.passwordResetToken = null
    user.tempTokens.passwordResetExpires = null
    await user.save()

    const sessionsDoc = await getOrCreateSessionsDoc(user._id)
    await sessionsDoc.endAllSessions()
    return { success: true }
  },

  async updatePreferences(sub: string, input: UpdatePreferencesInput): Promise<Record<string, unknown> | null> {
    let prefs = await UserPreferences.findOne({ userId: sub })

    if (!prefs) {
      prefs = await UserPreferences.create({
        userId: sub,
        theme: { mode: 'light', primaryColor: '#3B82F6', sidebarCollapsed: false },
        notifications: { marketing: false },
        ai: {
          enableSuggestions: true,
          enableRiskAnalysis: true,
          enableAutoDescription: false,
          suggestionFrequency: 'realtime',
        },
        dashboard: { defaultView: 'overview', widgets: [] },
        connectedApps: [],
        privacy: {
          profileVisibility: 'team_only',
          showOnlineStatus: true,
          allowDirectMessages: true,
          shareActivityData: false,
        },
      })
    }

    const section = input.section
    const subsection = input.subsection
    const updates = input.updates

    if (section !== undefined) {
      if (updates === undefined) throw new AppError('Invalid preferences update payload', 400)
      if (subsection !== undefined) {
        await prefs.updateNestedSection(section, subsection, updates)
      } else {
        await prefs.updateSection(section, updates)
      }
      await prefs.save()
    } else {
      const directUpdates = Object.entries(input).filter(
        ([k]) => !['section', 'subsection', 'updates'].includes(k),
      )
      for (const [k, v] of directUpdates) {
        if ((prefs as any)[k]) {
          Object.assign((prefs as any)[k], v as Record<string, unknown>)
        } else {
          ;(prefs as any)[k] = v
        }
      }
      await prefs.save()
    }

    const reloaded = await UserPreferences.findById(prefs._id).lean()
    return toPreferencesPayload(reloaded)
  },

  async getSessions(
    sub: string,
    currentDeviceId?: string,
  ): Promise<
    Array<
      Pick<IUserSession, 'deviceId' | 'deviceInfo' | 'ipAddress' | 'loginAt' | 'lastActivityAt'> & {
        isCurrent: boolean
      }
    >
  > {
    const sessionsDoc = await UserSessions.findOne({ userId: sub }).lean()
    if (!sessionsDoc) return []
    return (sessionsDoc.sessions ?? [])
      .filter((s: IUserSession) => s.isActive)
      .map((s: IUserSession) => ({
        deviceId: s.deviceId,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        loginAt: s.loginAt,
        lastActivityAt: s.lastActivityAt,
        isCurrent: Boolean(currentDeviceId && s.deviceId === currentDeviceId),
      }))
  },

  async endSession(sub: string, sessionId: string): Promise<{ success: true }> {
    const sessionsDoc = await UserSessions.findOne({ userId: sub })
    if (!sessionsDoc) throw new AppError('Session not found', 404)

    const ok = await sessionsDoc.endSession(sessionId)
    if (!ok) throw new AppError('Session not found', 404)

    return { success: true }
  },
}

