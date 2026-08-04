import mongoose, { type Document, Schema, Types } from 'mongoose'

export type ReminderEntityType = 'task' | 'space' | 'comment' | 'checklist' | 'board' | 'user'
export type ReminderStatus = 'scheduled' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'snoozed'
export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface IReminderSnoozeInfo {
  snoozedAt?: Date | null
  snoozedUntil?: Date | null
  snoozeCount: number
  maxSnoozes: number
}

export interface IReminderRepeat {
  enabled: boolean
  frequency?: string
  pattern?: string
  endDate?: Date
}

export interface IReminder extends Document {
  entityType: ReminderEntityType
  entityId: Types.ObjectId
  userId: Types.ObjectId

  title: string
  message?: string

  method: string[]

  // Matches v2 naming used in due-reminder filtering.
  scheduledAt: Date

  timezone: string

  repeat?: IReminderRepeat
  nextOccurrence?: Date | null

  status: ReminderStatus
  priority: ReminderPriority

  snoozeInfo: IReminderSnoozeInfo

  isActive: boolean
}

const reminderSchema = new Schema<IReminder>(
  {
    entityType: { type: String, enum: ['task', 'space', 'comment', 'checklist', 'board', 'user'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, trim: true, maxlength: 1000, default: '' },

    // Delivery methods (we keep this flexible for v3 parity; tests only assert status/priority).
    method: { type: [String], default: ['push'] },

    scheduledAt: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },

    repeat: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, default: undefined },
      pattern: { type: String, default: undefined },
      endDate: { type: Date, default: undefined },
    },
    nextOccurrence: { type: Date, default: null },

    status: { type: String, enum: ['scheduled', 'sent', 'delivered', 'failed', 'cancelled', 'snoozed'], default: 'scheduled' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    snoozeInfo: {
      snoozedAt: { type: Date, default: null },
      snoozedUntil: { type: Date, default: null },
      snoozeCount: { type: Number, default: 0 },
      maxSnoozes: { type: Number, default: 3 },
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Reminder =
  mongoose.models.Reminder ?? mongoose.model<IReminder>('Reminder', reminderSchema)

