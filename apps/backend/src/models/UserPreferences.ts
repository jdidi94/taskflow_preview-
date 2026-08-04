import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type SuggestionFrequency = 'realtime' | 'daily' | 'weekly' | 'never'
export type DashboardDefaultView = 'overview' | 'tasks' | 'calendar' | 'analytics'
export type WidgetType = 'tasks_overview' | 'recent_activity' | 'upcoming_deadlines' | 'team_performance' | 'ai_insights'
export type ConnectedAppType = 'calendar' | 'email' | 'storage' | 'communication' | 'development'
export type ProfileVisibility = 'public' | 'team_only' | 'private'

export interface INotificationEmailPrefs {
  taskAssigned: boolean
  taskCompleted: boolean
  taskOverdue: boolean
  commentAdded: boolean
  mentionReceived: boolean
  spaceUpdates: boolean
  weeklyDigest: boolean
}

export interface INotificationPushPrefs {
  taskAssigned: boolean
  taskCompleted: boolean
  taskOverdue: boolean
  commentAdded: boolean
  mentionReceived: boolean
  spaceUpdates: boolean
}

export interface INotificationRealTimePrefs {
  taskAssigned: boolean
  taskCompleted: boolean
  taskOverdue: boolean
  commentAdded: boolean
  mentionReceived: boolean
  spaceUpdates: boolean
  workspaceCreated: boolean
  workspaceArchived: boolean
  workspaceRestored: boolean
  workspaceDeleted: boolean
  templateCreated: boolean
}

export interface INotificationInAppPrefs {
  taskAssigned: boolean
  taskCompleted: boolean
  taskOverdue: boolean
  commentAdded: boolean
  mentionReceived: boolean
  spaceUpdates: boolean
}

export interface IDashboardWidget {
  type: WidgetType
  position: number
  settings: Map<string, unknown>
}

export interface IConnectedApp {
  name: string
  type: ConnectedAppType
  credentials: Map<string, string>
  isActive: boolean
  connectedAt: Date
  lastSyncAt: Date | null
}

export interface IUserPreferences extends Document {
  userId: Types.ObjectId

  theme: {
    mode: ThemeMode
    primaryColor: string
    sidebarCollapsed: boolean
  }

  notifications: {
    email: INotificationEmailPrefs
    push: INotificationPushPrefs
    realTime: INotificationRealTimePrefs
    inApp: INotificationInAppPrefs
    marketing: boolean
  }

  ai: {
    enableSuggestions: boolean
    enableRiskAnalysis: boolean
    enableAutoDescription: boolean
    suggestionFrequency: SuggestionFrequency
  }

  dashboard: {
    defaultView: DashboardDefaultView
    widgets: IDashboardWidget[]
  }

  connectedApps: IConnectedApp[]

  privacy: {
    profileVisibility: ProfileVisibility
    showOnlineStatus: boolean
    allowDirectMessages: boolean
    shareActivityData: boolean
  }

