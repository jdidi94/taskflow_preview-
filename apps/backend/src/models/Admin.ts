import bcrypt from 'bcryptjs'
import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer'

export interface IAdminTwoFactorBackupCode {
  code: string
  used: boolean
  usedAt?: Date | null
}

export interface IAdminTwoFactorAuth {
  secret?: string
  backupCodes: IAdminTwoFactorBackupCode[]
  recoveryToken?: string | null
  recoveryTokenExpires?: Date | null
  enabledAt?: Date | null
  lastUsed?: Date | null
}

export interface IAdmin extends Document {
  userName: string
  userEmail: string
  password: string
  role: AdminRole
  createdAt: Date
  updatedAt: Date
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  notes?: string | null
  avatar?: string | null
  createdBy?: Types.ObjectId | null
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt: Date | null
  hasTwoFactorAuth: boolean
  twoFactorAuth: IAdminTwoFactorAuth
  comparePassword(candidate: string): Promise<boolean>
}

const adminSchema = new Schema<IAdmin>(
  {
    userName: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
    userEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'moderator', 'viewer'],
      default: 'admin',
      required: true,
    },
    firstName: { type: String, trim: true, maxlength: 50, default: null },
    lastName: { type: String, trim: true, maxlength: 50, default: null },
    phoneNumber: { type: String, trim: true, maxlength: 30, default: null },
    notes: { type: String, trim: true, maxlength: 500, default: null },
    avatar: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    hasTwoFactorAuth: { type: Boolean, default: false },
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
  },
  { timestamps: true },
)

adminSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return
  }
  this.password = await bcrypt.hash(this.password, 12)
})

adminSchema.methods.comparePassword = async function comparePassword(
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

export const Admin: Model<IAdmin> =
  mongoose.models.Admin ?? mongoose.model<IAdmin>('Admin', adminSchema)
