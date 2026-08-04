import { useEffect, useState } from 'react'

import { getBoardSocket } from '@/lib/socket'
import { useAppSelector } from '@/store/hooks'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'active'

export type BoardPresenceUser = {
  id: string
  name: string
  email?: string
  avatar?: string | null
  status: PresenceStatus
}

type PresencePayloadUser = {
  id?: string
  _id?: string
  name?: string
  email?: string
  avatar?: string | null
  status?: PresenceStatus
}

function normalizeUser(
  raw: PresencePayloadUser | null | undefined,
  status: PresenceStatus = 'online',
): BoardPresenceUser | null {
  if (!raw) return null
  const id = String(raw.id ?? raw._id ?? '')
  if (!id) return null
  return {
    id,
    name: raw.name?.trim() || raw.email?.trim() || id,
    email: raw.email,
    avatar: raw.avatar ?? null,
    status: raw.status ?? status,
  }
}

function upsert(
  list: BoardPresenceUser[],
  user: BoardPresenceUser,
): BoardPresenceUser[] {
  const next = list.filter((item) => item.id !== user.id)
  if (user.status === 'offline') return next
  next.push(user)
  next.sort((a, b) => a.name.localeCompare(b.name))
  return next
}

/** Live board viewers from `/board` socket presence events. */
export function useBoardPresence(boardId: string | undefined): BoardPresenceUser[] {
  const self = useAppSelector((state) => state.auth.user)
  const [users, setUsers] = useState<BoardPresenceUser[]>([])

  useEffect(() => {
    if (!boardId) {
      setUsers([])
      return
    }

    let active = true
    const socket = getBoardSocket()

    const onPresence = (payload: { boardId?: string; users?: PresencePayloadUser[] }) => {
      if (!active || payload.boardId !== boardId) return
      const next = (payload.users ?? [])
        .map((user) => normalizeUser(user, 'online'))
        .filter(Boolean) as BoardPresenceUser[]
      next.sort((a, b) => a.name.localeCompare(b.name))
      setUsers(next)
    }

    const onJoined = (payload: {
      boardId?: string
      user?: PresencePayloadUser
      status?: PresenceStatus
    }) => {
      if (!active || payload.boardId !== boardId) return
      const user = normalizeUser(payload.user, payload.status ?? 'online')
      if (!user) return
      setUsers((prev) => upsert(prev, user))
    }

    const onLeft = (payload: { boardId?: string; user?: PresencePayloadUser }) => {
      if (!active || payload.boardId !== boardId) return
      const id = String(payload.user?.id ?? payload.user?._id ?? '')
      if (!id) return
      setUsers((prev) => prev.filter((item) => item.id !== id))
    }

    const onUpdate = (payload: {
      boardId?: string
      user?: PresencePayloadUser
      status?: PresenceStatus
    }) => {
      if (!active || payload.boardId !== boardId) return
      const user = normalizeUser(payload.user, payload.status ?? 'online')
      if (!user) return
      setUsers((prev) => upsert(prev, { ...user, status: payload.status ?? user.status }))
    }

    // Seed self immediately; roster arrives via board:presence after join.
    if (self?.id) {
      setUsers([
        {
          id: self.id,
          name: self.name || self.email || self.id,
          email: self.email,
          avatar: self.avatar ?? null,
          status: 'online',
        },
      ])
    } else {
      setUsers([])
    }

    socket.emit('presence:update', { boardId, status: 'online' })
    socket.on('board:presence', onPresence)
    socket.on('board:user-joined', onJoined)
    socket.on('board:user-left', onLeft)
    socket.on('board:viewer', onJoined)
    socket.on('presence:update', onUpdate)

    return () => {
      active = false
      socket.off('board:presence', onPresence)
      socket.off('board:user-joined', onJoined)
      socket.off('board:user-left', onLeft)
      socket.off('board:viewer', onJoined)
      socket.off('presence:update', onUpdate)
      setUsers([])
    }
  }, [boardId, self?.avatar, self?.email, self?.id, self?.name])

  return users
}
