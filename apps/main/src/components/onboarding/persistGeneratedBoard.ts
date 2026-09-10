import type { Board, BoardColumn } from '@/types/domain'

export type GeneratedBoardPreview = {
  board?: { name?: string; description?: string }
  columns?: Array<{ name?: string }>
  tasks?: Array<{ title?: string; description?: string; column?: string }>
}

type Deps = {
  spaceId: string
  preview: GeneratedBoardPreview
  fallbackName: string
  createBoard: (body: {
    spaceId: string
    name: string
    description?: string
  }) => { unwrap: () => Promise<{ data: Board }> }
  createColumn: (body: {
    boardId: string
    name: string
  }) => { unwrap: () => Promise<{ data?: BoardColumn } | BoardColumn> }
  getBoard: (boardId: string) => Promise<Board>
  createTask: (body: {
    boardId: string
    columnId: string
    title: string
    description?: string
  }) => { unwrap: () => Promise<unknown> }
}

export async function persistGeneratedBoard({
  spaceId,
  preview,
  fallbackName,
  createBoard,
  createColumn,
  getBoard,
  createTask,
}: Deps): Promise<string> {
  const created = await createBoard({
    spaceId,
    name: String(preview.board?.name || fallbackName).slice(0, 80),
    description: preview.board?.description,
  }).unwrap()

  const desired = (preview.columns ?? [])
    .map((column) => String(column.name ?? '').trim())
    .filter(Boolean)

  if (desired.length > 0) {
    const existingNames = new Set(
      (created.data.columns ?? []).map((column) => column.name.toLowerCase()),
    )
    for (const name of desired) {
      if (existingNames.has(name.toLowerCase())) continue
      await createColumn({ boardId: created.data.id, name }).unwrap()
    }
  }

  const board = await getBoard(created.data.id)
  const columns = [...(board.columns ?? [])].sort((a, b) => a.position - b.position)
  const fallbackColumn = columns[0]?.id
  if (!fallbackColumn) return board.id

  for (const task of (preview.tasks ?? []).slice(0, 20)) {
    const title = String(task.title ?? '').trim()
    if (!title) continue
    const match =
      columns.find(
        (column) => column.name.toLowerCase() === String(task.column ?? '').toLowerCase(),
      ) ?? columns[0]
    await createTask({
      boardId: board.id,
      columnId: match.id,
      title,
      description: task.description ? String(task.description) : undefined,
    }).unwrap()
  }

  return board.id
}
