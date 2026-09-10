import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  restoreTaskSchema,
  bulkUpdateTasksSchema,
  createCommentSchema,
  updateCommentSchema,
  addWatcherSchema,
  addDependencySchema,
  taskIdParamSchema,
  taskCommentParamSchema,
  taskWatcherParamSchema,
  taskDependencyParamSchema,
} from './validator/task.schemas.js'
import * as taskController from '../controllers/task.controller.js'

export const taskRouter = Router()

taskRouter.use(authenticate)

taskRouter.get('/', taskController.listTasks)
taskRouter.get('/assigned', taskController.listAssignedUpcoming)
taskRouter.post('/', validateBody(createTaskSchema), taskController.createTask)
taskRouter.patch(
  '/bulk-update',
  validateBody(bulkUpdateTasksSchema),
  taskController.bulkUpdateTasks,
)

taskRouter.get('/:id', validateParams(taskIdParamSchema), taskController.getTask)
taskRouter.put(
  '/:id',
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  taskController.updateTask,
)
taskRouter.patch(
  '/:id/move',
  validateParams(taskIdParamSchema),
  validateBody(moveTaskSchema),
  taskController.moveTask,
)
taskRouter.delete('/:id', validateParams(taskIdParamSchema), taskController.deleteTask)
taskRouter.post(
  '/:id/restore',
  validateParams(taskIdParamSchema),
  validateBody(restoreTaskSchema),
  taskController.restoreTask,
)
taskRouter.post(
  '/:id/duplicate',
  validateParams(taskIdParamSchema),
  taskController.duplicateTask,
)

taskRouter.post(
  '/:id/comments',
  validateParams(taskIdParamSchema),
  validateBody(createCommentSchema),
  taskController.addComment,
)
taskRouter.put(
  '/:id/comments/:commentId',
  validateParams(taskCommentParamSchema),
  validateBody(updateCommentSchema),
  taskController.updateComment,
)
taskRouter.delete(
  '/:id/comments/:commentId',
  validateParams(taskCommentParamSchema),
  taskController.deleteComment,
)

taskRouter.post(
  '/:id/watchers',
  validateParams(taskIdParamSchema),
  validateBody(addWatcherSchema),
  taskController.addWatcher,
)
taskRouter.delete(
  '/:id/watchers/:userId',
  validateParams(taskWatcherParamSchema),
  taskController.removeWatcher,
)

taskRouter.post(
  '/:id/dependencies',
  validateParams(taskIdParamSchema),
  validateBody(addDependencySchema),
  taskController.addDependency,
)
taskRouter.delete(
  '/:id/dependencies/:dependencyId',
  validateParams(taskDependencyParamSchema),
  taskController.removeDependency,
)
