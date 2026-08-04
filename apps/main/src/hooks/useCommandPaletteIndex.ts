import { useEffect, useMemo, useState } from 'react'

import { useLazyListBySpaceQuery } from '@/services/boardsApi'
import { useLazyListByWorkspaceQuery } from '@/services/spacesApi'
import { useListWorkspacesQuery } from '@/services/workspacesApi'
import type { Board, Space, Workspace } from '@/types/domain'

const MAX_WORKSPACES = 25
const MAX_SPACES = 40
const MAX_BOARDS = 80

function isActiveEntity(entity: { archived?: boolean; isActive?: boolean }) {
  if (entity.archived) return false
  if (entity.isActive === false) return false
  return true
}

export type PaletteIndex = {
  workspaces: Workspace[]
  spaces: Array<Space & { workspaceId: string; workspaceName: string }>
  boards: Array<Board & { spaceId: string; spaceName: string; workspaceName?: string }>
  loading: boolean
}

export function useCommandPaletteIndex(open: boolean): PaletteIndex {
  const { data: workspacesData, isFetching: loadingWorkspaces } = useListWorkspacesQuery(undefined, {
    skip: !open,
  })
  const [fetchSpaces] = useLazyListByWorkspaceQuery()
  const [fetchBoards] = useLazyListBySpaceQuery()

  const [spaces, setSpaces] = useState<PaletteIndex['spaces']>([])
  const [boards, setBoards] = useState<PaletteIndex['boards']>([])
  const [loadingNested, setLoadingNested] = useState(false)

  const workspaces = useMemo(
    () => (workspacesData?.data ?? []).filter(isActiveEntity).slice(0, MAX_WORKSPACES),
    [workspacesData?.data],
  )

  useEffect(() => {
    if (!open) {
      setSpaces([])
      setBoards([])
      setLoadingNested(false)
      return
    }
    if (!workspaces.length) {
      setSpaces([])
      setBoards([])
      return
    }

    let cancelled = false

    async function load() {
      setLoadingNested(true)
      try {
        const spaceBatches = await Promise.all(
          workspaces.map(async (workspace) => {
            try {
              const result = await fetchSpaces(workspace.id, true).unwrap()
              return (result.data ?? [])
                .filter(isActiveEntity)
                .map((space) => ({
                  ...space,
                  workspaceId: workspace.id,
                  workspaceName: workspace.name,
                }))
            } catch {
              return []
            }
          }),
        )
        if (cancelled) return
        const nextSpaces = spaceBatches.flat().slice(0, MAX_SPACES)
        setSpaces(nextSpaces)

        const boardBatches = await Promise.all(
          nextSpaces.map(async (space) => {
            try {
              const result = await fetchBoards(space.id, true).unwrap()
              return (result.data ?? [])
                .filter(isActiveEntity)
                .map((board) => ({
                  ...board,
                  spaceId: space.id,
                  spaceName: space.name,
                  workspaceName: space.workspaceName,
                }))
            } catch {
              return []
            }
          }),
        )
        if (cancelled) return
        setBoards(boardBatches.flat().slice(0, MAX_BOARDS))
      } finally {
        if (!cancelled) setLoadingNested(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [open, workspaces, fetchSpaces, fetchBoards])

  return {
    workspaces,
    spaces,
    boards,
    loading: open && (loadingWorkspaces || loadingNested),
  }
}
