import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Workspace, type IWorkspace } from '../models/Workspace.js'
import { Invitation } from '../models/Invitation.js'
import { User } from '../models/User.js'
import { sendEmail } from './email.service.js'
import { env } from '../config/env.js'

function toPublicWorkspace(workspace: IWorkspace) {
  return {
    id: workspace._id.toString(),
    name: workspace.name,
    description: workspace.description ?? null,
    avatar: workspace.avatar,
    owner: workspace.owner,
    members: workspace.members,
    spaces: workspace.spaces,
    isActive: workspace.isActive,
    archived: workspace.archived,
    archivedAt: workspace.archivedAt,
    createdAt: (workspace as any).createdAt,
    updatedAt: (workspace as any).updatedAt,
  }
}

export const workspaceService = {
  async listForUser(userId: string) {
    const workspaces = await Workspace.find({
      isActive: true,
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).sort({ updatedAt: -1 })

    return workspaces.map(toPublicWorkspace)
  },

  async create(userId: string, input: { name: string; description?: string; avatar?: string | null }) {
    const workspace = await Workspace.create({
      name: input.name,
      description: input.description,
      avatar: input.avatar ?? null,
      owner: userId,
      members: [{ user: new Types.ObjectId(userId), role: 'admin', joinedAt: new Date() }],
      spaces: [],
      archived: false,
      archivedAt: null,
    })
    return toPublicWorkspace(workspace)
  },

  async getById(workspace: IWorkspace) {
    return toPublicWorkspace(workspace)
  },

  async update(
    workspace: IWorkspace,
    input: { name?: string; description?: string; avatar?: string | null },
  ) {
    if (input.name !== undefined) workspace.name = input.name
    if (input.description !== undefined) workspace.description = input.description
    if (input.avatar !== undefined) workspace.avatar = input.avatar
    await workspace.save()
    return toPublicWorkspace(workspace)
  },

  async archive(workspace: IWorkspace) {
    if (workspace.archived) throw new AppError('Workspace is already archived', 400)
    workspace.archived = true
    workspace.archivedAt = new Date()
    await workspace.save()
    return toPublicWorkspace(workspace)
  },

  async restore(workspace: IWorkspace) {
    if (!workspace.archived) throw new AppError('Workspace is not archived', 400)
    workspace.archived = false
    workspace.archivedAt = null
    await workspace.save()
    return toPublicWorkspace(workspace)
  },

  async permanentDelete(workspace: IWorkspace) {
    if (!workspace.archived) throw new AppError('Archive the workspace before permanent delete', 400)
    workspace.isActive = false
    await workspace.save()
    await Workspace.deleteOne({ _id: workspace._id })
    return { success: true as const }
  },

  async listMembers(workspace: IWorkspace) {
    await workspace.populate('members.user', 'name email avatar')
    await workspace.populate('owner', 'name email avatar')
    return {
      owner: workspace.owner,
      members: workspace.members,
    }
  },

  async removeMember(workspace: IWorkspace, memberId: string) {
    if (String(workspace.owner) === memberId) {
      throw new AppError('Cannot remove workspace owner', 400)
    }
    const before = workspace.members.length
    workspace.members = workspace.members.filter((member) => String(member.user) !== memberId)
    if (workspace.members.length === before) throw new AppError('Member not found', 404)
    await workspace.save()
    return toPublicWorkspace(workspace)
  },

  async updateMemberRole(workspace: IWorkspace, memberId: string, role: 'member' | 'admin') {
    if (String(workspace.owner) === memberId) {
      throw new AppError('Owner role cannot be changed this way', 400)
    }
    const member = workspace.members.find((item) => String(item.user) === memberId)
    if (!member) throw new AppError('Member not found', 404)
    member.role = role
    await workspace.save()
    return toPublicWorkspace(workspace)
  },

  async inviteMember(
    workspace: IWorkspace,
    invitedBy: string,
    input: { email: string; role: 'member' | 'admin'; message?: string },
  ) {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() })
    if (existingUser) {
      const alreadyMember =
        String(workspace.owner) === existingUser._id.toString() ||
        workspace.members.some((member) => String(member.user) === existingUser._id.toString())
      if (alreadyMember) throw new AppError('User is already a workspace member', 409)
    }

    const pending = await Invitation.findOne({
      status: 'pending',
      'invitedUser.email': input.email.toLowerCase(),
      'targetEntity.type': 'Workspace',
      'targetEntity.id': workspace._id,
    })
    if (pending) throw new AppError('Pending invitation already exists', 409)

    const invitation = await Invitation.create({
      type: 'workspace',
      invitedBy,
      invitedUser: {
        email: input.email.toLowerCase(),
        userId: existingUser?._id ?? null,
        name: existingUser?.name,
      },
      targetEntity: {
        type: 'Workspace',
        id: workspace._id,
        name: workspace.name,
      },
      role: input.role,
      message: input.message,
      metadata: { invitationMethod: 'email' },
    })

    const inviteUrl = `${env.FRONTEND_URL}/join-workspace?token=${invitation.token}&workspace=${workspace._id}`
    invitation.metadata.inviteUrl = inviteUrl
    await invitation.save()

    await sendEmail({
      to: input.email,
      subject: `Invitation to join ${workspace.name}`,
      html: `<p>You have been invited to join workspace <strong>${workspace.name}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
      text: `Join workspace ${workspace.name}: ${inviteUrl}`,
    })

    return invitation
  },

  async getInviteLink(workspace: IWorkspace, invitedBy: string) {
    const invitation = await Invitation.create({
      type: 'workspace',
      invitedBy,
      invitedUser: {},
      targetEntity: {
        type: 'Workspace',
        id: workspace._id,
        name: workspace.name,
      },
      role: 'member',
      metadata: { invitationMethod: 'link' },
    })
    const inviteUrl = `${env.FRONTEND_URL}/join-workspace?token=${invitation.token}&workspace=${workspace._id}`
    invitation.metadata.inviteUrl = inviteUrl
    await invitation.save()
    return { token: invitation.token, inviteUrl, expiresAt: invitation.expiresAt }
  },

  async acceptInvitationToken(userId: string, token: string) {
    const invitation = await Invitation.findByToken(token)
    if (!invitation) throw new AppError('Invitation not found', 404)
    if (invitation.targetEntity.type !== 'Workspace') {
      throw new AppError('Invitation is not for a workspace', 400)
    }

    const workspace = await Workspace.findById(invitation.targetEntity.id)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)

    await invitation.accept(userId)

    const alreadyMember =
      String(workspace.owner) === userId ||
      workspace.members.some((member) => String(member.user) === userId)

    if (!alreadyMember) {
      workspace.members.push({
        user: new Types.ObjectId(userId),
        role: invitation.role === 'admin' ? 'admin' : 'member',
        joinedAt: new Date(),
      })
      await workspace.save()
    }

    return toPublicWorkspace(workspace)
  },
}
