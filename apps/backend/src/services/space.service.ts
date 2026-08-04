import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Space, type ISpace } from '../models/Space.js'
import { Workspace } from '../models/Workspace.js'
import { User } from '../models/User.js'

function toPublicSpace(space: ISpace) {
  return {
    id: space._id.toString(),
    name: space.name,
    description: space.description ?? null,
    workspace: space.workspace,
    members: space.members,
    boards: space.boards,
    isActive: space.isActive,
    archived: space.archived,
    archivedAt: space.archivedAt,
    createdAt: (space as any).createdAt,
    updatedAt: (space as any).updatedAt,
  }
}

export const spaceService = {
  async listByWorkspace(workspaceId: string) {
    const spaces = await Space.find({
      workspace: workspaceId,
      isActive: true,
      archived: false,
    }).sort({ updatedAt: -1 })
    return spaces.map(toPublicSpace)
  },

  async getById(space: ISpace) {
    return toPublicSpace(space)
  },

  async create(
    userId: string,
    input: { name: string; description?: string; workspaceId: string },
  ) {
    const workspace = await Workspace.findById(input.workspaceId)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)

    const isMember =
      String(workspace.owner) === userId ||
      workspace.members.some((m) => String(m.user) === userId)
    if (!isMember) throw new AppError('Workspace access required', 403)

    const space = await Space.create({
      name: input.name,
      description: input.description,
      workspace: workspace._id,
      members: [{ user: new Types.ObjectId(userId), role: 'admin', joinedAt: new Date() }],
      boards: [],
      archived: false,
      archivedAt: null,
    })

    workspace.spaces.push(space._id as Types.ObjectId)
    await workspace.save()

    return toPublicSpace(space)
  },

  async update(space: ISpace, input: { name?: string; description?: string }) {
    if (input.name !== undefined) space.name = input.name
    if (input.description !== undefined) space.description = input.description
    await space.save()
    return toPublicSpace(space)
  },

  async listMembers(space: ISpace) {
    await space.populate('members.user', 'name email avatar')
    return space.members
  },

  async addMember(space: ISpace, input: { userId: string; role: 'viewer' | 'member' | 'admin' }) {
    const user = await User.findById(input.userId)
    if (!user) throw new AppError('User not found', 404)

    if (space.members.some((m) => String(m.user) === input.userId)) {
      throw new AppError('User is already a space member', 409)
    }

    space.members.push({
      user: new Types.ObjectId(input.userId),
      role: input.role,
      joinedAt: new Date(),
    })
    await space.save()
    return toPublicSpace(space)
  },

  async removeMember(space: ISpace, memberId: string) {
    const before = space.members.length
    space.members = space.members.filter((m) => String(m.user) !== memberId)
    if (space.members.length === before) throw new AppError('Member not found', 404)
    await space.save()
    return toPublicSpace(space)
  },

  async archive(space: ISpace) {
    if (space.archived) throw new AppError('Space is already archived', 400)
    space.archived = true
    space.archivedAt = new Date()
    await space.save()
    return toPublicSpace(space)
  },

  async permanentDelete(space: ISpace) {
    if (!space.archived) throw new AppError('Archive the space before permanent delete', 400)

    const workspace = await Workspace.findById(space.workspace)
    if (workspace) {
      workspace.spaces = workspace.spaces.filter((id) => String(id) !== String(space._id))
      await workspace.save()
    }

    await Space.deleteOne({ _id: space._id })
    return { success: true as const }
  },
}
