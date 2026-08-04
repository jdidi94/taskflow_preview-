import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Task, type ITask, type TaskPriority, type TaskStatus } from '../models/Task.js'
import { Column } from '../models/Column.js'
import { Board } from '../models/Board.js'
import { Space } from '../models/Space.js'
import { Workspace } from '../models/Workspace.js'
import { notificationService } from './notification.service.js'

type ChecklistInput = { id?: string; text: string; done: boolean }

function formatDue(value: Date | string | null | undefined) {
  if (!value) return 'none'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'none'
  return date.toISOString().slice(0, 10)
}

function toUserRef(value: unknown) {
  if (!value) return null
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const user = value as { _id: Types.ObjectId; name?: string; email?: string; avatar?: string | null }
    return {
      id: String(user._id),
      name: user.name ?? '',
      email: user.email ?? '',
      avatar: user.avatar ?? null,
    }
  }
  return String(value)
}

function toPublicComment(comment: any) {
  return {
    id: String(comment._id),
    author: toUserRef(comment.author),
    body: comment.body,
    attachments: (comment.attachments ?? []).map((id: Types.ObjectId) => String(id)),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  }
}

function toPublicChecklistItem(item: any) {
  return {
    id: String(item._id),
    text: item.text,
    done: Boolean(item.done),
  }
}

function toPublicTask(task: ITask) {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? null,
    board: String(task.board),
    space: String(task.space),
    column: String(task.column),
    priority: task.priority,
    status: task.status,
    color: task.color,
    assignees: (task.assignees ?? []).map((a) => toUserRef(a) ?? String(a)),
    reporter: toUserRef(task.reporter) ?? String(task.reporter),
    watchers: (task.watchers ?? []).map((id) => String(id)),
    attachments: (task.attachments ?? []).map((id) => String(id)),
    tags: task.tags ?? [],
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    position: task.position,
    archived: task.archived,
    comments: (task.comments ?? []).map(toPublicComment),
    checklist: (task.checklist ?? []).map(toPublicChecklistItem),
    dependencies: task.dependencies,
    createdAt: (task as any).createdAt,
    updatedAt: (task as any).updatedAt,
  }
}

const TASK_POPULATE = [
  { path: 'assignees', select: 'name email avatar' },
  { path: 'reporter', select: 'name email avatar' },
  { path: 'comments.author', select: 'name email avatar' },
] as const

async function hydrateTask(taskId: string) {
  const task = await Task.findById(taskId).populate(TASK_POPULATE as any)
  if (!task) throw new AppError('Task not found', 404)
  return toPublicTask(task)
}

function mapChecklistInput(items: ChecklistInput[] | undefined) {
  if (!items) return undefined
  return items.map((item) => ({
    ...(item.id && Types.ObjectId.isValid(item.id) ? { _id: new Types.ObjectId(item.id) } : {}),
    text: item.text,
    done: item.done,
  }))
}

async function assertBoardAccess(userId: string, boardId: string) {
  const board = await Board.findById(boardId)
  if (!board || !board.isActive) throw new AppError('Board not found', 404)

  const space = await Space.findById(board.space)
  const workspace = space ? await Workspace.findById(space.workspace) : null

  const hasAccess =
    (board.owner && String(board.owner) === userId) ||
    board.members.some((m) => String(m.user) === userId) ||
    (space && space.members.some((m) => String(m.user) === userId)) ||
    (workspace &&
      (String(workspace.owner) === userId ||
        workspace.members.some((m) => String(m.user) === userId)))

  if (!hasAccess) throw new AppError('Board access required', 403)
  return { board, space, workspace }
}

async function reindexColumnTasks(columnId: string) {
  const column = await Column.findById(columnId)
  if (!column) return
  column.taskIds = column.taskIds
    .sort((a, b) => a.position - b.position)
    .map((ref, index) => ({ ...ref, position: index }))
  await column.save()
}

async function removeTaskFromColumn(columnId: string, taskId: string) {
  const column = await Column.findById(columnId)
  if (!column) return
  column.taskIds = column.taskIds.filter((ref) => String(ref.task) !== taskId)
  await column.save()
  await reindexColumnTasks(columnId)
}

