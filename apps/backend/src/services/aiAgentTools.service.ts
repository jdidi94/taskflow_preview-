import type { Server } from 'socket.io'

import { Notification } from '../models/Notification.js'
import { taskService } from './task.service.js'
import type { PlaceContextPack, PlaceRef } from './aiContext.service.js'
import { AppError } from '../utils/AppError.js'

export type AgentToolName = 'create_task' | 'move_task' | 'update_task' | 'add_comment'

export type ProposedAgentTool = {
  id: string
  name: AgentToolName
  summary: string
  args: Record<string, unknown>
}

export type AgentToolResult = {
  id: string
  name: AgentToolName
  ok: boolean
  message: string
  taskId?: string
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

async function logAgentRun(input: {
  userId: string
  place: PlaceRef
  title: string
  message: string
  metadata?: Record<string, unknown>
  io?: Server
}) {
  const notification = await Notification.create({
    recipient: input.userId,
    sender: input.userId,
    type: 'ai_agent',
    title: input.title.slice(0, 200),
    message: input.message.slice(0, 500),
    relatedEntity: {
      entityType: input.place.type === 'board' ? 'board' : input.place.type === 'space' ? 'space' : 'workspace',
      entityId: input.place.id,
    },
    priority: 'low',
    metadata: {
      placeType: input.place.type,
      placeId: input.place.id,
      ...(input.metadata ?? {}),
    },
    tags: ['ai', 'agent'],
  })

  const send = (input.io as any)?.of?.('/notifications')?.sendNotification as
    | ((recipientId: string, data: unknown) => Promise<unknown>)
    | undefined
  if (send) {
    await send(input.userId, notification.toObject?.() ?? notification)
  }

  return notification
}

export const aiAgentToolsService = {
  async executeTools(input: {
    userId: string
    place: PlaceContextPack
    tools: ProposedAgentTool[]
    io?: Server
  }): Promise<AgentToolResult[]> {
    if (input.place.place.type !== 'board' || !input.place.meta.boardId) {
      throw new AppError('Write tools are only available on boards', 400)
    }

    const boardId = input.place.meta.boardId
    const results: AgentToolResult[] = []

    for (const tool of input.tools.slice(0, 5)) {
      try {
        if (tool.name === 'create_task') {
          const title = asString(tool.args.title)
          const columnId = asString(tool.args.columnId)
          if (!title || !columnId) throw new AppError('create_task requires title and columnId', 400)
          const priorityRaw = asString(tool.args.priority) || 'medium'
          const priority = (['low', 'medium', 'high', 'critical'].includes(priorityRaw)
            ? priorityRaw
            : 'medium') as 'low' | 'medium' | 'high' | 'critical'
          const task = await taskService.create(input.userId, {
            title,
            description: asString(tool.args.description) || undefined,
            boardId,
            columnId,
            priority,
            status: 'todo',
            dueDate: asString(tool.args.dueDate) || null,
            tags: Array.isArray(tool.args.tags)
              ? tool.args.tags.map(String).filter(Boolean).slice(0, 8)
              : undefined,
          })
          results.push({
            id: tool.id,
            name: tool.name,
            ok: true,
            message: `Created task “${title}”`,
            taskId: String((task as any).id ?? (task as any)._id),
          })
          continue
        }

        if (tool.name === 'move_task') {
          const taskId = asString(tool.args.taskId)
          const columnId = asString(tool.args.columnId)
          const position = Number(tool.args.position ?? 0)
          if (!taskId || !columnId) throw new AppError('move_task requires taskId and columnId', 400)
          await taskService.move(input.userId, taskId, {
            columnId,
            position: Number.isFinite(position) ? position : 0,
          })
          results.push({
            id: tool.id,
            name: tool.name,
            ok: true,
            message: `Moved task ${taskId}`,
            taskId,
          })
          continue
        }

        if (tool.name === 'update_task') {
          const taskId = asString(tool.args.taskId)
          if (!taskId) throw new AppError('update_task requires taskId', 400)
          const patch: Record<string, unknown> = {}
          if (tool.args.title !== undefined) patch.title = asString(tool.args.title)
          if (tool.args.description !== undefined) patch.description = asString(tool.args.description)
          if (tool.args.priority !== undefined) {
            const priorityRaw = asString(tool.args.priority)
            if (['low', 'medium', 'high', 'critical'].includes(priorityRaw)) {
              patch.priority = priorityRaw
            }
          }
          if (tool.args.dueDate !== undefined) {
            patch.dueDate = asString(tool.args.dueDate) || null
          }
          await taskService.update(input.userId, taskId, patch as any)
          results.push({
            id: tool.id,
            name: tool.name,
            ok: true,
            message: `Updated task ${taskId}`,
            taskId,
          })
          continue
        }

        if (tool.name === 'add_comment') {
          const taskId = asString(tool.args.taskId)
          const body = asString(tool.args.body)
          if (!taskId || !body) throw new AppError('add_comment requires taskId and body', 400)
          await taskService.addComment(input.userId, taskId, body)
          results.push({
            id: tool.id,
            name: tool.name,
            ok: true,
            message: `Commented on task ${taskId}`,
            taskId,
          })
          continue
        }

        results.push({
          id: tool.id,
          name: tool.name,
          ok: false,
          message: `Unknown tool ${tool.name}`,
        })
      } catch (error) {
        results.push({
          id: tool.id,
          name: tool.name,
          ok: false,
          message: error instanceof Error ? error.message : 'Tool failed',
        })
      }
    }

    const okCount = results.filter((item) => item.ok).length
    if (okCount > 0) {
      await logAgentRun({
        userId: input.userId,
        place: input.place.place,
        title: `Agent updated ${input.place.title}`,
        message: results
          .filter((item) => item.ok)
          .map((item) => item.message)
          .join(' · ')
          .slice(0, 500),
        metadata: {
          mode: 'confirm_write',
          tools: results,
          boardId,
          taskId: results.find((item) => item.ok && item.taskId)?.taskId,
        },
        io: input.io,
      })
    }

    return results
  },

  async logReadOnlyRun(input: {
    userId: string
    place: PlaceRef
    title: string
    message: string
    io?: Server
  }) {
    return logAgentRun({
      ...input,
      metadata: { mode: 'read_only' },
    })
  },
}
