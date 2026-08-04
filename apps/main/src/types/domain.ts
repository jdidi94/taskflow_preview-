export type Workspace = {
  id: string
  name: string
  description?: string | null
  avatar?: string | null
  owner?: string | WorkspaceMemberUser
  members?: unknown[]
  spaces?: string[]
  isActive?: boolean
  archived?: boolean
  archivedAt?: string | null
  githubOrg?: {
    id: number | null
    login: string | null
    name: string | null
    url: string | null
    avatar: string | null
    description: string | null
    linkedAt: string | null
  } | null
  createdAt?: string
  updatedAt?: string
}

export type WorkspaceMemberUser = {
  id?: string
  _id?: string
  name?: string
  email?: string
  avatar?: string | null
}

export type WorkspaceMemberEntry = {
  user: string | WorkspaceMemberUser
  role: 'member' | 'admin' | string
  joinedAt?: string
}

export type WorkspaceMembersPayload = {
  owner?: string | WorkspaceMemberUser | null
  members?: WorkspaceMemberEntry[]
}

export type Space = {
  id: string
  name: string
  description?: string | null
  workspace: string
  members?: unknown[]
  boards?: string[]
  isActive?: boolean
  archived?: boolean
  archivedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export type BoardColumn = {
  id: string
  name: string
  board: string
  position: number
  taskIds?: string[]
  limit?: number | null
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type Board = {
  id: string
  name: string
  description?: string | null
  type?: 'kanban' | 'list' | 'calendar' | 'timeline'
  visibility?: 'private' | 'workspace' | 'public'
  space: string
  owner?: string
  members?: unknown[]
  archived?: boolean
  archivedAt?: string | null
  isActive?: boolean
  columns?: BoardColumn[]
  createdAt?: string
  updatedAt?: string
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'archived'

export type TaskUserRef = {
  id: string
  name?: string
  email?: string
  avatar?: string | null
}

export type TaskComment = {
  id: string
  author: string | TaskUserRef | null
  body: string
  attachments?: string[]
  createdAt?: string
  updatedAt?: string
}

export type TaskChecklistItem = {
  id?: string
  text: string
  done: boolean
}

export type TaskFile = {
  id: string
  _id?: string
  originalName: string
  filename?: string
  mimeType: string
  size: number
  url: string
  category?: string
  source?: string
  externalId?: string | null
  externalUrl?: string | null
}

export type Task = {
  id: string
  title: string
  description?: string | null
  board: string
  space?: string
  column: string
  priority: TaskPriority
  status: TaskStatus
  color?: string | null
  assignees?: Array<string | TaskUserRef>
  reporter?: string | TaskUserRef | null
  watchers?: unknown[]
  attachments?: string[]
  tags?: string[]
  dueDate?: string | null
  position: number
  archived?: boolean
  comments?: TaskComment[]
  checklist?: TaskChecklistItem[]
  dependencies?: unknown[]
  createdAt?: string
  updatedAt?: string
}

export type ApiSuccess<T> = {
  success: true
  data: T
}
