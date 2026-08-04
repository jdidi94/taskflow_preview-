import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type ChatParticipantModel = 'User' | 'Admin'
export type ChatMessageType = 'text' | 'file' | 'image' | 'system'
export type ChatStatus = 'active' | 'resolved' | 'closed' | 'pending'
export type ChatCategory =
  | 'general'
  | 'technical'
  | 'billing'
  | 'feature_request'
  | 'bug_report'
  | 'other'
export type ChatPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface IChatAttachment {
  filename?: string
  originalName?: string
  mimeType?: string
  size?: number
  url?: string
}

export interface IChatParticipant {
  id: Types.ObjectId
  model: ChatParticipantModel
  name?: string
  email?: string
  avatar?: string | null
  isOnline: boolean
  lastSeen?: Date | null
}

export interface IChatMessage {
  _id?: Types.ObjectId
  sender: {
    id: Types.ObjectId
    model: ChatParticipantModel
    name: string
    avatar?: string | null
  }
  content: string
  messageType: ChatMessageType
  attachments: IChatAttachment[]
  isRead: boolean
  readAt?: Date | null
  metadata?: {
    ipAddress?: string
    userAgent?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface IChat extends Document {
  chatId: string
  createdAt: Date
  updatedAt: Date
  participants: Types.DocumentArray<IChatParticipant & { _id: Types.ObjectId }>
  messages: Types.DocumentArray<IChatMessage & { _id: Types.ObjectId }>
  status: ChatStatus
  category: ChatCategory
  priority: ChatPriority
  assignedTo?: Types.ObjectId | null
  tags: string[]
  notes?: string | null
  lastMessage?: {
    content?: string
    timestamp?: Date
    sender?: {
      id?: Types.ObjectId
      name?: string
    }
  } | null
  metrics: {
    totalMessages: number
    responseTime: {
      firstResponse?: number | null
      averageResponse?: number | null
    }
    satisfaction: {
      rating?: number | null
      feedback?: string | null
      timestamp?: Date | null
    }
  }
  settings: {
    autoAssign: boolean
    notifications: {
      email: boolean
      push: boolean
    }
  }
}

const chatAttachmentSchema = new Schema<IChatAttachment>(
  {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
  },
  { _id: false },
)

const chatParticipantSchema = new Schema<IChatParticipant>(
  {
    id: { type: Schema.Types.ObjectId, required: true, refPath: 'participants.model' },
    model: { type: String, required: true, enum: ['User', 'Admin'] },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String, default: null },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  { _id: false },
)

const chatMessageSchema = new Schema<IChatMessage>(
  {
    sender: {
      id: { type: Schema.Types.ObjectId, required: true, refPath: 'messages.sender.model' },
      model: { type: String, required: true, enum: ['User', 'Admin'] },
      name: { type: String, required: true, trim: true },
      avatar: { type: String, default: null },
    },
    content: { type: String, required: true, trim: true },
    messageType: { type: String, enum: ['text', 'file', 'image', 'system'], default: 'text' },
    attachments: { type: [chatAttachmentSchema], default: [] },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    metadata: {
      ipAddress: String,
      userAgent: String,
    },
  },
  { timestamps: true },
)

const chatSchema = new Schema<IChat>(
  {
    chatId: { type: String, required: true, unique: true, index: true },
    participants: { type: [chatParticipantSchema], default: [] },
    messages: { type: [chatMessageSchema], default: [] },
    status: {
      type: String,
      enum: ['active', 'resolved', 'closed', 'pending'],
      default: 'active',
    },
    category: {
      type: String,
      enum: ['general', 'technical', 'billing', 'feature_request', 'bug_report', 'other'],
      default: 'general',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    tags: { type: [String], default: [] },
    notes: { type: String, default: null },
    lastMessage: {
      content: String,
      timestamp: Date,
      sender: {
        id: Schema.Types.ObjectId,
        name: String,
      },
    },
    metrics: {
      totalMessages: { type: Number, default: 0 },
      responseTime: {
        firstResponse: { type: Number, default: null },
        averageResponse: { type: Number, default: null },
      },
      satisfaction: {
        rating: { type: Number, min: 1, max: 5, default: null },
        feedback: { type: String, default: null },
        timestamp: { type: Date, default: null },
      },
    },
    settings: {
      autoAssign: { type: Boolean, default: true },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true },
)

chatSchema.index({ 'participants.id': 1, 'participants.model': 1 })
chatSchema.index({ status: 1, priority: 1 })
chatSchema.index({ 'lastMessage.timestamp': -1 })
chatSchema.index({ createdAt: -1 })

chatSchema.pre('save', function updateLastMessage() {
  if (this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1]
    this.lastMessage = {
      content: lastMsg.content,
      timestamp: lastMsg.createdAt,
      sender: {
        id: lastMsg.sender.id,
        name: lastMsg.sender.name,
      },
    }
    this.metrics.totalMessages = this.messages.length
  }
})

export const Chat: Model<IChat> = mongoose.models.Chat ?? mongoose.model<IChat>('Chat', chatSchema)
