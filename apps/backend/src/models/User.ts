import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import mongoose, { type Document, type Model, Schema } from 'mongoose'

export type UserSystemRole = 'super_admin' | 'admin' | 'moderator' | 'user' | 'viewer'

export interface IUserTwoFactorBackupCode {
  code: string
  used: boolean
  usedAt?: Date | null
}

export interface IUserTwoFactorAuth {
  secret?: string
  backupCodes: IUserTwoFactorBackupCode[]
  recoveryToken?: string | null
  recoveryTokenExpires?: Date | null
  enabledAt?: Date | null
  lastUsed?: Date | null
}

export interface IUserTempTokens {
  emailVerificationToken?: string | null
  emailVerificationExpires?: Date | null
  passwordResetToken?: string | null
  passwordResetExpires?: Date | null
}

export interface IUserGithubIntegration {
  accessToken?: string | null
  githubId?: string | null
  username?: string | null
  avatar?: string | null
  email?: string | null
  scope?: string | null
  tokenType?: string | null
  linked?: boolean
  tokenValid?: boolean
  lastSync?: Date | null
}

export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'enterprise'
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled'
export type SubscriptionBillingCycle = 'monthly' | 'yearly'

export interface IUserSubscription {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  billingCycle: SubscriptionBillingCycle | null
  startDate: Date | null
  nextBillingDate: Date | null
  lastPaymentDate: Date | null
  paymentSessionId: string | null
  lastUpdated: Date | null
}

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  systemRole: UserSystemRole
  createdAt: Date
  updatedAt: Date
  avatar: string | null
  isActive: boolean
  emailVerified: boolean
  lastLogin: Date | null
  hasOAuthProviders: boolean
  hasTwoFactorAuth: boolean
  googleId: string | null
  githubId: string | null
  github?: IUserGithubIntegration
  oauthProviders: Array<'github' | 'google'>
  twoFactorAuth: IUserTwoFactorAuth
  tempTokens: IUserTempTokens
  subscription: IUserSubscription
  comparePassword(candidate: string): Promise<boolean>
  generatePasswordResetToken(): string
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, minlength: 8, select: false },
    systemRole: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator', 'user', 'viewer'],
      default: 'user',
    },
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
    hasOAuthProviders: { type: Boolean, default: false },
    hasTwoFactorAuth: { type: Boolean, default: false },
    googleId: { type: String, default: null },
    githubId: { type: String, default: null },
    github: {
      accessToken: { type: String, default: null, select: false },
      githubId: { type: String, default: null },
      username: { type: String, default: null },
      avatar: { type: String, default: null },
      email: { type: String, default: null },
      scope: { type: String, default: null },
      tokenType: { type: String, default: null },
      linked: { type: Boolean, default: false },
      tokenValid: { type: Boolean, default: false },
      lastSync: { type: Date, default: null },
    },
    oauthProviders: [
      {
        type: String,
        enum: ['github', 'google'],
      },
    ],
    twoFactorAuth: {
      secret: { type: String, select: false },
      backupCodes: [
        {
          code: { type: String, select: false },
          used: { type: Boolean, default: false },
          usedAt: { type: Date, default: null },
        },
      ],
      recoveryToken: { type: String, select: false, default: null },
      recoveryTokenExpires: { type: Date, default: null },
      enabledAt: { type: Date, default: null },
      lastUsed: { type: Date, default: null },
    },
    tempTokens: {
      emailVerificationToken: { type: String, default: null },
      emailVerificationExpires: { type: Date, default: null },
      passwordResetToken: { type: String, default: null },
      passwordResetExpires: { type: Date, default: null },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['inactive', 'active', 'past_due', 'canceled'],
        default: 'inactive',
      },
      billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        default: null,
      },
      startDate: { type: Date, default: null },
      nextBillingDate: { type: Date, default: null },
      lastPaymentDate: { type: Date, default: null },
      paymentSessionId: { type: String, default: null },
      lastUpdated: { type: Date, default: null },
    },
  },
  { timestamps: true },
)

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) {
    return
  }
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = async function comparePassword(
  candidate: string,
): Promise<boolean> {
  if (!this.password) return false
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.generatePasswordResetToken = function generatePasswordResetToken(): string {
  const token = crypto.randomBytes(32).toString('hex')
  this.tempTokens = this.tempTokens ?? {}
  this.tempTokens.passwordResetToken = token
  this.tempTokens.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
  return token
}

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', userSchema)
