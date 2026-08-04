import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'
import { randomBytes } from 'crypto'

export type DeviceType = 'web' | 'mobile' | 'desktop'

export interface ISessionDeviceInfo {
  type: DeviceType
  os?: string
  browser?: string
  version?: string
  userAgent?: string
}

export interface ISessionLocation {
  country?: string
  city?: string
  timezone?: string
  coordinates?: {
    lat?: number
    lng?: number
  }
}

export interface ISuspiciousActivity {
  type: 'unknown_device' | 'unusual_location' | 'multiple_logins' | 'failed_attempts'
  description?: string
  ipAddress?: string
  deviceInfo?: unknown
  timestamp: Date
  severity?: 'low' | 'medium' | 'high'
  resolved?: boolean
}

export interface ITrustedDevice {
  deviceId: string
  name?: string
  addedAt: Date
}

export interface ILoginHistoryEntry {
  timestamp: Date
  success: boolean
  ipAddress?: string
  deviceInfo?: unknown
  failureReason?: string
}

export interface IUserSession {
  sessionId: string
  deviceId: string
  deviceInfo: ISessionDeviceInfo
  ipAddress: string
  location?: ISessionLocation
  isActive: boolean
  loginAt: Date
  lastActivityAt: Date
  logoutAt: Date | null
  tokenVersion: number
  rememberMe: boolean
}

export interface IUserSessionsDoc extends Document {
  userId: Types.ObjectId
  sessions: IUserSession[]
  security?: {
    suspiciousActivities?: ISuspiciousActivity[]
    trustedDevices?: ITrustedDevice[]
    loginHistory?: ILoginHistoryEntry[]
  }

  createSession(sessionData: {
    deviceId?: string
    deviceInfo?: Partial<ISessionDeviceInfo>
    ipAddress?: string
    location?: ISessionLocation
    rememberMe?: boolean
  }): Promise<IUserSession>

  endSession(sessionId: string): Promise<boolean>

  endAllSessions(): Promise<this>

  activateSession(sessionId: string): Promise<IUserSession | null>
}

const sessionDeviceInfoSchema = new Schema<ISessionDeviceInfo>(
  {
    type: { type: String, enum: ['web', 'mobile', 'desktop'], required: true },
    os: { type: String, default: undefined },
    browser: { type: String, default: undefined },
    version: { type: String, default: undefined },
    userAgent: { type: String, default: undefined },
  },
  { _id: false },
)

const sessionLocationSchema = new Schema<ISessionLocation>(
  {
    country: { type: String, default: undefined },
    city: { type: String, default: undefined },
    timezone: { type: String, default: undefined },
    coordinates: {
      lat: { type: Number, default: undefined },
      lng: { type: Number, default: undefined },
    },
  },
  { _id: false },
)

const suspiciousActivitySchema = new Schema<ISuspiciousActivity>(
  {
    type: {
      type: String,
      enum: ['unknown_device', 'unusual_location', 'multiple_logins', 'failed_attempts'],
      required: true,
    },
    description: { type: String, default: undefined },
    ipAddress: { type: String, default: undefined },
    deviceInfo: { type: Schema.Types.Mixed, default: undefined },
    timestamp: { type: Date, default: Date.now },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    resolved: { type: Boolean, default: false },
  },
  { _id: false },
)

const trustedDeviceSchema = new Schema<ITrustedDevice>(
  {
    deviceId: { type: String, required: true },
    name: { type: String, default: undefined },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const loginHistorySchema = new Schema<ILoginHistoryEntry>(
  {
    timestamp: { type: Date, default: Date.now },
    success: { type: Boolean, required: true },
    ipAddress: { type: String, default: undefined },
    deviceInfo: { type: Schema.Types.Mixed, default: undefined },
    failureReason: { type: String, default: undefined },
  },
  { _id: false },
)

const sessionSchema = new Schema<IUserSession>(
  {
    sessionId: { type: String, required: true },
    deviceId: { type: String, required: true },
    deviceInfo: { type: sessionDeviceInfoSchema, required: true },
    ipAddress: { type: String, required: true },
    location: { type: sessionLocationSchema, default: undefined },
    isActive: { type: Boolean, default: true },
    loginAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 1 },
    rememberMe: { type: Boolean, default: false },
  },
  { _id: false },
)

const userSessionsSchema = new Schema<IUserSessionsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessions: { type: [sessionSchema], default: [] },
    security: {
      suspiciousActivities: { type: [suspiciousActivitySchema], default: undefined },
      trustedDevices: { type: [trustedDeviceSchema], default: undefined },
      loginHistory: { type: [loginHistorySchema], default: undefined },
    },
  },
  { timestamps: true },
)