async function insertTaskIntoColumn(columnId: string, taskId: string, position: number) {
  const column = await Column.findById(columnId)
  if (!column) throw new AppError('Column not found', 404)

  const refs = column.taskIds
    .filter((ref) => String(ref.task) !== taskId)
    .sort((a, b) => a.position - b.position)

  const clamped = Math.max(0, Math.min(position, refs.length))
  refs.splice(clamped, 0, {
    task: new Types.ObjectId(taskId),
    position: clamped,
    addedAt: new Date(),
  })
  column.taskIds = refs.map((ref, index) => ({
    task: ref.task,
    position: index,
    addedAt: ref.addedAt ?? new Date(),
  }))
  await column.save()
  return clamped
}

export const taskService = {
  async list(
    userId: string,
    filters: { boardId?: string; columnId?: string; spaceId?: string },
  ) {
    const query: Record<string, unknown> = { archived: false }
    if (filters.boardId) {
      await assertBoardAccess(userId, filters.boardId)
      query.board = filters.boardId
    }
    if (filters.columnId) query.column = filters.columnId
    if (filters.spaceId) query.space = filters.spaceId

    if (!filters.boardId && !filters.columnId && !filters.spaceId) {
      throw new AppError('Provide boardId, columnId, or spaceId', 400)
    }

    const tasks = await Task.find(query)
      .sort({ position: 1, updatedAt: -1 })
      .populate(TASK_POPULATE as any)
    return tasks.map(toPublicTask)
  },

  async listAssignedUpcoming(
    userId: string,
    options: { withinDays?: number; limit?: number } = {},
  ) {
    const withinDays = options.withinDays ?? 14
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50)
    const end = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)

    const tasks = await Task.find({
      assignees: new Types.ObjectId(userId),
      archived: false,
      status: { $nin: ['done', 'archived'] },
      dueDate: { $ne: null, $lte: end },
    })
      .sort({ dueDate: 1 })
      .limit(limit)
      .populate(TASK_POPULATE as any)

    return tasks.map(toPublicTask)
  },

  async getById(userId: string, taskId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))
    return hydrateTask(taskId)
  },

  async create(
    userId: string,
    input: {
      title: string
      description?: string
      boardId: string
      columnId: string
      priority: TaskPriority
      status: TaskStatus
      color?: string
      assignees?: string[]
      tags?: string[]
      attachments?: string[]
      dueDate?: string | null
      checklist?: ChecklistInput[]
      position?: number
    },
  ) {
    const { board, space } = await assertBoardAccess(userId, input.boardId)
    if (!space) throw new AppError('Space not found', 404)

    const column = await Column.findOne({
      _id: input.columnId,
      board: board._id,
      isActive: true,
    })
    if (!column) throw new AppError('Column not found on board', 404)

    const position = input.position ?? column.taskIds.length

    const task = await Task.create({
      title: input.title,
      description: input.description,
      board: board._id,
      space: space._id,
      column: column._id,
      priority: input.priority,
      status: input.status,
      color: input.color,
      assignees: input.assignees ?? [],
      reporter: userId,
      watchers: [userId],
      tags: input.tags ?? [],
      attachments: input.attachments?.map((id) => new Types.ObjectId(id)) ?? [],
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      checklist: mapChecklistInput(input.checklist) ?? [],
      position,
      archived: false,
      comments: [],
      dependencies: [],
    })

    const finalPosition = await insertTaskIntoColumn(
      column._id.toString(),
      task._id.toString(),
      position,
    )
    if (finalPosition !== task.position) {
      task.position = finalPosition
      await task.save()
    }

    const publicTask = await hydrateTask(task._id.toString())
    const assigneeIds = (input.assignees ?? []).map(String).filter(Boolean)
    if (assigneeIds.length > 0) {
      await notificationService.notifyMany(assigneeIds, {
        senderId: userId,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: `You were assigned to “${task.title}”.`,
        priority: 'high',
        entityType: 'task',
        entityId: String(task._id),
        metadata: {
          boardId: String(board._id),
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          roleHint: 'assignee',
        },
        tags: ['task', 'assigned'],
        prefCategory: 'taskAssigned',
      })
    }

    return publicTask
  },

  async update(
    userId: string,
    taskId: string,
    input: {
      title?: string
      description?: string
      priority?: TaskPriority
      status?: TaskStatus
      color?: string
      assignees?: string[]
      tags?: string[]
      attachments?: string[]
      dueDate?: string | null
      checklist?: ChecklistInput[]
    },
  ) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const prevAssignees = new Set(task.assignees.map((id) => String(id)))
    const prevDue = task.dueDate ? task.dueDate.toISOString() : null
    const prevStatus = task.status
    const title = input.title !== undefined ? input.title : task.title

    if (input.title !== undefined) task.title = input.title
    if (input.description !== undefined) task.description = input.description
    if (input.priority !== undefined) task.priority = input.priority
    if (input.status !== undefined) task.status = input.status
    if (input.color !== undefined) task.color = input.color
    if (input.assignees !== undefined) task.assignees = input.assignees.map((id) => new Types.ObjectId(id))
    if (input.tags !== undefined) task.tags = input.tags
    if (input.attachments !== undefined) task.attachments = input.attachments.map((id) => new Types.ObjectId(id))
    if (input.dueDate !== undefined) task.dueDate = input.dueDate ? new Date(input.dueDate) : null
    if (input.checklist !== undefined) task.checklist = mapChecklistInput(input.checklist) as any

    await task.save()
    const publicTask = await hydrateTask(taskId)

    if (input.assignees !== undefined) {
      const nextAssignees = input.assignees.map(String)
      const newlyAssigned = nextAssignees.filter((id) => !prevAssignees.has(id))
      if (newlyAssigned.length > 0) {
        await notificationService.notifyMany(newlyAssigned, {
          senderId: userId,
          type: 'task_assigned',
          title: 'Task assigned to you',
          message: `You were assigned to “${title}”.`,
          priority: 'high',
          entityType: 'task',
          entityId: taskId,
          metadata: {
            boardId: String(task.board),
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
            roleHint: 'assignee',
          },
          tags: ['task', 'assigned'],
          prefCategory: 'taskAssigned',
        })
      }
    }

    if (input.dueDate !== undefined) {
      const nextDue = task.dueDate ? task.dueDate.toISOString() : null
      if (prevDue !== nextDue) {
        const recipients = [
          ...task.assignees.map((id) => String(id)),
          ...task.watchers.map((id) => String(id)),
        ]
        await notificationService.notifyMany(recipients, {
          senderId: userId,
          type: 'due_date_changed',
          title: 'Deadline updated',
          message: `Deadline for “${title}” changed to ${formatDue(task.dueDate)}.`,
          priority: 'high',
          entityType: 'task',
          entityId: taskId,
          metadata: {
            boardId: String(task.board),
            previousDueDate: prevDue,
            dueDate: nextDue,
            roleHint: 'assignee_or_watcher',
          },
          tags: ['task', 'deadline'],
          prefCategory: 'taskAssigned',
        })
      }
    }

    if (input.status !== undefined && input.status !== prevStatus && input.status === 'done') {
      const recipients = task.assignees.map((id) => String(id))
      await notificationService.notifyMany(recipients, {
        senderId: userId,
        type: 'task_completed',
        title: 'Task completed',
        message: `“${title}” was marked done.`,
        priority: 'medium',
        entityType: 'task',
        entityId: taskId,
        metadata: { boardId: String(task.board), status: input.status, roleHint: 'assignee' },
        tags: ['task', 'completed'],
        prefCategory: 'taskCompleted',
      })
    }

    return publicTask
  },

  async move(userId: string, taskId: string, input: { columnId: string; position: number }) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const target = await Column.findOne({
      _id: input.columnId,
      board: task.board,
      isActive: true,
    })
    if (!target) throw new AppError('Target column not found on board', 404)

    const fromColumnId = String(task.column)
    const toColumnId = String(target._id)

    if (fromColumnId !== toColumnId) {
      await removeTaskFromColumn(fromColumnId, taskId)
    }

    const finalPosition = await insertTaskIntoColumn(toColumnId, taskId, input.position)
    task.column = target._id as Types.ObjectId
    task.position = finalPosition
    await task.save()

    if (fromColumnId !== toColumnId) {
      const recipients = [
        ...task.assignees.map((id) => String(id)),
        ...task.watchers.map((id) => String(id)),
      ]
      await notificationService.notifyMany(recipients, {
        senderId: userId,
        type: 'task_moved',
        title: 'Task moved',
        message: `“${task.title}” moved to column “${target.name}”.`,
        priority: 'low',
        entityType: 'task',
        entityId: taskId,
        metadata: {
          boardId: String(task.board),
          fromColumnId,
          toColumnId,
          roleHint: 'assignee_or_watcher',
        },
        tags: ['task', 'moved'],
        prefCategory: 'spaceUpdates',
      })
    }

    return toPublicTask(task)
  },

  async remove(userId: string, taskId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    await removeTaskFromColumn(String(task.column), taskId)
    task.archived = true
    task.status = 'archived'
    await task.save()
    return { success: true as const }
  },

  async bulkUpdate(
    userId: string,
    input: {
      taskIds: string[]
      updates: {
        title?: string
        description?: string
        priority?: TaskPriority
        status?: TaskStatus
        color?: string
        assignees?: string[]
        attachments?: string[]
        tags?: string[]
        dueDate?: string | null
      }
    },
  ) {
    const results = []
    for (const taskId of input.taskIds) {
      results.push(await this.update(userId, taskId, input.updates))
    }
    return results
  },

  async duplicate(userId: string, taskId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const column = await Column.findById(task.column)
    if (!column || !column.isActive) throw new AppError('Column not found', 404)

    const copy = await Task.create({
      title: `${task.title} (copy)`,
      description: task.description,
      board: task.board,
      space: task.space,
      column: task.column,
      priority: task.priority,
      status: task.status,
      color: task.color,
      assignees: task.assignees,
      reporter: userId,
      watchers: [userId],
      tags: task.tags,
      dueDate: task.dueDate,
      position: column.taskIds.length,
      archived: false,
      comments: [],
      dependencies: [],
    })

    const position = await insertTaskIntoColumn(
      column._id.toString(),
      copy._id.toString(),
      column.taskIds.length,
    )
    copy.position = position
    await copy.save()
    return toPublicTask(copy)
  },

  async addComment(userId: string, taskId: string, body: string, attachments?: string[]) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    task.comments.push({
      author: new Types.ObjectId(userId),
      body,
      attachments: attachments?.map((id) => new Types.ObjectId(id)) ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
    await task.save()
    return hydrateTask(taskId)
  },

  async updateComment(userId: string, taskId: string, commentId: string, body: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const comment = task.comments.find((item) => String(item._id) === commentId)
    if (!comment) throw new AppError('Comment not found', 404)
    if (String(comment.author) !== userId) throw new AppError('Only author can edit comment', 403)

    comment.body = body
    comment.updatedAt = new Date()
    await task.save()
    return hydrateTask(taskId)
  },

  async deleteComment(userId: string, taskId: string, commentId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const comment = task.comments.find((item) => String(item._id) === commentId)
    if (!comment) throw new AppError('Comment not found', 404)
    if (String(comment.author) !== userId) throw new AppError('Only author can delete comment', 403)

    task.comments = task.comments.filter((item) => String(item._id) !== commentId) as any
    await task.save()
    return hydrateTask(taskId)
  },

  async addWatcher(userId: string, taskId: string, watcherId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const already = task.watchers.some((id) => String(id) === watcherId)
    if (!already) {
      task.watchers.push(new Types.ObjectId(watcherId))
      await task.save()
      await notificationService.notify({
        recipientId: watcherId,
        senderId: userId,
        type: 'task_watcher_added',
        title: 'You are watching a task',
        message: `You were added as a watcher on “${task.title}”.`,
        priority: 'low',
        entityType: 'task',
        entityId: taskId,
        metadata: { boardId: String(task.board), roleHint: 'watcher' },
        tags: ['task', 'watcher'],
        prefCategory: 'spaceUpdates',
      })
    }
    return toPublicTask(task)
  },

  async removeWatcher(userId: string, taskId: string, watcherId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    task.watchers = task.watchers.filter((id) => String(id) !== watcherId)
    await task.save()
    return toPublicTask(task)
  },

  async addDependency(
    userId: string,
    taskId: string,
    input: { taskId: string; type: 'blocks' | 'blocked_by' | 'related' },
  ) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    if (input.taskId === taskId) throw new AppError('Task cannot depend on itself', 400)

    const depTask = await Task.findById(input.taskId)
    if (!depTask || depTask.archived) throw new AppError('Dependency task not found', 404)
    if (String(depTask.board) !== String(task.board)) {
      throw new AppError('Dependency must be on the same board', 400)
    }

    if (task.dependencies.some((d) => String(d.task) === input.taskId && d.type === input.type)) {
      throw new AppError('Dependency already exists', 409)
    }

    task.dependencies.push({
      task: new Types.ObjectId(input.taskId),
      type: input.type,
    })
    await task.save()
    return toPublicTask(task)
  },

  async removeDependency(userId: string, taskId: string, dependencyId: string) {
    const task = await Task.findById(taskId)
    if (!task || task.archived) throw new AppError('Task not found', 404)
    await assertBoardAccess(userId, String(task.board))

    const before = task.dependencies.length
    task.dependencies = task.dependencies.filter((d) => String((d as any)._id) !== dependencyId) as any
    if (task.dependencies.length === before) throw new AppError('Dependency not found', 404)
    await task.save()
    return toPublicTask(task)
  },
}
