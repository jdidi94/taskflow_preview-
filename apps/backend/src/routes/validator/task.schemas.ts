import { z } from 'zod'
import { objectIdSchema } from './workspace.schemas.js'

const checklistItemSchema = z.object({
  id: objectIdSchema.optional(),
  text: z.string().min(1).max(200),
  done: z.boolean().default(false),
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  boardId: objectIdSchema,
  columnId: objectIdSchema,
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']).default('todo'),
  color: z.string().optional(),
  assignees: z.array(objectIdSchema).optional(),
  attachments: z.array(objectIdSchema).optional(),
  tags: z.array(z.string().max(50)).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  checklist: z.array(checklistItemSchema).optional(),
  position: z.number().int().min(0).optional(),
})

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['todo', 'in_progress', 'review', 'done', 'archived']).optional(),
    color: z.string().optional(),
    assignees: z.array(objectIdSchema).optional(),
    attachments: z.array(objectIdSchema).optional(),
    tags: z.array(z.string().max(50)).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    checklist: z.array(checklistItemSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const moveTaskSchema = z.object({
  columnId: objectIdSchema,
  position: z.number().int().min(0),
})

export const restoreTaskSchema = z
  .object({
    columnId: objectIdSchema.optional(),
    position: z.number().int().min(0).optional(),
  })
  .default({})

export const bulkUpdateTasksSchema = z.object({
  taskIds: z.array(objectIdSchema).min(1),
  updates: updateTaskSchema,
})

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  attachments: z.array(objectIdSchema).optional(),
})

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
})

export const addWatcherSchema = z.object({
  userId: objectIdSchema,
})

export const addDependencySchema = z.object({
  taskId: objectIdSchema,
  type: z.enum(['blocks', 'blocked_by', 'related']).default('related'),
})

export const listTasksQuerySchema = z.object({
  boardId: objectIdSchema.optional(),
  columnId: objectIdSchema.optional(),
  spaceId: objectIdSchema.optional(),
})

export const listAssignedTasksQuerySchema = z.object({
  scope: z.enum(['upcoming', 'all']).optional(),
  withinDays: z.coerce.number().int().min(1).max(90).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const taskIdParamSchema = z.object({ id: objectIdSchema })
export const taskCommentParamSchema = z.object({
  id: objectIdSchema,
  commentId: objectIdSchema,
})
export const taskWatcherParamSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
})
export const taskDependencyParamSchema = z.object({
  id: objectIdSchema,
  dependencyId: objectIdSchema,
})
