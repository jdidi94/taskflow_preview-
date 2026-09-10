const KEY = 'taskflow-recent-boards'
const EVENT = 'taskflow-recent-boards'
const MAX = 5

export type RecentBoard = {
  id: string
  name: string
  spaceId?: string
  spaceName?: string
  workspaceId?: string
  workspaceName?: string
  visitedAt: number
}

export function readRecentBoards(): RecentBoard[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const boards: RecentBoard[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const id = String(record.id ?? '')
      const name = String(record.name ?? '').trim()
      if (!id || !name) continue
      boards.push({
        id,
        name,
        spaceId: record.spaceId ? String(record.spaceId) : undefined,
        spaceName: record.spaceName ? String(record.spaceName) : undefined,
        workspaceId: record.workspaceId ? String(record.workspaceId) : undefined,
        workspaceName: record.workspaceName ? String(record.workspaceName) : undefined,
        visitedAt: typeof record.visitedAt === 'number' ? record.visitedAt : 0,
      })
    }
    return boards.sort((a, b) => b.visitedAt - a.visitedAt).slice(0, MAX)
  } catch {
    return []
  }
}

export function touchRecentBoard(entry: Omit<RecentBoard, 'visitedAt'>) {
  if (typeof window === 'undefined' || !entry.id || !entry.name.trim()) return
  const next = [
    { ...entry, name: entry.name.trim(), visitedAt: Date.now() },
    ...readRecentBoards().filter((board) => board.id !== entry.id),
  ].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
}

export function recentBoardsEventName() {
  return EVENT
}
