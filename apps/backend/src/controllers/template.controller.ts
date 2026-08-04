import type { Response } from 'express'
import { Types } from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { Template } from '../models/Template.js'
import { Notification } from '../models/Notification.js'

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  return tags
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 50)
    .slice(0, 20)
}

function parseIsPublic(v: unknown): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

export const list = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    type?: string
    category?: string
    q?: string
    isPublic?: 'true' | 'false'
    status?: string
    workspaceId?: string
    limit?: number
    scope?: 'all'
  }

  const viewerId = req.user?.sub as string | undefined
  const role = req.user?.role as string | undefined
  const isAdmin = req.user?.type === 'admin'
  const scopeAll = q.scope === 'all'

  const filter: any = {}
  if (q.type) filter.type = q.type
  if (q.category) filter.category = q.category
  const status = q.status ?? 'active'
  filter.status = status

  const explicitIsPublic = parseIsPublic(q.isPublic)
  if (explicitIsPublic !== undefined) filter.isPublic = explicitIsPublic

  // Access control (mirrors v2 behavior)
  if (!(isAdmin && scopeAll) && viewerId) {
    const workspaceObjectId = q.workspaceId ? new Types.ObjectId(q.workspaceId) : undefined
    const viewerObjectId = new Types.ObjectId(viewerId)

    const accessOr: any[] = [
      { isPublic: true },
      { createdBy: viewerObjectId },
      { 'accessControl.allowedUsers': viewerObjectId },
    ]

    if (role) accessOr.push({ 'accessControl.allowedRoles': role })
    if (workspaceObjectId) accessOr.push({ 'accessControl.allowedWorkspaces': workspaceObjectId })

    const textOr =
      q.q && q.q.trim().length > 0
        ? [
            { name: { $regex: q.q.trim(), $options: 'i' } },
            { description: { $regex: q.q.trim(), $options: 'i' } },
            { category: { $regex: q.q.trim(), $options: 'i' } },
          ]
        : []

    if (textOr.length > 0) filter.$and = [{ $or: accessOr }, { $or: textOr }]
    else filter.$or = accessOr
  } else {
    // Public listing when not authed or when not admin+scope=all
    const textOr =
      q.q && q.q.trim().length > 0
        ? [
            { name: { $regex: q.q.trim(), $options: 'i' } },
            { description: { $regex: q.q.trim(), $options: 'i' } },
            { category: { $regex: q.q.trim(), $options: 'i' } },
          ]
        : []

    if (textOr.length > 0) filter.$and = [{ isPublic: true }, { $or: textOr }]
    else filter.isPublic = true
  }

  const limit = q.limit ?? 50
  const items = await Template.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name email displayName avatar')
    .populate('likedBy', 'name displayName')
    .populate('viewedBy', 'name displayName')

  res.json({ success: true, data: { templates: items } })
})

export const getById = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params
  const template = await Template.findById(id)
    .populate('createdBy', 'name email displayName avatar')
    .populate('likedBy', 'name displayName')
    .populate('viewedBy', 'name displayName')

  if (!template) throw new AppError('Template not found', 404)

  const viewerId = req.user?.sub as string | undefined
  const role = req.user?.role as string | undefined
  const workspaceId = (req.query.workspaceId as string | undefined) ?? undefined
  const isAdmin = req.user?.type === 'admin'

  // Access check
  const canAccess = template.canViewerAccess({
    id: viewerId ? new Types.ObjectId(viewerId) : null,
    role,
    workspaceId: workspaceId ? new Types.ObjectId(workspaceId) : null,
  })

  if (!canAccess && !isAdmin) throw new AppError('Access denied', 403)

  // Increment views once per authenticated viewer (idempotent via viewedBy)
  if (viewerId) {
    const viewerObjectId = new Types.ObjectId(viewerId)
    const resUpdate = await Template.updateOne(
      { _id: id, viewedBy: { $ne: viewerObjectId } },
      { $addToSet: { viewedBy: viewerObjectId }, $inc: { views: 1 } },
    )

    if (resUpdate.modifiedCount > 0) {
      return res.json({ success: true, data: { template: await Template.findById(id) } })
    }
  }

  res.json({ success: true, data: { template } })
})