  updateSection(section: string, updates: unknown): Promise<this>
  updateNestedSection(section: string, subsection: string, updates: unknown): Promise<this>
  toggleNotificationCategory(category: string, enabled: boolean): Promise<this>
  connectApp(appData: Partial<IConnectedApp> & Pick<IConnectedApp, 'name' | 'type'>): Promise<this>
  disconnectApp(appName: string, appType: ConnectedAppType): Promise<this>
  shouldReceiveNotification(
    _type: string,
    category: string,
    method?: 'email' | 'push' | 'realTime' | 'inApp',
  ): boolean
}

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    theme: {
      mode: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
      primaryColor: {
        type: String,
        default: '#3B82F6',
        match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'],
      },
      sidebarCollapsed: { type: Boolean, default: false },
    },

    notifications: {
      email: {
        taskAssigned: { type: Boolean, default: true },
        taskCompleted: { type: Boolean, default: false },
        taskOverdue: { type: Boolean, default: true },
        commentAdded: { type: Boolean, default: true },
        mentionReceived: { type: Boolean, default: true },
        spaceUpdates: { type: Boolean, default: false },
        weeklyDigest: { type: Boolean, default: true },
      },
      push: {
        taskAssigned: { type: Boolean, default: true },
        taskCompleted: { type: Boolean, default: false },
        taskOverdue: { type: Boolean, default: true },
        commentAdded: { type: Boolean, default: false },
        mentionReceived: { type: Boolean, default: true },
        spaceUpdates: { type: Boolean, default: false },
      },
      realTime: {
        taskAssigned: { type: Boolean, default: true },
        taskCompleted: { type: Boolean, default: true },
        taskOverdue: { type: Boolean, default: true },
        commentAdded: { type: Boolean, default: true },
        mentionReceived: { type: Boolean, default: true },
        spaceUpdates: { type: Boolean, default: true },
        workspaceCreated: { type: Boolean, default: true },
        workspaceArchived: { type: Boolean, default: true },
        workspaceRestored: { type: Boolean, default: true },
        workspaceDeleted: { type: Boolean, default: true },
        templateCreated: { type: Boolean, default: true },
      },
      inApp: {
        taskAssigned: { type: Boolean, default: true },
        taskCompleted: { type: Boolean, default: true },
        taskOverdue: { type: Boolean, default: true },
        commentAdded: { type: Boolean, default: true },
        mentionReceived: { type: Boolean, default: true },
        spaceUpdates: { type: Boolean, default: true },
      },
      marketing: { type: Boolean, default: false },
    },

    ai: {
      enableSuggestions: { type: Boolean, default: true },
      enableRiskAnalysis: { type: Boolean, default: true },
      enableAutoDescription: { type: Boolean, default: false },
      suggestionFrequency: {
        type: String,
        enum: ['realtime', 'daily', 'weekly', 'never'],
        default: 'realtime',
      },
    },

    dashboard: {
      defaultView: {
        type: String,
        enum: ['overview', 'tasks', 'calendar', 'analytics'],
        default: 'overview',
      },
      widgets: [
        {
          type: {
            type: String,
            enum: ['tasks_overview', 'recent_activity', 'upcoming_deadlines', 'team_performance', 'ai_insights'],
            required: true,
          },
          position: { type: Number, required: true },
          settings: { type: Map, of: Schema.Types.Mixed },
        },
      ],
    },

    connectedApps: [
      {
        name: { type: String, required: true },
        type: {
          type: String,
          enum: ['calendar', 'email', 'storage', 'communication', 'development'],
          required: true,
        },
        credentials: { type: Map, of: String },
        isActive: { type: Boolean, default: true },
        connectedAt: { type: Date, default: Date.now },
        lastSyncAt: { type: Date, default: null },
      },
    ],

    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'team_only', 'private'],
        default: 'team_only',
      },
      showOnlineStatus: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
      shareActivityData: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

// Update a top-level preference section (theme, notifications, ai, dashboard, connectedApps, privacy)
userPreferencesSchema.methods.updateSection = async function updateSection(
  section: string,
  updates: unknown,
) {
  const self = this as any
  if (self?.[section]) {
    Object.assign(self[section], updates as Record<string, unknown>)
  }
  return this.save()
}

// Update a nested preference section like notifications.email / notifications.realTime / etc.
userPreferencesSchema.methods.updateNestedSection = async function updateNestedSection(
  section: string,
  subsection: string,
  updates: unknown,
) {
  const self = this as any
  if (self?.[section]?.[subsection]) {
    Object.assign(self[section][subsection], updates as Record<string, unknown>)
  }
  return this.save()
}

userPreferencesSchema.methods.toggleNotificationCategory = async function toggleNotificationCategory(
  category: string,
  enabled: boolean,
) {
  const self = this as any
  ;(['email', 'push', 'inApp', 'realTime'] as const).forEach((method) => {
    if (self.notifications?.[method]?.[category] !== undefined) {
      self.notifications[method][category] = enabled
    }
  })
  return this.save()
}

userPreferencesSchema.methods.connectApp = async function connectApp(appData: Partial<IConnectedApp> & Pick<IConnectedApp, 'name' | 'type'>) {
  const self = this as any
  const existingApp = self.connectedApps.find(
    (app: any) => app.name === appData.name && app.type === appData.type,
  )

  if (existingApp) {
    Object.assign(existingApp, appData, { lastSyncAt: new Date() })
  } else {
    self.connectedApps.push({
      ...appData,
      isActive: appData.isActive ?? true,
      connectedAt: appData.connectedAt ?? new Date(),
      lastSyncAt: appData.lastSyncAt ?? null,
    })
  }

  return this.save()
}

userPreferencesSchema.methods.disconnectApp = async function disconnectApp(
  appName: string,
  appType: ConnectedAppType,
) {
  const self = this as any
  self.connectedApps = self.connectedApps.filter(
    (app: any) => !(app.name === appName && app.type === appType),
  )
  return this.save()
}

userPreferencesSchema.methods.shouldReceiveNotification = function shouldReceiveNotification(
  _type: string,
  category: string,
  method: 'email' | 'push' | 'realTime' | 'inApp' = 'push',
) {
  const self = this as any
  return Boolean(self.notifications?.[method]?.[category])
}

export const UserPreferences: Model<IUserPreferences> =
  mongoose.models.UserPreferences ?? mongoose.model<IUserPreferences>('UserPreferences', userPreferencesSchema)

