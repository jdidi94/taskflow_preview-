import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import type { AuthedRequest } from './auth.js'
import { Workspace, type IWorkspace } from '../models/Workspace.js'
import { Space, type ISpace } from '../models/Space.js'
import { Board, type IBoard } from '../models/Board.js'

export type MembershipRequest = AuthedRequest & {
  workspace?: IWorkspace
  space?: ISpace
  board?: IBoard
}

function getParamId(req: Request, keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = req.params[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (value) return value
  }
  return undefined
}

function isMember(userId: string, members: Array<{ user: Types.ObjectId | string }>, ownerId?: string) {
  if (ownerId && String(ownerId) === userId) return true
  return members.some((member) => String(member.user) === userId)
}

function isWorkspaceAdmin(workspace: IWorkspace, userId: string) {
  if (String(workspace.owner) === userId) return true
  return workspace.members.some(
    (member) => String(member.user) === userId && member.role === 'admin',
  )
}

function isSpaceAdmin(space: ISpace, userId: string) {
  return space.members.some((member) => String(member.user) === userId && member.role === 'admin')
}

export const requireWorkspaceMember: RequestHandler = async (req, _res, next) => {
  try {
    const authed = req as MembershipRequest
    const userId = authed.user?.sub
    if (!userId) throw new AppError('Authentication required', 401)

    const id = getParamId(req, ['id', 'workspaceId'])
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError('Invalid workspace id', 400)

    const workspace = await Workspace.findById(id)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)
    if (!isMember(userId, workspace.members, String(workspace.owner))) {
      throw new AppError('Workspace access required', 403)
    }

    authed.workspace = workspace
    next()
  } catch (error) {
    next(error)
  }
}

export const requireWorkspaceAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const authed = req as MembershipRequest
    const userId = authed.user?.sub
    if (!userId) throw new AppError('Authentication required', 401)

    const id = getParamId(req, ['id', 'workspaceId'])
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError('Invalid workspace id', 400)

    const workspace = await Workspace.findById(id)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)
    if (!isWorkspaceAdmin(workspace, userId)) {
      throw new AppError('Workspace admin access required', 403)
    }

    authed.workspace = workspace
    next()
  } catch (error) {
    next(error)
  }
}

export const requireSpaceMember: RequestHandler = async (req, _res, next) => {
  try {
    const authed = req as MembershipRequest
    const userId = authed.user?.sub
    if (!userId) throw new AppError('Authentication required', 401)

    const id = getParamId(req, ['id', 'spaceId'])
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError('Invalid space id', 400)

    const space = await Space.findById(id)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)

    const workspace = await Workspace.findById(space.workspace)
    const hasAccess =
      isMember(userId, space.members) ||
      (workspace ? isMember(userId, workspace.members, String(workspace.owner)) : false)

    if (!hasAccess) throw new AppError('Space access required', 403)

    authed.space = space
    if (workspace) authed.workspace = workspace
    next()
  } catch (error) {
    next(error)
  }
}

export const requireSpaceAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const authed = req as MembershipRequest
    const userId = authed.user?.sub
    if (!userId) throw new AppError('Authentication required', 401)

    const id = getParamId(req, ['id', 'spaceId'])
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError('Invalid space id', 400)

    const space = await Space.findById(id)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)

    const workspace = await Workspace.findById(space.workspace)
    const hasAccess =
      isSpaceAdmin(space, userId) ||
      (workspace ? isWorkspaceAdmin(workspace, userId) : false)

    if (!hasAccess) throw new AppError('Space admin access required', 403)

    authed.space = space
    if (workspace) authed.workspace = workspace
    next()
  } catch (error) {
    next(error)
  }
}

export const requireBoardMember: RequestHandler = async (req, _res, next) => {
  try {
    const authed = req as MembershipRequest
    const userId = authed.user?.sub
    if (!userId) throw new AppError('Authentication required', 401)

    const id = getParamId(req, ['id', 'boardId'])
    if (!id || !Types.ObjectId.isValid(id)) throw new AppError('Invalid board id', 400)

    const board = await Board.findById(id)
    if (!board || !board.isActive) throw new AppError('Board not found', 404)

    const space = await Space.findById(board.space)
    const workspace = space ? await Workspace.findById(space.workspace) : null

    const hasAccess =
      (board.owner && String(board.owner) === userId) ||
      isMember(userId, board.members) ||
      (space ? isMember(userId, space.members) : false) ||
      (workspace ? isMember(userId, workspace.members, String(workspace.owner)) : false)

    if (!hasAccess) throw new AppError('Board access required', 403)

    authed.board = board
    if (space) authed.space = space
    if (workspace) authed.workspace = workspace
    next()
  } catch (error) {
    next(error)
  }
}

// Silence unused Response import warnings in some TS configs by referencing type usage above.
export type _MembershipResponse = Response
export type _MembershipNext = NextFunction
