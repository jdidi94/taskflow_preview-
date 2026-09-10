export type ChatStatus = 'pending' | 'active' | 'resolved' | 'closed'
export type ChatPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ChatCategory = 'general' | 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'other'
export type ChatActorModel = 'User' | 'Admin'

export type ChatParticipant = {
  id?: string
  _id?: string
  name?: string
  email?: string
  avatar?: string | null
  model: ChatActorModel
  isOnline?: boolean
}

export type ChatMessage = {
  _id?: string
  id?: string
  content: string
  messageType?: 'text' | 'image' | 'file' | 'system'
  sender: {
    id?: string
    _id?: string
    name: string
    model: ChatActorModel
    avatar?: string | null
  }
  chatId?: string
  isRead?: boolean
  createdAt: string
  updatedAt?: string
}

export type SupportChat = {
  _id?: string
  id?: string
  chatId: string
  participants: ChatParticipant[]
  messages?: ChatMessage[]
  status: ChatStatus | string
  priority: ChatPriority | string
  category?: ChatCategory | string
  assignedTo?: string | null
  createdAt: string
  updatedAt?: string
  lastMessage?: {
    content?: string
    timestamp?: string
    sender?: { id?: string; name?: string }
  } | null
}

export type ChatStats = {
  totalChats: number
  activeChats: number
  pendingChats: number
  resolvedChats: number
  closedChats?: number
  totalMessages: number
  averageResponseTime: number
  totalUnread?: number
}

export type NewChatRequestPayload = {
  chatId: string
  user: {
    _id?: string
    id?: string
    name: string
    email?: string
    model?: ChatActorModel
  }
  message: string
  category?: string
  priority?: string
  timestamp?: string
}

export function chatDocId(chat: Pick<SupportChat, '_id' | 'id'>) {
  return String(chat.id ?? chat._id ?? '')
}

export function messageId(message: Pick<ChatMessage, '_id' | 'id'>) {
  return String(message.id ?? message._id ?? '')
}

export function participantId(participant: ChatParticipant) {
  return String(participant.id ?? participant._id ?? '')
}

export function customerOf(chat: SupportChat) {
  return chat.participants.find((participant) => participant.model === 'User') ?? chat.participants[0]
}
