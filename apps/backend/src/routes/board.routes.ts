import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import { requireBoardMember, requireSpaceMember } from '../middlewares/membership.js'
import {
  createBoardSchema,
  updateBoardSchema,
  createColumnSchema,
  updateColumnSchema,
  reorderColumnsSchema,
  boardIdParamSchema,
  boardSpaceParamSchema,
  boardColumnParamSchema,
} from './validator/board.schemas.js'
import * as boardController from '../controllers/board.controller.js'

export const boardRouter = Router()

boardRouter.use(authenticate)

boardRouter.get(
  '/space/:id',
  validateParams(boardSpaceParamSchema),
  requireSpaceMember,
  boardController.listBoardsBySpace,
)

boardRouter.post('/', validateBody(createBoardSchema), boardController.createBoard)

boardRouter.get(
  '/:id',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  boardController.getBoard,
)
boardRouter.put(
  '/:id',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  validateBody(updateBoardSchema),
  boardController.updateBoard,
)
boardRouter.delete(
  '/:id',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  boardController.archiveBoard,
)
boardRouter.post(
  '/:id/restore',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  boardController.restoreBoard,
)
boardRouter.post(
  '/:id/permanent',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  boardController.permanentDeleteBoard,
)

boardRouter.get(
  '/:id/columns',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  boardController.listColumns,
)
boardRouter.post(
  '/:id/columns',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  validateBody(createColumnSchema),
  boardController.createColumn,
)
boardRouter.put(
  '/:id/columns/:columnId',
  validateParams(boardColumnParamSchema),
  requireBoardMember,
  validateBody(updateColumnSchema),
  boardController.updateColumn,
)
boardRouter.delete(
  '/:id/columns/:columnId',
  validateParams(boardColumnParamSchema),
  requireBoardMember,
  boardController.deleteColumn,
)
boardRouter.patch(
  '/:id/columns/reorder',
  validateParams(boardIdParamSchema),
  requireBoardMember,
  validateBody(reorderColumnsSchema),
  boardController.reorderColumns,
)