export const create = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?.sub) throw new AppError('Unauthorized', 401)

  const {
    name,
    description,
    type,
    content,
    category,
    tags,
    isPublic,
    status,
    accessControl,
  } = req.body as {
    name: string
    description?: string
    type: any
    content: unknown
    category?: string
    tags?: unknown
    isPublic?: boolean
    status?: any
    accessControl?: any
  }

  const template = await Template.create({
    name,
    description: description ?? '',
    type,
    content,
    category: category ?? 'General',
    tags: sanitizeTags(tags),
    isPublic: isPublic ?? false,
    isSystem: false,
    status: status ?? 'draft',
    createdBy: req.user.sub,
    accessControl: accessControl
      ? {
          allowedUsers: accessControl.allowedUsers ?? [],
          allowedWorkspaces: accessControl.allowedWorkspaces ?? [],
          allowedRoles: accessControl.allowedRoles ?? [],
        }
      : { allowedUsers: [], allowedWorkspaces: [], allowedRoles: [] },
    usage: { totalUses: 0, lastUsed: null, rating: { average: 0, count: 0 } },
    version: { major: 1, minor: 0, patch: 0 },
    views: 0,
    likedBy: [],
    viewedBy: [],
    metadata: {},
  })

  await template.populate('createdBy', 'name email displayName avatar')
  return res.status(201).json({ success: true, data: { template } })
})

export const update = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?.sub) throw new AppError('Unauthorized', 401)

  const { id } = req.params
  const viewerId = req.user.sub as string
  const viewerType = req.user.type as 'user' | 'admin'
  const isAdmin = viewerType === 'admin'

  const template = await Template.findById(id)
  if (!template) throw new AppError('Template not found', 404)

  const canEdit = isAdmin || String(template.createdBy) === String(viewerId)
  if (!canEdit) throw new AppError('Forbidden', 403)

  // Support v2-like operation mode (optional)
  if (req.body?.op === 'increment_views') {
    const viewerObjectId = new Types.ObjectId(viewerId)
    const resUpdate = await Template.updateOne(
      { _id: id, viewedBy: { $ne: viewerObjectId } },
      { $addToSet: { viewedBy: viewerObjectId }, $inc: { views: 1 } },
    )

    if (resUpdate.matchedCount === 0) throw new AppError('Template not found', 404)

    const updated = await Template.findById(id)
      .populate('createdBy', 'name email displayName avatar')
      .populate('likedBy', 'name displayName')
      .populate('viewedBy', 'name displayName')

    res.json({ success: true, data: { template: updated } })
    return
  }

  if (req.body?.op === 'toggle_like') {
    const viewerObjectId = new Types.ObjectId(viewerId)
    const existing = await Template.findById(id).select('_id likedBy createdBy views')
    if (!existing) throw new AppError('Template not found', 404)

    const hasLiked =
      Array.isArray(existing.likedBy) && existing.likedBy.some((u: Types.ObjectId) => String(u) === viewerId)
    const update = hasLiked
      ? { $pull: { likedBy: viewerObjectId } }
      : { $addToSet: { likedBy: viewerObjectId } }

    const updated = await Template.findByIdAndUpdate(id, update, { new: true }).populate('createdBy', 'name email displayName avatar')
    if (!updated) throw new AppError('Template not found', 404)

    try {
      const ownerId = String(updated.createdBy)
      const actorId = String(viewerId)
      if (ownerId && actorId && ownerId !== actorId) {
        const isUnlike = hasLiked
        await Notification.create({
          recipient: ownerId,
          sender: actorId,
          type: isUnlike ? 'template_unliked' : 'template_liked',
          title: isUnlike ? 'Like removed on your template' : 'New like on your template',
          message: isUnlike
            ? `${req.user?.name || 'Someone'} removed their like from "${updated.name || 'your template'}"`
            : `${req.user?.name || 'Someone'} liked "${updated.name || 'your template'}"`,
          priority: 'low',
          relatedEntity: { entityType: 'template', entityId: updated._id },
          metadata: {},
        })
      }
    } catch {
      // best effort
    }

    res.json({ success: true, data: { template: updated } })
    return
  }

  const {
    name,
    description,
    type,
    content,
    category,
    tags,
    isPublic,
    status,
    accessControl,
  } = req.body as any

  if (name !== undefined) template.name = name
  if (description !== undefined) template.description = description
  if (type !== undefined) template.type = type
  if (content !== undefined) template.content = content
  if (category !== undefined) template.category = category
  if (tags !== undefined) template.tags = sanitizeTags(tags)
  if (isPublic !== undefined) template.isPublic = isPublic
  if (status !== undefined) template.status = status
  if (accessControl !== undefined) {
    template.accessControl = {
      allowedUsers: accessControl.allowedUsers ?? [],
      allowedWorkspaces: accessControl.allowedWorkspaces ?? [],
      allowedRoles: accessControl.allowedRoles ?? [],
    }
  }

  await template.save()
  await template.populate('createdBy', 'name email displayName avatar')

  res.json({ success: true, data: { template } })
})

