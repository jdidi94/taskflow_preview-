import { Types } from 'mongoose'

import { Board } from '../models/Board.js'
import { Column } from '../models/Column.js'
import { Space } from '../models/Space.js'
import { Task } from '../models/Task.js'
import { Workspace } from '../models/Workspace.js'
import { AppError } from '../utils/AppError.js'

export type PlaceRef = {
  type: 'board' | 'space' | 'workspace'
  id: string
}

export type PlaceContextPack = {
  place: PlaceRef
  title: string
  label: string
  summary: string
  /** Truncated prompt block for the model (token-capped). */
  promptBlock: string
  meta: {
    workspaceId?: string
    spaceId?: string
    boardId?: string
    columnCount?: number
    taskCount?: number
    overdueCount?: number
    rulesExcerpt?: string | null
  }
}

const MAX_PROMPT_CHARS = 6000
const MAX_TASKS = 40
const MAX_RULES = 1200

async function assertPlaceAccess(userId: string, place: PlaceRef, isAdmin = false) {
  if (!Types.ObjectId.isValid(place.id)) throw new AppError('Invalid place id', 400)

  if (place.type === 'board') {
    const board = await Board.findById(place.id)
    if (!board || !board.isActive) throw new AppError('Board not found', 404)
    const space = await Space.findById(board.space)
    const workspace = space ? await Workspace.findById(space.workspace) : null
    if (!isAdmin) {
      const ok =
        (board.owner && String(board.owner) === userId) ||
        board.members.some((m) => String(m.user) === userId) ||
        (space ? space.members.some((m) => String(m.user) === userId) : false) ||
        (workspace
          ? String(workspace.owner) === userId ||
            workspace.members.some((m) => String(m.user) === userId)
          : false)
      if (!ok) throw new AppError('Access denied', 403)
    }
    return { board, space, workspace }
  }

  if (place.type === 'space') {
    const space = await Space.findById(place.id)
    if (!space || space.isActive === false) throw new AppError('Space not found', 404)
    const workspace = await Workspace.findById(space.workspace)
    if (!isAdmin) {
      const ok =
        space.members.some((m) => String(m.user) === userId) ||
        (workspace
          ? String(workspace.owner) === userId ||
            workspace.members.some((m) => String(m.user) === userId)
          : false)
      if (!ok) throw new AppError('Access denied', 403)
    }
    return { board: null, space, workspace }
  }

  const workspace = await Workspace.findById(place.id)
  if (!workspace || workspace.isActive === false) throw new AppError('Workspace not found', 404)
  if (!isAdmin) {
    const ok =
      String(workspace.owner) === userId ||
      workspace.members.some((m) => String(m.user) === userId)
    if (!ok) throw new AppError('Access denied', 403)
  }
  return { board: null, space: null, workspace }
}

function clip(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export const aiContextService = {
  async buildPlaceContext(
    userId: string,
    place: PlaceRef,
    isAdmin = false,
  ): Promise<PlaceContextPack> {
    const access = await assertPlaceAccess(userId, place, isAdmin)
    const rulesExcerpt = access.workspace?.rules?.content
      ? clip(String(access.workspace.rules.content).trim(), MAX_RULES)
      : null

    if (place.type === 'board' && access.board) {
      const board = access.board
      const columns = await Column.find({ board: board._id, isActive: true })
        .sort({ position: 1 })
        .lean()
      const tasks = await Task.find({ board: board._id, archived: { $ne: true } })
        .sort({ position: 1 })
        .limit(MAX_TASKS)
        .lean()
      const now = Date.now()
      const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < now)

      const columnLines = columns.map((column) => {
        const inCol = tasks.filter((task) => String(task.column) === String(column._id))
        return `- ${column.name} (${inCol.length} tasks, id=${column._id})`
      })
      const taskLines = tasks.slice(0, MAX_TASKS).map((task) => {
        const due = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : 'none'
        return `- [${task.priority}] ${task.title} | col=${task.column} | status=${task.status} | due=${due} | id=${task._id}`
      })

      const title = board.name
      const label = `Board · ${board.name}`
      const summary = `${columns.length} columns · ${tasks.length} tasks · ${overdue.length} overdue`
      const promptBlock = clip(
        [
          `PLACE: board`,
          `Board: ${board.name} (${board._id})`,
          board.description ? `Description: ${clip(board.description, 280)}` : '',
          access.space ? `Space: ${access.space.name} (${access.space._id})` : '',
          access.workspace ? `Workspace: ${access.workspace.name} (${access.workspace._id})` : '',
          rulesExcerpt ? `Workspace rules (excerpt):\n${rulesExcerpt}` : '',
          'Columns:',
          ...columnLines,
          'Tasks (capped):',
          ...taskLines,
        ]
          .filter(Boolean)
          .join('\n'),
        MAX_PROMPT_CHARS,
      )

      return {
        place,
        title,
        label,
        summary,
        promptBlock,
        meta: {
          workspaceId: access.workspace ? String(access.workspace._id) : undefined,
          spaceId: access.space ? String(access.space._id) : undefined,
          boardId: String(board._id),
          columnCount: columns.length,
          taskCount: tasks.length,
          overdueCount: overdue.length,
          rulesExcerpt,
        },
      }
    }

    if (place.type === 'space' && access.space) {
      const space = access.space
      const boards = await Board.find({ space: space._id, isActive: true }).limit(30).lean()
      const title = space.name
      const label = `Space · ${space.name}`
      const summary = `${boards.length} boards`
      const promptBlock = clip(
        [
          `PLACE: space`,
          `Space: ${space.name} (${space._id})`,
          space.description ? `Description: ${clip(space.description, 280)}` : '',
          access.workspace ? `Workspace: ${access.workspace.name}` : '',
          rulesExcerpt ? `Workspace rules (excerpt):\n${rulesExcerpt}` : '',
          'Boards:',
          ...boards.map((board) => `- ${board.name} (${board._id})`),
        ]
          .filter(Boolean)
          .join('\n'),
        MAX_PROMPT_CHARS,
      )
      return {
        place,
        title,
        label,
        summary,
        promptBlock,
        meta: {
          workspaceId: access.workspace ? String(access.workspace._id) : undefined,
          spaceId: String(space._id),
          rulesExcerpt,
        },
      }
    }

    const workspace = access.workspace!
    const spaces = await Space.find({ workspace: workspace._id, isActive: { $ne: false } })
      .limit(30)
      .lean()
    const title = workspace.name
    const label = `Workspace · ${workspace.name}`
    const summary = `${spaces.length} spaces`
    const promptBlock = clip(
      [
        `PLACE: workspace`,
        `Workspace: ${workspace.name} (${workspace._id})`,
        workspace.description ? `Description: ${clip(workspace.description, 280)}` : '',
        rulesExcerpt ? `Workspace rules (excerpt):\n${rulesExcerpt}` : '',
        'Spaces:',
        ...spaces.map((space) => `- ${space.name} (${space._id})`),
      ]
        .filter(Boolean)
        .join('\n'),
      MAX_PROMPT_CHARS,
    )

    return {
      place,
      title,
      label,
      summary,
      promptBlock,
      meta: {
        workspaceId: String(workspace._id),
        rulesExcerpt,
      },
    }
  },
}
