import crypto from 'node:crypto'
import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type InvitationEntityType = 'Workspace' | 'Space' | 'Board'
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
export type InvitationRole = 'viewer' | 'member' | 'contributor' | 'admin' | 'owner'

export interface IInvitation extends Document {
  type: 'workspace' | 'space' | 'board'
  invitedBy: Types.ObjectId
  invitedUser: {
    email?: string
    name?: string
    userId?: Types.ObjectId | null
  }
  targetEntity: {
    type: InvitationEntityType
    id: Types.ObjectId
    name?: string
  }
  role: InvitationRole
  token: string
  status: InvitationStatus
  message?: string
  expiresAt: Date
  acceptedAt: Date | null
  declinedAt: Date | null
  metadata: {
    inviteUrl?: string
    invitationMethod?: 'email' | 'link' | 'bulk' | 'api'
  }

  isExpired: boolean
  accept(userId?: string | Types.ObjectId | null): Promise<this>
  decline(): Promise<this>
  cancel(): Promise<this>
}

interface InvitationModel extends Model<IInvitation> {
  findByToken(token: string): Promise<IInvitation | null>
}

const invitationSchema = new Schema<IInvitation, InvitationModel>(
  {
    type: { type: String, enum: ['workspace', 'space', 'board'], required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invitedUser: {
      email: { type: String, lowercase: true, trim: true },
      name: { type: String },
      userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    targetEntity: {
      type: { type: String, enum: ['Workspace', 'Space', 'Board'], required: true },
      id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String },
    },
    role: {
      type: String,
      enum: ['viewer', 'member', 'contributor', 'admin', 'owner'],
      default: 'member',
    },
    token: { type: String, unique: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
      default: 'pending',
    },
    message: { type: String, maxlength: 500 },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    metadata: {
      inviteUrl: { type: String },
      invitationMethod: {
        type: String,
        enum: ['email', 'link', 'bulk', 'api'],
        default: 'email',
      },
    },
  },
  { timestamps: true },
)

invitationSchema.index({ 'invitedUser.email': 1 })
invitationSchema.index({ 'invitedUser.userId': 1 })
invitationSchema.index({ invitedBy: 1 })
invitationSchema.index({ 'targetEntity.type': 1, 'targetEntity.id': 1 })
invitationSchema.index({ status: 1 })
invitationSchema.index({ expiresAt: 1 })

invitationSchema.virtual('isExpired').get(function isExpired(this: IInvitation) {
  return this.expiresAt < new Date()
})

invitationSchema.pre('save', function generateToken() {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex')
  }
})

invitationSchema.methods.accept = async function accept(userId?: string | Types.ObjectId | null) {
  if (this.expiresAt < new Date()) throw new Error('Invitation has expired')
  if (this.status !== 'pending') throw new Error('Invitation is no longer pending')

  this.status = 'accepted'
  this.acceptedAt = new Date()
  if (userId && !this.invitedUser.userId) {
    this.invitedUser.userId = new Types.ObjectId(String(userId))
  }
  return this.save()
}

invitationSchema.methods.decline = async function decline() {
  if (this.status !== 'pending') throw new Error('Invitation is no longer pending')
  this.status = 'declined'
  this.declinedAt = new Date()
  return this.save()
}

invitationSchema.methods.cancel = async function cancel() {
  if (this.status === 'accepted') throw new Error('Cannot cancel accepted invitation')
  this.status = 'cancelled'
  return this.save()
}

invitationSchema.statics.findByToken = function findByToken(token: string) {
  return this.findOne({ token })
}

export const Invitation: InvitationModel =
  (mongoose.models.Invitation as InvitationModel) ??
  mongoose.model<IInvitation, InvitationModel>('Invitation', invitationSchema)
