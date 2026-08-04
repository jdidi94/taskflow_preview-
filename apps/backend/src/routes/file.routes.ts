import { Router } from 'express'

import { authenticate } from '../middlewares/auth.js'
import { makeFileUploadMiddleware } from '../middlewares/fileUpload.js'
import { validateParams, validateQuery } from '../middlewares/validate.js'
import * as fileController from '../controllers/file.controller.js'
import { fileIdParamsSchema, fileListQuerySchema } from './validator/file.schemas.js'

export const fileRouter = Router()

fileRouter.use(authenticate)

fileRouter.post('/upload/avatar', makeFileUploadMiddleware('avatar', 'single', 'file'), fileController.uploadAvatar)
fileRouter.post(
  '/upload/task-attachments',
  makeFileUploadMiddleware('task_attachment', 'array', 'files'),
  fileController.uploadTaskAttachments,
)
fileRouter.post(
  '/upload/comment-attachment',
  makeFileUploadMiddleware('comment_attachment', 'array', 'files'),
  fileController.uploadCommentAttachments,
)
fileRouter.post('/upload/logo', makeFileUploadMiddleware('logo', 'single', 'file'), fileController.uploadLogo)
fileRouter.post(
  '/upload/board-background',
  makeFileUploadMiddleware('board_background', 'single', 'file'),
  fileController.uploadBoardBackground,
)
fileRouter.post('/upload/general', makeFileUploadMiddleware('general', 'array', 'files'), fileController.uploadGeneral)

fileRouter.get('/', validateQuery(fileListQuerySchema), fileController.listFiles)

// Place :id/download before :id to avoid route collision.
fileRouter.get('/:id/download', validateParams(fileIdParamsSchema), fileController.downloadFile)
fileRouter.get('/:id', validateParams(fileIdParamsSchema), fileController.getFile)
fileRouter.delete('/:id', validateParams(fileIdParamsSchema), fileController.deleteFile)

