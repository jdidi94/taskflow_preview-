import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Board, type IBoard } from '../models/Board.js'
import { Column, type IColumn } from '../models/Column.js'
import { Space } from '../models/Space.js'
import { Task } from '../models/Task.js'
import { Workspace } from '../models/Workspace.js'

const DEFAULT_COLUMNS = ['To Do', 'In Progress', 'Done'] as const

function toPublicBoard(board: IBoard, columns?: IColumn[]) {
  return {
    id: board._id.toString(),
    name: board.name,
    description: board.description ?? null,
    type: board.type,
    visibility: board.visibility,
    space: board.space,
    owner: board.owner ?? null,
    members: board.members,
    archived: board.archived,
    archivedAt: board.archivedAt,
    isActive: board.isActive,
    columns: columns?.map(toPublicColumn),
    createdAt: (board as any).createdAt,
    updatedAt: (board as any).updatedAt,
  }
}

function toPublicColumn(column: IColumn) {
  return {
    id: column._id.toString(),
    name: column.name,
    board: column.board,
    position: column.position,
    taskIds: column.taskIds,
    limit: column.limit,
    isActive: column.isActive,
    createdAt: (column as any).createdAt,
    updatedAt: (column as any).updatedAt,
  }
}

async function assertSpaceAccess(userId: string, spaceId: string) {
  const space = await Space.findById(spaceId)
  if (!space || !space.isActive) throw new AppError('Space not found', 404)

  const workspace = await Workspace.findById(space.workspace)
  const hasAccess =
    space.members.some((m) => String(m.user) === userId) ||
    (workspace &&
      (String(workspace.owner) === userId ||
        workspace.members.some((m) => String(m.user) === userId)))

  if (!hasAccess) throw new AppError('Space access required', 403)
  return { space, workspace }
}

export const boardService = {
  async listBySpace(spaceId: string) {
    const boards = await Board.find({
      space: spaceId,
      isActive: true,
    }).sort({ archived: 1, updatedAt: -1 })
    return boards.map((board) => toPublicBoard(board))
  },

  async getById(board: IBoard) {
    const columns = await Column.find({ board: board._id, isActive: true }).sort({ position: 1 })
    return toPublicBoard(board, columns)
  },

  async create(
    userId: string,
    input: {
      name: string
      description?: string
      spaceId: string
      type: IBoard['type']
      visibility: IBoard['visibility']
    },
  ) {
    const { space } = await assertSpaceAccess(userId, input.spaceId)

    const board = await Board.create({
      name: input.name,
      description: input.description,
      type: input.type,
      visibility: input.visibility,
      space: space._id,
      owner: userId,
      members: [
        {
          user: new Types.ObjectId(userId),
          permissions: ['view', 'edit', 'delete', 'manage_columns', 'manage_members'],
          addedAt: new Date(),
        },
      ],
      archived: false,
      archivedAt: null,
    })

    const columns = await Column.insertMany(
      DEFAULT_COLUMNS.map((name, index) => ({
        name,
        board: board._id,
        position: index,
        taskIds: [],
        limit: null,
      })),
    )

    space.boards.push(board._id as Types.ObjectId)
    await space.save()

    return toPublicBoard(board, columns as IColumn[])
  },

  async update(
    board: IBoard,
    input: {
      name?: string
      description?: string
      type?: IBoard['type']
      visibility?: IBoard['visibility']
    },
  ) {
    if (input.name !== undefined) board.name = input.name
    if (input.description !== undefined) board.description = input.description
    if (input.type !== undefined) board.type = input.type
    if (input.visibility !== undefined) board.visibility = input.visibility
    await board.save()
    return toPublicBoard(board)
  },

  async archive(board: IBoard) {
    if (board.archived) throw new AppError('Board is already archived', 400)
    board.archived = true
    board.archivedAt = new Date()
    await board.save()
    return toPublicBoard(board)
  },

  async restore(board: IBoard) {
    if (!board.archived) throw new AppError('Board is not archived', 400)
    board.archived = false
    board.archivedAt = null
    await board.save()
    return toPublicBoard(board)
  },

  async permanentDelete(board: IBoard) {
    if (!board.archived) throw new AppError('Archive the board before permanent delete', 400)
    const boardId = board._id
    await Task.deleteMany({ board: boardId })
    await Column.deleteMany({ board: boardId })
    await Board.deleteOne({ _id: boardId })
    return { success: true as const }
  },

  async listColumns(boardId: string) {
    const columns = await Column.find({ board: boardId, isActive: true }).sort({ position: 1 })
    return columns.map(toPublicColumn)
  },

  async createColumn(
    boardId: string,
    input: { name: string; position?: number; limit?: number | null },
  ) {
    let position = input.position
    if (position === undefined) {
      const last = await Column.findOne({ board: boardId, isActive: true }).sort({ position: -1 })
      position = last ? last.position + 1 : 0
    }

    const column = await Column.create({
      name: input.name,
      board: boardId,
      position,
      taskIds: [],
      limit: input.limit ?? null,
    })
    return toPublicColumn(column)
  },

  async updateColumn(
    boardId: string,
    columnId: string,
    input: { name?: string; position?: number; limit?: number | null },
  ) {
    const column = await Column.findOne({ _id: columnId, board: boardId, isActive: true })
    if (!column) throw new AppError('Column not found', 404)

    if (input.name !== undefined) column.name = input.name
    if (input.position !== undefined) column.position = input.position
    if (input.limit !== undefined) column.limit = input.limit
    await column.save()
    return toPublicColumn(column)
  },

  async deleteColumn(boardId: string, columnId: string) {
    const column = await Column.findOne({ _id: columnId, board: boardId, isActive: true })
    if (!column) throw new AppError('Column not found', 404)
    if (column.taskIds.length > 0) {
      throw new AppError('Move or remove tasks before deleting column', 400)
    }
    column.isActive = false
    await column.save()
    return { success: true as const }
  },

  async reorderColumns(boardId: string, columnIds: string[]) {
    const columns = await Column.find({ board: boardId, isActive: true })
    const idSet = new Set(columns.map((c) => c._id.toString()))
    if (columnIds.length !== idSet.size || columnIds.some((id) => !idSet.has(id))) {
      throw new AppError('columnIds must include every active column exactly once', 400)
    }

    await Promise.all(
      columnIds.map((id, index) => Column.updateOne({ _id: id }, { $set: { position: index } })),
    )

    return this.listColumns(boardId)
  },
}