export const remove = asyncHandler(async (req: any, res: Response) => {
  if (!req.user?.sub) throw new AppError('Unauthorized', 401)
  const { id } = req.params

  const template = await Template.findById(id).select('_id createdBy')
  if (!template) throw new AppError('Template not found', 404)

  const isAdmin = req.user?.type === 'admin'
  const canDelete = isAdmin || String(template.createdBy) === String(req.user.sub)
  if (!canDelete) throw new AppError('Forbidden', 403)

  await Template.deleteOne({ _id: id })
  res.json({ success: true, data: { id } })
})

export const incrementViews = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params
  const viewerId = req.user?.sub as string | undefined
  if (!viewerId) throw new AppError('Unauthorized', 401)

  const viewerObjectId = new Types.ObjectId(viewerId)
  const resUpdate = await Template.updateOne(
    { _id: id, viewedBy: { $ne: viewerObjectId } },
    { $addToSet: { viewedBy: viewerObjectId }, $inc: { views: 1 } },
  )

  if (resUpdate.matchedCount === 0) throw new AppError('Template not found', 404)

  const updated = await Template.findById(id)
    .populate('createdBy', 'name email displayName avatar')
    .populate('likedBy', 'name displayName')
    .populate('viewedBy', 'name displayName')

  res.json({ success: true, data: { template: updated } })
})

export const toggleLike = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params
  const viewerId = req.user?.sub as string | undefined
  if (!viewerId) throw new AppError('Unauthorized', 401)

  const viewerObjectId = new Types.ObjectId(viewerId)
  const template = await Template.findById(id).select('_id likedBy createdBy views')

  if (!template) throw new AppError('Template not found', 404)

  const hasLiked = Array.isArray(template.likedBy) && template.likedBy.some((u: Types.ObjectId) => String(u) === viewerId)
  const update = hasLiked ? { $pull: { likedBy: viewerObjectId } } : { $addToSet: { likedBy: viewerObjectId } }

  const updated = await Template.findByIdAndUpdate(id, update, { new: true }).populate('createdBy', 'name email displayName avatar')
  if (!updated) throw new AppError('Template not found', 404)

  // Notify owner (plan requirement)
  try {
    const ownerId = String(updated.createdBy)
    const actorId = String(viewerId)
    if (ownerId && actorId && ownerId !== actorId) {
      const isUnlike = hasLiked
      await Notification.create({
        recipient: ownerId,
        sender: actorId,
        type: isUnlike ? 'template_unliked' : 'template_liked',
        title: isUnlike ? 'Like removed on your template' : 'New like on your template',
        message: isUnlike
          ? `${req.user?.name || 'Someone'} removed their like from "${updated.name || 'your template'}"`
          : `${req.user?.name || 'Someone'} liked "${updated.name || 'your template'}"`,
        priority: 'low',
        relatedEntity: { entityType: 'template', entityId: updated._id },
        metadata: {},
      })
    }
  } catch {
    // best effort
  }

  res.json({ success: true, data: { template: updated } })
})