// Indexes for efficient queries + uniqueness of sessionId inside sessions array.
userSessionsSchema.index(
  { 'sessions.sessionId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'sessions.sessionId': { $ne: null } },
  },
)
userSessionsSchema.index({ 'sessions.isActive': 1 })
userSessionsSchema.index({ 'sessions.lastActivityAt': -1 })

userSessionsSchema.methods.createSession = async function createSession(
  sessionData: {
    deviceId?: string
    deviceInfo?: Partial<ISessionDeviceInfo>
    ipAddress?: string
    location?: ISessionLocation
    rememberMe?: boolean
  },
) {
  // Defaulting matches the v2 shape.
  const deviceId = sessionData.deviceId || `web-${Date.now()}`
  const ipAddress = sessionData.ipAddress || '0.0.0.0'
  const deviceInfo: ISessionDeviceInfo = {
    type: (sessionData.deviceInfo?.type as DeviceType | undefined) || 'web',
    os: sessionData.deviceInfo?.os,
    browser: sessionData.deviceInfo?.browser,
    version: sessionData.deviceInfo?.version,
    userAgent: sessionData.deviceInfo?.userAgent,
  }

  // End any existing active sessions for the same device.
  const existingSessionIndex = this.sessions.findIndex(
    (session: IUserSession) => session.deviceId === deviceId && session.isActive,
  )
  if (existingSessionIndex !== -1) {
    this.sessions[existingSessionIndex].isActive = false
    this.sessions[existingSessionIndex].logoutAt = new Date()
  }

  let sessionId: string | null = null
  const maxAttempts = 5

  // Generate a unique sessionId, retrying on collisions.
  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const candidateId = randomBytes(32).toString('hex')
    if (!candidateId) continue

    const SessionsModel = this.constructor as any
    const existing = await SessionsModel.findOne({ 'sessions.sessionId': candidateId }).select('_id')
    if (!existing) {
      sessionId = candidateId
      break
    }
  }

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}-${randomBytes(16).toString('hex')}`
  }

  const newSession: IUserSession = {
    sessionId,
    deviceId,
    deviceInfo,
    ipAddress,
    isActive: true,
    loginAt: new Date(),
    lastActivityAt: new Date(),
    logoutAt: null,
    tokenVersion: 1,
    rememberMe: sessionData.rememberMe || false,
    ...(sessionData.location ? { location: sessionData.location } : {}),
  }

  this.sessions.push(newSession)
  await this.save()
  return newSession
}

userSessionsSchema.methods.endSession = async function endSession(sessionId: string) {
  const session = (this.sessions as IUserSession[]).find((s: IUserSession) => s.sessionId === sessionId)
  if (!session || !session.isActive) return false

  session.isActive = false
  session.logoutAt = new Date()
  session.lastActivityAt = new Date()
  this.markModified('sessions')
  await this.save()
  return true
}

userSessionsSchema.methods.endAllSessions = async function endAllSessions() {
  this.sessions.forEach((session: IUserSession) => {
    if (session.isActive) {
      session.isActive = false
      session.logoutAt = new Date()
      session.lastActivityAt = new Date()
    }
  })

  this.markModified('sessions')
  await this.save()
  return this
}

userSessionsSchema.methods.activateSession = async function activateSession(sessionId: string) {
  const session = (this.sessions as IUserSession[]).find((item) => item.sessionId === sessionId)
  if (!session || !session.isActive) return null

  session.lastActivityAt = new Date()
  this.markModified('sessions')
  await this.save()
  return session
}

export const UserSessions: Model<IUserSessionsDoc> =
  mongoose.models.UserSessions ?? mongoose.model<IUserSessionsDoc>('UserSessions', userSessionsSchema)

