import { useEffect } from 'react'

import { getWorkspaceSocket, pushSocketLog } from '@/lib/socket'
import { boardsApi } from '@/services/boardsApi'
import { spacesApi } from '@/services/spacesApi'
import { workspacesApi } from '@/services/workspacesApi'
import { useAppDispatch } from '@/store/hooks'

/** Join a workspace room and invalidate list caches on REST→socket broadcasts. */
export function useWorkspaceSocket(workspaceId: string | undefined) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!workspaceId) return

    let active = true
    const socket = getWorkspaceSocket()

    const invalidateWorkspace = (spaceId?: string, boardId?: string) => {
      if (!active) return
      dispatch(
        workspacesApi.util.invalidateTags([
          { type: 'Workspace', id: workspaceId },
          { type: 'WorkspaceMembers', id: workspaceId },
          { type: 'WorkspaceRules', id: workspaceId },
          { type: 'Workspaces', id: 'LIST' },
        ]),
      )
      dispatch(spacesApi.util.invalidateTags([{ type: 'Spaces', id: workspaceId }]))
      if (spaceId) {
        dispatch(spacesApi.util.invalidateTags([{ type: 'Space', id: spaceId }]))
        dispatch(boardsApi.util.invalidateTags([{ type: 'Boards', id: spaceId }]))
      }
      if (boardId) {
        dispatch(boardsApi.util.invalidateTags([{ type: 'Board', id: boardId }]))
      }
    }

    const onAny = (event: string, payload: Record<string, unknown> = {}) => {
      pushSocketLog('/workspace', 'event', event, payload)
      const space = payload.space as { id?: string } | undefined
      const board = payload.board as { id?: string; space?: string } | undefined
      const spaceId =
        (typeof payload.spaceId === 'string' && payload.spaceId) ||
        space?.id ||
        (typeof board?.space === 'string' ? board.space : undefined)
      const boardId =
        (typeof payload.boardId === 'string' && payload.boardId) || board?.id || undefined
      invalidateWorkspace(spaceId, boardId)
    }

    const events = [
      'workspace:updated',
      'workspace:deleted',
      'workspace:member_added',
      'workspace:member_removed',
      'workspace:member_role_changed',
      'workspace:member-updated',
      'workspace:settings-updated',
      'workspace:space_created',
      'workspace:space_updated',
      'workspace:space_deleted',
      'workspace:board_created',
      'workspace:board_updated',
    ] as const

    const listeners = events.map((event) => {
      const handler = (payload: Record<string, unknown>) => onAny(event, payload ?? {})
      return [event, handler] as const
    })

    const join = () => {
      socket.emit('workspace:join', { workspaceId })
      pushSocketLog('/workspace', 'emit', `workspace:join ${workspaceId}`)
    }

    join()
    socket.on('connect', join)
    for (const [event, handler] of listeners) {
      socket.on(event, handler)
    }

    return () => {
      active = false
      socket.emit('workspace:leave', { workspaceId })
      socket.off('connect', join)
      for (const [event, handler] of listeners) {
        socket.off(event, handler)
      }
    }
  }, [dispatch, workspaceId])
}
