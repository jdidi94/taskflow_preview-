import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Invitation, type IInvitation, type InvitationEntityType, type InvitationRole } from '../models/Invitation.js'
import { Workspace } from '../models/Workspace.js'
import { Space } from '../models/Space.js'
import { Board } from '../models/Board.js'
import { User } from '../models/User.js'
import { sendEmail } from './email.service.js'
import { env } from '../config/env.js'

function entityTypeFromInviteType(type: 'workspace' | 'space' | 'board'): InvitationEntityType {
  if (type === 'workspace') return 'Workspace'
  if (type === 'space') return 'Space'
  return 'Board'
}

async function resolveTargetEntity(type: 'workspace' | 'space' | 'board', id: string) {
  if (type === 'workspace') {
    const workspace = await Workspace.findById(id)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)
    return { id: workspace._id, name: workspace.name, entity: workspace }
  }
  if (type === 'space') {
    const space = await Space.findById(id)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)
    return { id: space._id, name: space.name, entity: space }
  }
  const board = await Board.findById(id)
  if (!board || !board.isActive) throw new AppError('Board not found', 404)
  return { id: board._id, name: board.name, entity: board }
}

async function assertCanManageEntity(
  userId: string,
  type: 'workspace' | 'space' | 'board',
  entityId: string,
) {
  if (type === 'workspace') {
    const workspace = await Workspace.findById(entityId)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)
    const isAdmin =
      String(workspace.owner) === userId ||
      workspace.members.some((m) => String(m.user) === userId && m.role === 'admin')
    if (!isAdmin) throw new AppError('Workspace admin access required', 403)
    return workspace
  }

  if (type === 'space') {
    const space = await Space.findById(entityId)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)
    const workspace = await Workspace.findById(space.workspace)
    const isAdmin =
      space.members.some((m) => String(m.user) === userId && m.role === 'admin') ||
      (workspace &&
        (String(workspace.owner) === userId ||
          workspace.members.some((m) => String(m.user) === userId && m.role === 'admin')))
    if (!isAdmin) throw new AppError('Space admin access required', 403)
    return space
  }

  const board = await Board.findById(entityId)
  if (!board || !board.isActive) throw new AppError('Board not found', 404)
  const space = await Space.findById(board.space)
  const workspace = space ? await Workspace.findById(space.workspace) : null
  const isAdmin =
    (board.owner && String(board.owner) === userId) ||
    (space && space.members.some((m) => String(m.user) === userId && m.role === 'admin')) ||
    (workspace &&
      (String(workspace.owner) === userId ||
        workspace.members.some((m) => String(m.user) === userId && m.role === 'admin')))
  if (!isAdmin) throw new AppError('Board admin access required', 403)
  return board
}

async function applyAcceptedInvitation(invitation: IInvitation, userId: string) {
  const role = invitation.role === 'admin' || invitation.role === 'owner' ? 'admin' : 'member'

  if (invitation.targetEntity.type === 'Workspace') {
    const workspace = await Workspace.findById(invitation.targetEntity.id)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)
    const already =
      String(workspace.owner) === userId ||
      workspace.members.some((m) => String(m.user) === userId)
    if (!already) {
      workspace.members.push({
        user: new Types.ObjectId(userId),
        role: role === 'admin' ? 'admin' : 'member',
        joinedAt: new Date(),
      })
      await workspace.save()
    }
    return workspace
  }

  if (invitation.targetEntity.type === 'Space') {
    const space = await Space.findById(invitation.targetEntity.id)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)
    if (!space.members.some((m) => String(m.user) === userId)) {
      space.members.push({
        user: new Types.ObjectId(userId),
        role: role === 'admin' ? 'admin' : 'member',
        joinedAt: new Date(),
      })
      await space.save()
    }
    return space
  }

  const board = await Board.findById(invitation.targetEntity.id)
  if (!board || !board.isActive) throw new AppError('Board not found', 404)
  if (!board.members.some((m) => String(m.user) === userId)) {
    board.members.push({
      user: new Types.ObjectId(userId),
      permissions: ['view', 'edit'],
      addedAt: new Date(),
    })
    await board.save()
  }
  return board
}

function toPublicInvitation(invitation: IInvitation) {
  return {
    id: invitation._id.toString(),
    type: invitation.type,
    invitedBy: invitation.invitedBy,
    invitedUser: invitation.invitedUser,
    targetEntity: invitation.targetEntity,
    role: invitation.role,
    token: invitation.token,
    status: invitation.status,
    message: invitation.message ?? null,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    declinedAt: invitation.declinedAt,
    metadata: invitation.metadata,
    createdAt: (invitation as any).createdAt,
    updatedAt: (invitation as any).updatedAt,
  }
}

export const invitationService = {
  async create(
    invitedBy: string,
    input: {
      type: 'workspace' | 'space' | 'board'
      email: string
      targetEntityId: string
      role: InvitationRole
      message?: string
    },
  ) {
    await assertCanManageEntity(invitedBy, input.type, input.targetEntityId)
    const target = await resolveTargetEntity(input.type, input.targetEntityId)
    const email = input.email.toLowerCase()
    const existingUser = await User.findOne({ email })

    const pending = await Invitation.findOne({
      status: 'pending',
      'invitedUser.email': email,
      'targetEntity.type': entityTypeFromInviteType(input.type),
      'targetEntity.id': target.id,
    })
    if (pending) throw new AppError('Pending invitation already exists', 409)

    const invitation = await Invitation.create({
      type: input.type,
      invitedBy,
      invitedUser: {
        email,
        userId: existingUser?._id ?? null,
        name: existingUser?.name,
      },
      targetEntity: {
        type: entityTypeFromInviteType(input.type),
        id: target.id,
        name: target.name,
      },
      role: input.role,
      message: input.message,
      metadata: { invitationMethod: 'email' },
    })

    const inviteUrl = `${env.FRONTEND_URL}/invitations/accept?token=${invitation.token}`
    invitation.metadata.inviteUrl = inviteUrl
    await invitation.save()

    await sendEmail({
      to: email,
      subject: `Invitation to join ${target.name}`,
      html: `<p>You have been invited to join <strong>${target.name}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
      text: `Join ${target.name}: ${inviteUrl}`,
    })

    return toPublicInvitation(invitation)
  },

  async listPendingForUser(userId: string, email?: string) {
    const query: Record<string, unknown> = {
      status: 'pending',
      expiresAt: { $gt: new Date() },
      $or: [{ 'invitedUser.userId': userId }],
    }
    if (email) {
      ;(query.$or as Array<Record<string, unknown>>).push({ 'invitedUser.email': email.toLowerCase() })
    }

    const invitations = await Invitation.find(query).sort({ createdAt: -1 })
    return invitations.map(toPublicInvitation)
  },

  async listCreatedByUser(userId: string) {
    const invitations = await Invitation.find({ invitedBy: userId }).sort({ createdAt: -1 })
    return invitations.map(toPublicInvitation)
  },

  async getByToken(token: string) {
    const invitation = await Invitation.findByToken(token)
    if (!invitation) throw new AppError('Invitation not found', 404)
    return toPublicInvitation(invitation)
  },

  async getById(invitationId: string, userId: string) {
    const invitation = await Invitation.findById(invitationId)
    if (!invitation) throw new AppError('Invitation not found', 404)

    const isInviter = String(invitation.invitedBy) === userId
    const isInvitee = invitation.invitedUser.userId
      ? String(invitation.invitedUser.userId) === userId
      : false
    if (!isInviter && !isInvitee) throw new AppError('Access denied', 403)

    return toPublicInvitation(invitation)
  },

  async acceptByToken(userId: string, token: string) {
    const invitation = await Invitation.findByToken(token)
    if (!invitation) throw new AppError('Invitation not found', 404)
    try {
      await invitation.accept(userId)
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Cannot accept invitation', 400)
    }
    const entity = await applyAcceptedInvitation(invitation, userId)
    return { invitation: toPublicInvitation(invitation), entity }
  },

  async declineByToken(userId: string, token: string) {
    const invitation = await Invitation.findByToken(token)
    if (!invitation) throw new AppError('Invitation not found', 404)
    if (
      invitation.invitedUser.userId &&
      String(invitation.invitedUser.userId) !== userId
    ) {
      throw new AppError('Access denied', 403)
    }
    try {
      await invitation.decline()
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Cannot decline invitation', 400)
    }
    return toPublicInvitation(invitation)
  },

  async acceptById(userId: string, invitationId: string) {
    const invitation = await Invitation.findById(invitationId)
    if (!invitation) throw new AppError('Invitation not found', 404)
    try {
      await invitation.accept(userId)
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Cannot accept invitation', 400)
    }
    const entity = await applyAcceptedInvitation(invitation, userId)
    return { invitation: toPublicInvitation(invitation), entity }
  },

  async declineById(userId: string, invitationId: string) {
    const invitation = await Invitation.findById(invitationId)
    if (!invitation) throw new AppError('Invitation not found', 404)
    const isInvitee = invitation.invitedUser.userId
      ? String(invitation.invitedUser.userId) === userId
      : false
    if (!isInvitee && invitation.invitedUser.userId) {
      throw new AppError('Access denied', 403)
    }
    try {
      await invitation.decline()
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Cannot decline invitation', 400)
    }
    return toPublicInvitation(invitation)
  },

  async cancelById(userId: string, invitationId: string) {
    const invitation = await Invitation.findById(invitationId)
    if (!invitation) throw new AppError('Invitation not found', 404)
    if (String(invitation.invitedBy) !== userId) throw new AppError('Access denied', 403)
    try {
      await invitation.cancel()
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Cannot cancel invitation', 400)
    }
    return toPublicInvitation(invitation)
  },

  async bulkInvite(
    invitedBy: string,
    input: {
      type: 'workspace' | 'space' | 'board'
      targetEntityId: string
      emails: string[]
      role: InvitationRole
      message?: string
    },
  ) {
    await assertCanManageEntity(invitedBy, input.type, input.targetEntityId)
    const target = await resolveTargetEntity(input.type, input.targetEntityId)
    const results: Array<{ email: string; status: 'created' | 'skipped'; invitation?: ReturnType<typeof toPublicInvitation>; reason?: string }> = []

    for (const rawEmail of input.emails) {
      const email = rawEmail.toLowerCase()
      try {
        const pending = await Invitation.findOne({
          status: 'pending',
          'invitedUser.email': email,
          'targetEntity.type': entityTypeFromInviteType(input.type),
          'targetEntity.id': target.id,
        })
        if (pending) {
          results.push({ email, status: 'skipped', reason: 'Pending invitation exists' })
          continue
        }

        const existingUser = await User.findOne({ email })
        const invitation = await Invitation.create({
          type: input.type,
          invitedBy,
          invitedUser: {
            email,
            userId: existingUser?._id ?? null,
            name: existingUser?.name,
          },
          targetEntity: {
            type: entityTypeFromInviteType(input.type),
            id: target.id,
            name: target.name,
          },
          role: input.role,
          message: input.message,
          metadata: { invitationMethod: 'bulk' },
        })

        const inviteUrl = `${env.FRONTEND_URL}/invitations/accept?token=${invitation.token}`
        invitation.metadata.inviteUrl = inviteUrl
        await invitation.save()

        await sendEmail({
          to: email,
          subject: `Invitation to join ${target.name}`,
          html: `<p>You have been invited to join <strong>${target.name}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
          text: `Join ${target.name}: ${inviteUrl}`,
        })

        results.push({ email, status: 'created', invitation: toPublicInvitation(invitation) })
      } catch (error) {
        results.push({
          email,
          status: 'skipped',
          reason: error instanceof Error ? error.message : 'Failed',
        })
      }
    }

    return results
  },

  async getStats(entityType: InvitationEntityType, entityId: string, userId: string) {
    const typeMap: Record<InvitationEntityType, 'workspace' | 'space' | 'board'> = {
      Workspace: 'workspace',
      Space: 'space',
      Board: 'board',
    }
    await assertCanManageEntity(userId, typeMap[entityType], entityId)

    const base = {
      'targetEntity.type': entityType,
      'targetEntity.id': entityId,
    }

    const [pending, accepted, declined, cancelled, expired] = await Promise.all([
      Invitation.countDocuments({ ...base, status: 'pending' }),
      Invitation.countDocuments({ ...base, status: 'accepted' }),
      Invitation.countDocuments({ ...base, status: 'declined' }),
      Invitation.countDocuments({ ...base, status: 'cancelled' }),
      Invitation.countDocuments({ ...base, status: 'expired' }),
    ])

    return { pending, accepted, declined, cancelled, expired, total: pending + accepted + declined + cancelled + expired }
  },
}
