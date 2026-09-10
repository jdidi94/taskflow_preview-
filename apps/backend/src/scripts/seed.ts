/**
 * Demo seed for local / staging UI.
 *
 * Inspired by v2 `apps/backend/src/seeders` (not ported 1:1 — v3 schemas differ).
 *
 * Usage (from repo root or apps/backend):
 *   npm run seed -w @taskflow/backend
 *   npm run seed -w @taskflow/backend -- --reset
 *
 * Login (all seeded users):
 *   jondoe@gmail.com / Password123!
 *   janemaria@gmail.com / Password123!
 *
 * Admin panel (http://localhost:5175/login) — super_admin:
 *   admin@taskflow.demo / Password123!
 *   jondoe@gmail.com / Password123!
 */

import crypto from 'node:crypto'

import mongoose, { Types } from 'mongoose'

import { connectDB } from '../config/db.js'
import { env } from '../config/env.js'
import { Board } from '../models/Board.js'
import { Chat } from '../models/Chat.js'
import { Column } from '../models/Column.js'
import { Invitation } from '../models/Invitation.js'
import { Notification } from '../models/Notification.js'
import { Quota } from '../models/Quota.js'
import { Reminder } from '../models/Reminder.js'
import { Space } from '../models/Space.js'
import { Task } from '../models/Task.js'
import { Template } from '../models/Template.js'
import { User } from '../models/User.js'
import { UserPreferences } from '../models/UserPreferences.js'
import { UserSessions } from '../models/UserSessions.js'
import { Admin } from '../models/Admin.js'
import { File } from '../models/File.js'
import { Workspace } from '../models/Workspace.js'
import { quotaService } from '../services/quota.service.js'

const DEMO_PASSWORD = 'Password123!'
const COLORS = ['#6B7280', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#4B5563'] as const
const TAGS = ['frontend', 'backend', 'design', 'bug', 'launch', 'ai', 'infra', 'copy', 'qa']
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const

type SeedUserSpec = {
  name: string
  email: string
  systemRole?: 'user' | 'admin' | 'moderator'
  plan?: 'free' | 'basic' | 'premium'
}

const SEED_USERS: SeedUserSpec[] = [
  { name: 'Jon Doe', email: 'jondoe@gmail.com', systemRole: 'admin', plan: 'premium' },
  { name: 'Jane Maria', email: 'janemaria@gmail.com', systemRole: 'admin', plan: 'premium' },
  { name: 'Alex Chen', email: 'alex.chen@taskflow.demo', plan: 'basic' },
  { name: 'Sara Benali', email: 'sara.benali@taskflow.demo', plan: 'basic' },
  { name: 'Mohamed Khalil', email: 'mohamed.khalil@taskflow.demo' },
  { name: 'Emma Wilson', email: 'emma.wilson@taskflow.demo' },
  { name: 'Lucas Martin', email: 'lucas.martin@taskflow.demo' },
  { name: 'Aisha Rahman', email: 'aisha.rahman@taskflow.demo' },
  { name: 'Tomas Novak', email: 'tomas.novak@taskflow.demo' },
  { name: 'Layla Hassan', email: 'layla.hassan@taskflow.demo' },
  { name: 'Chris Park', email: 'chris.park@taskflow.demo' },
  { name: 'Nora Ibrahim', email: 'nora.ibrahim@taskflow.demo' },
  { name: 'Diego Alvarez', email: 'diego.alvarez@taskflow.demo' },
  { name: 'Priya Shah', email: 'priya.shah@taskflow.demo' },
  { name: 'Youssef Amrani', email: 'youssef.amrani@taskflow.demo' },
  { name: 'Hannah Cole', email: 'hannah.cole@taskflow.demo' },
]

function avatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563EB&color=fff&size=128`
}

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length]!
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setHours(10, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

function idOf(doc: { _id: Types.ObjectId } | { id?: unknown }) {
  return String((doc as { _id: Types.ObjectId })._id)
}

async function resetCollections() {
  const collections = [
    User,
    UserPreferences,
    UserSessions,
    Workspace,
    Space,
    Board,
    Column,
    Task,
    Notification,
    Invitation,
    Chat,
    Template,
    Quota,
    Reminder,
    File,
  ]
  for (const model of collections) {
    await model.deleteMany()
  }
  await Admin.deleteMany({})
}

const SUPER_ADMIN_EMAIL = 'admin@taskflow.demo'
const SUPER_ADMIN_USERNAME = 'taskflow_admin'

async function upsertAdmin(input: {
  userName: string
  userEmail: string
  firstName?: string
  lastName?: string
}) {
  const existing = await Admin.findOne({ userEmail: input.userEmail }).select('+password')
  if (existing) {
    existing.userName = input.userName
    existing.password = DEMO_PASSWORD
    existing.role = 'super_admin'
    existing.isActive = true
    existing.isEmailVerified = true
    if (input.firstName !== undefined) existing.firstName = input.firstName
    if (input.lastName !== undefined) existing.lastName = input.lastName
    await existing.save()
    return existing
  }

  return Admin.create({
    userName: input.userName,
    userEmail: input.userEmail,
    password: DEMO_PASSWORD,
    role: 'super_admin',
    isActive: true,
    isEmailVerified: true,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
  })
}

async function seedAdmin() {
  await upsertAdmin({
    userName: SUPER_ADMIN_USERNAME,
    userEmail: SUPER_ADMIN_EMAIL,
    firstName: 'TaskFlow',
    lastName: 'Admin',
  })
  await upsertAdmin({
    userName: 'jondoe_admin',
    userEmail: 'jondoe@gmail.com',
    firstName: 'Jon',
    lastName: 'Doe',
  })
}

async function seedUsers() {
  const created = []
  for (const spec of SEED_USERS) {
    const user = await User.create({
      name: spec.name,
      email: spec.email,
      password: DEMO_PASSWORD,
      systemRole: spec.systemRole ?? 'user',
      avatar: avatarUrl(spec.name),
      isActive: true,
      emailVerified: true,
      lastLogin: daysFromNow(-Math.floor(Math.random() * 5)),
      subscription: {
        plan: spec.plan ?? 'free',
        status: spec.plan && spec.plan !== 'free' ? 'active' : 'inactive',
        billingCycle: spec.plan === 'premium' ? 'monthly' : null,
        startDate: spec.plan === 'premium' ? daysFromNow(-40) : null,
        nextBillingDate: spec.plan === 'premium' ? daysFromNow(20) : null,
        lastPaymentDate: spec.plan === 'premium' ? daysFromNow(-10) : null,
        paymentSessionId: null,
        lastUpdated: new Date(),
      },
    })
    await UserPreferences.create({ userId: user._id })
    await quotaService.seedDefaultsForUser(idOf(user), spec.plan ?? 'free')
    created.push(user)
  }
  return created
}

async function addMembers(
  workspaceId: Types.ObjectId,
  ownerId: Types.ObjectId,
  members: Array<{ user: Types.ObjectId; role: 'admin' | 'member' }>,
) {
  const workspace = await Workspace.findById(workspaceId)
  if (!workspace) throw new Error('workspace missing')
  workspace.members = [
    { user: ownerId, role: 'admin', joinedAt: daysFromNow(-60) },
    ...members
      .filter((m) => String(m.user) !== String(ownerId))
      .map((m) => ({ ...m, joinedAt: daysFromNow(-45) })),
  ]
  await workspace.save()
}

async function createSpace(input: {
  name: string
  description: string
  workspaceId: Types.ObjectId
  members: Array<{ user: Types.ObjectId; role: 'admin' | 'member' | 'viewer' }>
}) {
  const space = await Space.create({
    name: input.name,
    description: input.description,
    workspace: input.workspaceId,
    members: input.members.map((m) => ({ ...m, joinedAt: daysFromNow(-30) })),
    boards: [],
    isActive: true,
    archived: false,
    archivedAt: null,
  })
  await Workspace.findByIdAndUpdate(input.workspaceId, { $push: { spaces: space._id } })
  return space
}

async function createBoardWithColumns(input: {
  name: string
  description: string
  type: 'kanban' | 'list' | 'calendar' | 'timeline'
  spaceId: Types.ObjectId
  ownerId: Types.ObjectId
  memberIds: Types.ObjectId[]
  columnNames: string[]
  wipLimit?: number | null
}) {
  const board = await Board.create({
    name: input.name,
    description: input.description,
    type: input.type,
    visibility: 'workspace',
    space: input.spaceId,
    owner: input.ownerId,
    members: input.memberIds.map((user) => ({
      user,
      permissions: ['view', 'edit', 'delete', 'manage_columns', 'manage_members'],
      addedAt: daysFromNow(-20),
    })),
    archived: false,
    isActive: true,
  })
  await Space.findByIdAndUpdate(input.spaceId, { $push: { boards: board._id } })

  const columns = []
  for (const [index, name] of input.columnNames.entries()) {
    const column = await Column.create({
      name,
      board: board._id,
      position: index,
      taskIds: [],
      limit: index === 1 ? (input.wipLimit ?? 6) : null,
      isActive: true,
    })
    columns.push(column)
  }
  return { board, columns }
}

const TASK_TITLES = [
  'Ship onboarding checklist',
  'Fix OAuth callback mismatch',
  'Design empty-state illustrations',
  'Write Q3 launch copy',
  'Add board filters',
  'My tasks sidebar page',
  'Deep-link task drawer',
  'Optimistic drag-and-drop',
  'Calendar recurring dates',
  'Mention teammates in comments',
  'GitHub issue sync mapping',
  'Drive attachment preview',
  'AI Edit diff on task',
  'Standup digest email',
  'WIP limit enforcement',
  'Keyboard shortcuts cheatsheet',
  'Invite landing polish',
  'Analytics overdue jump-link',
  'Template preview modal',
  'Presence on task drawer',
  'Archive restore confirmation',
  'RTL QA pass for board',
  'Notification preview panel QA',
  'Stripe plan entitlements copy',
  'Seed data documentation',
  'Column cover textures',
  'Blocked-by dependency UI',
  'Chat share board link',
  'Risk heatmap for sprint',
  'Mobile kanban snap scroll',
]

async function seedTasks(input: {
  boardId: Types.ObjectId
  spaceId: Types.ObjectId
  columns: Array<{ _id: Types.ObjectId }>
  people: Types.ObjectId[]
  reporterId: Types.ObjectId
  startIndex: number
  count: number
}) {
  const tasks = []
  for (let i = 0; i < input.count; i += 1) {
    const globalIndex = input.startIndex + i
    const column = pick(input.columns, globalIndex)
    const status = pick(STATUSES, globalIndex)
    const assignee = pick(input.people, globalIndex)
    const watcher = pick(input.people, globalIndex + 3)
    const dueOffsets = [-4, -1, 0, 1, 3, 7, 14, null] as const
    const dueOffset = pick(dueOffsets, globalIndex)
    const commentAuthor = pick(input.people, globalIndex + 1)

    const task = await Task.create({
      title: pick(TASK_TITLES, globalIndex),
      description: `${pick(TASK_TITLES, globalIndex)} — seeded demo card for UI review. Includes assignees, due date, tags, checklist, and a comment.`,
      board: input.boardId,
      space: input.spaceId,
      column: column._id,
      priority: pick(PRIORITIES, globalIndex),
      status,
      color: pick(COLORS, globalIndex),
      assignees: [assignee],
      reporter: input.reporterId,
      watchers: watcher && String(watcher) !== String(assignee) ? [watcher] : [],
      tags: [pick(TAGS, globalIndex), pick(TAGS, globalIndex + 2)],
      dueDate: dueOffset === null ? null : daysFromNow(dueOffset),
      position: i,
      archived: false,
      checklist: [
        { text: 'Clarify acceptance criteria', done: globalIndex % 3 === 0 },
        { text: 'Pair review with teammate', done: status === 'done' },
        { text: 'Update changelog', done: false },
      ],
      comments: [
        {
          author: commentAuthor,
          body:
            globalIndex % 2 === 0
              ? 'Looks good — can we ship this behind a flag first?'
              : 'Blocked on copy from marketing. Pinging Jane.',
          attachments: [],
        },
      ],
    })

    await Column.findByIdAndUpdate(column._id, {
      $push: {
        taskIds: {
          task: task._id,
          position: i,
          addedAt: new Date(),
        },
      },
    })
    tasks.push(task)
  }
  return tasks
}

async function seedNotifications(
  jonId: Types.ObjectId,
  janeId: Types.ObjectId,
  task: { _id: Types.ObjectId },
  boardId: Types.ObjectId,
  workspaceId: Types.ObjectId,
) {
  const items = [
    {
      recipient: jonId,
      sender: janeId,
      type: 'task_assigned',
      title: 'Jane assigned you a task',
      message: 'You were assigned “Ship onboarding checklist”.',
      relatedEntity: { entityType: 'task' as const, entityId: task._id },
      priority: 'high' as const,
      metadata: { boardId: String(boardId) },
      tags: ['task'],
      isRead: false,
    },
    {
      recipient: jonId,
      sender: janeId,
      type: 'task_comment',
      title: 'New comment',
      message: 'Jane commented on a sprint task.',
      relatedEntity: { entityType: 'task' as const, entityId: task._id },
      priority: 'medium' as const,
      metadata: { boardId: String(boardId), taskId: String(task._id) },
      tags: ['comment'],
      isRead: false,
    },
    {
      recipient: jonId,
      sender: janeId,
      type: 'deadline_update',
      title: 'Due date changed',
      message: 'A task due date moved to tomorrow.',
      relatedEntity: { entityType: 'board' as const, entityId: boardId },
      priority: 'urgent' as const,
      metadata: { boardId: String(boardId) },
      tags: ['deadline'],
      isRead: true,
      readAt: daysFromNow(-1),
    },
    {
      recipient: janeId,
      sender: jonId,
      type: 'workspace_role_changed',
      title: 'Role updated',
      message: 'Jon made you an admin on Acme Product.',
      relatedEntity: { entityType: 'workspace' as const, entityId: workspaceId },
      priority: 'medium' as const,
      metadata: {},
      tags: ['role'],
      isRead: false,
    },
    {
      recipient: jonId,
      sender: jonId,
      type: 'ai_agent',
      title: 'Agent updated Sprint 24',
      message: 'Created task “Add board filters” · Moved 2 cards to Review',
      relatedEntity: { entityType: 'board' as const, entityId: boardId },
      priority: 'low' as const,
      metadata: { boardId: String(boardId), mode: 'confirm_write' },
      tags: ['ai', 'agent'],
      isRead: false,
    },
  ]

  await Notification.insertMany(items)
}

async function seedTemplates(createdBy: Types.ObjectId, likedBy: Types.ObjectId[]) {
  const list = (...titles: string[]) => titles.map((title, order) => ({ title, name: title, order }))

  const specs = [
    {
      name: 'Product sprint board',
      category: 'Development' as const,
      type: 'board' as const,
      description: 'Ready-to-use sprint board: backlog through done with sample cards.',
      tags: ['development', 'sprint', 'agile', 'seed'],
      content: {
        lists: list('Backlog', 'In progress', 'Review', 'Done'),
        cards: [
          { title: 'Refine sprint goal', listIndex: 0, priority: 'high', tags: ['planning'] },
          { title: 'Ship auth polish', listIndex: 1, priority: 'medium', tags: ['frontend'] },
          { title: 'QA checklist', listIndex: 2, priority: 'medium', tags: ['qa'] },
          { title: 'Retro notes', listIndex: 3, priority: 'low', tags: ['process'] },
        ],
      },
    },
    {
      name: 'Marketing campaign',
      category: 'Marketing' as const,
      type: 'board' as const,
      description: 'Campaign workflow from brief to live channels.',
      tags: ['marketing', 'campaign', 'seed'],
      content: {
        lists: list('Brief', 'Assets', 'Scheduled', 'Live'),
        cards: [
          { title: 'Write campaign brief', listIndex: 0, priority: 'high', tags: ['copy'] },
          { title: 'Design hero assets', listIndex: 1, priority: 'medium', tags: ['design'] },
          { title: 'Schedule social posts', listIndex: 2, priority: 'medium', tags: ['channels'] },
        ],
      },
    },
    {
      name: 'Design critique',
      category: 'Design' as const,
      type: 'board' as const,
      description: 'Explore → critique → polish → handoff for design teams.',
      tags: ['design', 'critique', 'seed'],
      content: {
        lists: list('Explore', 'Critique', 'Polish', 'Handoff'),
        cards: [
          { title: 'Moodboard options', listIndex: 0, priority: 'medium', tags: ['explore'] },
          { title: 'Stakeholder review', listIndex: 1, priority: 'high', tags: ['feedback'] },
        ],
      },
    },
    {
      name: 'Support triage',
      category: 'Support' as const,
      type: 'board' as const,
      description: 'Customer support inbox from new tickets to resolved.',
      tags: ['support', 'triage', 'seed'],
      content: {
        lists: list('New', 'Investigating', 'Waiting', 'Resolved'),
        cards: [
          { title: 'Login failure report', listIndex: 0, priority: 'high', tags: ['bug'] },
          { title: 'Billing question', listIndex: 1, priority: 'medium', tags: ['billing'] },
        ],
      },
    },
    {
      name: 'Hiring pipeline',
      category: 'HR' as const,
      type: 'board' as const,
      description: 'Recruiting pipeline from sourced candidates to offer.',
      tags: ['hr', 'hiring', 'seed'],
      content: {
        lists: list('Sourced', 'Screen', 'Interview', 'Offer'),
        cards: [
          { title: 'Senior frontend candidate', listIndex: 0, priority: 'high', tags: ['eng'] },
          { title: 'Phone screen — PM role', listIndex: 1, priority: 'medium', tags: ['pm'] },
        ],
      },
    },
    {
      name: 'Sales opportunity tracker',
      category: 'Sales' as const,
      type: 'board' as const,
      description: 'Track deals from lead to closed-won.',
      tags: ['sales', 'pipeline', 'seed'],
      content: {
        lists: list('Lead', 'Qualified', 'Proposal', 'Closed'),
        cards: [
          { title: 'Acme discovery call', listIndex: 0, priority: 'medium', tags: ['outbound'] },
          { title: 'Send proposal draft', listIndex: 2, priority: 'high', tags: ['proposal'] },
        ],
      },
    },
    {
      name: 'Ops incident response',
      category: 'Operations' as const,
      type: 'board' as const,
      description: 'Incident board for detect → mitigate → resolve → postmortem.',
      tags: ['ops', 'incident', 'seed'],
      content: {
        lists: list('Detect', 'Mitigate', 'Resolve', 'Postmortem'),
        cards: [
          { title: 'Elevated API latency', listIndex: 0, priority: 'urgent', tags: ['api'] },
          { title: 'Rollback checklist', listIndex: 1, priority: 'high', tags: ['runbook'] },
        ],
      },
    },
    {
      name: 'Product launch space',
      category: 'General' as const,
      type: 'space' as const,
      description: 'Multi-board space template: eng, marketing, and launch checklist.',
      tags: ['launch', 'space', 'seed'],
      content: {
        boards: [
          {
            name: 'Engineering',
            description: 'Build and ship the release.',
            lists: list('Backlog', 'Building', 'QA', 'Shipped'),
          },
          {
            name: 'Go-to-market',
            description: 'Messaging, assets, and channels.',
            lists: list('Ideas', 'Drafting', 'Approved', 'Published'),
          },
          {
            name: 'Launch checklist',
            description: 'Day-of and follow-up tasks.',
            lists: list('Prep', 'Launch day', 'Follow-up'),
          },
        ],
      },
    },
  ]

  for (const spec of specs) {
    const content = normalizeSeedTemplateContent(spec.content)
    await Template.create({
      name: spec.name,
      category: spec.category,
      type: spec.type,
      description: spec.description,
      content,
      createdBy,
      isPublic: true,
      isSystem: true,
      status: 'active',
      tags: spec.tags,
      views: 20 + Math.floor(Math.random() * 80),
      likedBy,
      usage: {
        totalUses: 5 + Math.floor(Math.random() * 40),
        lastUsed: daysFromNow(-1),
        rating: { average: 4.4, count: 12 },
      },
      version: { major: 1, minor: 0, patch: 0 },
    })
  }
}

function normalizeSeedTemplateContent(content: {
  lists?: Array<{ title: string; name: string; order: number }>
  cards?: Array<{ title: string; listIndex: number; priority: string; tags: string[] }>
  boards?: Array<{
    name: string
    description?: string
    lists: Array<{ title: string; name: string; order: number }>
  }>
}) {
  if (Array.isArray(content.boards)) {
    return {
      boards: content.boards.map((board) => ({
        name: board.name,
        description: board.description,
        lists: board.lists,
      })),
    }
  }

  const lists = content.lists ?? []
  const cards = (content.cards ?? []).map((card, order) => {
    const list = lists[card.listIndex] ?? lists[0]
    return {
      title: card.title,
      description: '',
      listId: list ? `list-${list.order}` : 'list-0',
      order,
      priority: card.priority,
      tags: card.tags,
      estimatedHours: 0,
    }
  })

  return {
    lists: lists.map((entry) => ({
      id: `list-${entry.order}`,
      title: entry.title,
      name: entry.name,
      order: entry.order,
    })),
    cards,
  }
}

async function main() {
  const reset = process.argv.includes('--reset')

  if (env.isProd) {
    console.error('Refusing to seed when NODE_ENV=production')
    process.exit(1)
  }

  await connectDB()
  const dbName = mongoose.connection.name
  const host = mongoose.connection.host
  console.log(`Seeding database ${host}/${dbName}`)

  if (reset) {
    console.log('Resetting product collections…')
    await resetCollections()
  } else {
    const existing = await User.findOne({ email: 'jondoe@gmail.com' })
    if (existing) {
      await seedAdmin()
      console.log('Demo users already exist. Re-run with --reset to wipe product data and seed again.')
      console.log('Admin panel: http://localhost:5175/login')
      console.log(`  ${SUPER_ADMIN_EMAIL} / ${DEMO_PASSWORD}`)
      console.log(`  jondoe@gmail.com / ${DEMO_PASSWORD}`)
      await mongoose.disconnect()
      return
    }
  }

  await seedAdmin()
  const users = await seedUsers()
  const byEmail = Object.fromEntries(users.map((user) => [user.email, user]))
  const jon = byEmail['jondoe@gmail.com']!
  const jane = byEmail['janemaria@gmail.com']!
  const team = users.map((user) => user._id)

  const acme = await Workspace.create({
    name: 'Acme Product',
    description: 'Core product org — engineering, marketing, and ops.',
    avatar: avatarUrl('Acme Product'),
    owner: jon._id,
    members: [],
    spaces: [],
    isActive: true,
    archived: false,
    rules: {
      content:
        'WIP limit 6 per In progress.\nEvery card needs an owner before Review.\nShip behind a flag when unsure.\nPing #launch 24h before go-live.',
      updatedAt: new Date(),
      updatedBy: jon._id,
    },
  })
  await addMembers(
    acme._id,
    jon._id,
    users.slice(1).map((user, index) => ({
      user: user._id,
      role: user.email === 'janemaria@gmail.com' || index < 2 ? 'admin' : 'member',
    })),
  )

  const engineering = await createSpace({
    name: 'Engineering',
    description: 'Platform and product delivery.',
    workspaceId: acme._id,
    members: team.map((user, index) => ({
      user,
      role: index < 3 ? 'admin' : 'member',
    })),
  })
  const marketing = await createSpace({
    name: 'Marketing',
    description: 'Campaigns and launch comms.',
    workspaceId: acme._id,
    members: [jon._id, jane._id, byEmail['emma.wilson@taskflow.demo']!._id, byEmail['lucas.martin@taskflow.demo']!._id].map(
      (user, index) => ({ user, role: index === 0 ? 'admin' : 'member' }),
    ),
  })
  const ops = await createSpace({
    name: 'Operations',
    description: 'Hiring, support, and internal tools.',
    workspaceId: acme._id,
    members: [jon._id, jane._id, byEmail['hannah.cole@taskflow.demo']!._id].map((user, index) => ({
      user,
      role: index < 2 ? 'admin' : 'member',
    })),
  })

  const sprint = await createBoardWithColumns({
    name: 'Sprint 24',
    description: 'Current delivery board — filters, AI, and collab work.',
    type: 'kanban',
    spaceId: engineering._id,
    ownerId: jon._id,
    memberIds: team,
    columnNames: ['Backlog', 'In progress', 'Review', 'Done'],
    wipLimit: 6,
  })
  const bugs = await createBoardWithColumns({
    name: 'Bug tracker',
    description: 'Incoming defects and regressions.',
    type: 'list',
    spaceId: engineering._id,
    ownerId: jane._id,
    memberIds: team.slice(0, 8),
    columnNames: ['New', 'Investigating', 'Waiting', 'Resolved'],
  })
  const campaign = await createBoardWithColumns({
    name: 'Q3 Launch',
    description: 'Website, email, and social for the launch.',
    type: 'calendar',
    spaceId: marketing._id,
    ownerId: jane._id,
    memberIds: [jon._id, jane._id, byEmail['emma.wilson@taskflow.demo']!._id, byEmail['lucas.martin@taskflow.demo']!._id],
    columnNames: ['Brief', 'In production', 'Scheduled', 'Shipped'],
  })
  const hiring = await createBoardWithColumns({
    name: 'Hiring pipeline',
    description: 'Open roles and interview loops.',
    type: 'timeline',
    spaceId: ops._id,
    ownerId: jon._id,
    memberIds: [jon._id, jane._id, byEmail['hannah.cole@taskflow.demo']!._id],
    columnNames: ['Sourced', 'Screen', 'Interview', 'Offer'],
  })

  const sprintTasks = await seedTasks({
    boardId: sprint.board._id,
    spaceId: engineering._id,
    columns: sprint.columns,
    people: team,
    reporterId: jon._id,
    startIndex: 0,
    count: 18,
  })
  await seedTasks({
    boardId: bugs.board._id,
    spaceId: engineering._id,
    columns: bugs.columns,
    people: team.slice(0, 8),
    reporterId: jane._id,
    startIndex: 8,
    count: 10,
  })
  await seedTasks({
    boardId: campaign.board._id,
    spaceId: marketing._id,
    columns: campaign.columns,
    people: [jon._id, jane._id, byEmail['emma.wilson@taskflow.demo']!._id, byEmail['lucas.martin@taskflow.demo']!._id],
    reporterId: jane._id,
    startIndex: 4,
    count: 9,
  })
  await seedTasks({
    boardId: hiring.board._id,
    spaceId: ops._id,
    columns: hiring.columns,
    people: [jon._id, jane._id, byEmail['hannah.cole@taskflow.demo']!._id],
    reporterId: jon._id,
    startIndex: 12,
    count: 6,
  })

  if (sprintTasks[1] && sprintTasks[0]) {
    sprintTasks[1].dependencies = [{ task: sprintTasks[0]._id, type: 'blocked_by' }]
    await sprintTasks[1].save()
  }

  const janeStudio = await Workspace.create({
    name: 'Jane’s Studio',
    description: 'Design experiments and client moodboards.',
    avatar: avatarUrl('Jane Studio'),
    owner: jane._id,
    members: [
      { user: jane._id, role: 'admin', joinedAt: daysFromNow(-20) },
      { user: jon._id, role: 'member', joinedAt: daysFromNow(-10) },
      { user: byEmail['sara.benali@taskflow.demo']!._id, role: 'member', joinedAt: daysFromNow(-8) },
    ],
    spaces: [],
    isActive: true,
    archived: false,
    rules: { content: 'Share Figma links in the card description.', updatedAt: new Date(), updatedBy: jane._id },
  })
  const studioSpace = await createSpace({
    name: 'Client work',
    description: 'Active retainers.',
    workspaceId: janeStudio._id,
    members: [
      { user: jane._id, role: 'admin' },
      { user: jon._id, role: 'member' },
      { user: byEmail['sara.benali@taskflow.demo']!._id, role: 'member' },
    ],
  })
  const studioBoard = await createBoardWithColumns({
    name: 'Brand refresh',
    description: 'Logo, type, and color explorations.',
    type: 'kanban',
    spaceId: studioSpace._id,
    ownerId: jane._id,
    memberIds: [jane._id, jon._id, byEmail['sara.benali@taskflow.demo']!._id],
    columnNames: ['Explore', 'Critique', 'Polish', 'Handoff'],
  })
  await seedTasks({
    boardId: studioBoard.board._id,
    spaceId: studioSpace._id,
    columns: studioBoard.columns,
    people: [jane._id, jon._id, byEmail['sara.benali@taskflow.demo']!._id],
    reporterId: jane._id,
    startIndex: 2,
    count: 8,
  })

  const inbox = await Workspace.create({
    name: 'Jon’s Inbox',
    description: 'Personal scratch space.',
    avatar: avatarUrl('Inbox'),
    owner: jon._id,
    members: [{ user: jon._id, role: 'admin', joinedAt: daysFromNow(-5) }],
    spaces: [],
    isActive: true,
    archived: false,
  })
  const inboxSpace = await createSpace({
    name: 'Someday',
    description: 'Unscheduled ideas.',
    workspaceId: inbox._id,
    members: [{ user: jon._id, role: 'admin' }],
  })
  const inboxBoard = await createBoardWithColumns({
    name: 'Notes',
    description: 'Quick capture.',
    type: 'list',
    spaceId: inboxSpace._id,
    ownerId: jon._id,
    memberIds: [jon._id],
    columnNames: ['Inbox', 'This week', 'Done'],
  })
  await seedTasks({
    boardId: inboxBoard.board._id,
    spaceId: inboxSpace._id,
    columns: inboxBoard.columns,
    people: [jon._id],
    reporterId: jon._id,
    startIndex: 20,
    count: 5,
  })

  const archived = await Workspace.create({
    name: 'Old Agency',
    description: 'Archived client workspace — restore from dashboard.',
    avatar: avatarUrl('Old Agency'),
    owner: jon._id,
    members: [
      { user: jon._id, role: 'admin', joinedAt: daysFromNow(-200) },
      { user: jane._id, role: 'member', joinedAt: daysFromNow(-180) },
    ],
    spaces: [],
    isActive: true,
    archived: true,
    archivedAt: daysFromNow(-40),
  })
  const archivedSpace = await createSpace({
    name: 'Sunset accounts',
    description: 'No longer active.',
    workspaceId: archived._id,
    members: [
      { user: jon._id, role: 'admin' },
      { user: jane._id, role: 'member' },
    ],
  })
  archivedSpace.archived = true
  archivedSpace.archivedAt = daysFromNow(-40)
  await archivedSpace.save()
  const archivedBoard = await createBoardWithColumns({
    name: 'Wrap-up',
    description: 'Final deliverables.',
    type: 'kanban',
    spaceId: archivedSpace._id,
    ownerId: jon._id,
    memberIds: [jon._id, jane._id],
    columnNames: ['Todo', 'Done'],
  })
  archivedBoard.board.archived = true
  archivedBoard.board.archivedAt = daysFromNow(-40)
  archivedBoard.board.isActive = false
  await archivedBoard.board.save()

  await seedNotifications(jon._id, jane._id, sprintTasks[0]!, sprint.board._id, acme._id)
  await seedTemplates(jon._id, [jon._id, jane._id, byEmail['alex.chen@taskflow.demo']!._id])

  const invite = await Invitation.create({
    type: 'workspace',
    invitedBy: jon._id,
    invitedUser: { email: 'pending.guest@gmail.com', name: 'Pending Guest' },
    targetEntity: { type: 'Workspace', id: acme._id, name: acme.name },
    role: 'member',
    status: 'pending',
    message: 'Join Acme Product on TaskFlow.',
    expiresAt: daysFromNow(14),
    metadata: {
      invitationMethod: 'email',
      inviteUrl: `${env.FRONTEND_URL.replace(/\/$/, '')}/invite/pending-token-placeholder`,
    },
  })
  invite.metadata.inviteUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/invite/${invite.token}`
  await invite.save()

  await Invitation.create({
    type: 'workspace',
    invitedBy: jane._id,
    invitedUser: { email: jon.email, name: jon.name, userId: jon._id },
    targetEntity: { type: 'Workspace', id: janeStudio._id, name: janeStudio.name },
    role: 'member',
    status: 'accepted',
    acceptedAt: daysFromNow(-10),
    message: 'Come critique the brand refresh.',
    expiresAt: daysFromNow(20),
    metadata: { invitationMethod: 'email' },
  })

  await Chat.create({
    chatId: `chat_seed_${crypto.randomBytes(4).toString('hex')}`,
    participants: [
      {
        id: jon._id,
        model: 'User',
        name: jon.name,
        email: jon.email,
        avatar: jon.avatar,
        isOnline: false,
        lastSeen: daysFromNow(-1),
      },
    ],
    messages: [
      {
        sender: { id: jon._id, model: 'User', name: jon.name, avatar: jon.avatar },
        content: 'Hi — the board filters slice is ready for a quick look.',
        messageType: 'text',
        attachments: [],
        isRead: true,
        readAt: daysFromNow(-1),
      },
      {
        sender: { id: jon._id, model: 'User', name: jon.name, avatar: jon.avatar },
        content: 'Also seeded demo data so empty states are gone.',
        messageType: 'text',
        attachments: [],
        isRead: false,
      },
    ],
    status: 'active',
    category: 'feature_request',
    priority: 'medium',
    tags: ['seed'],
  })

  console.log('\nSeed complete.\n')
  console.log('Login at http://localhost:5173/login')
  console.log(`  ${jon.email}     /  ${DEMO_PASSWORD}`)
  console.log(`  ${jane.email} /  ${DEMO_PASSWORD}`)
  console.log(`  (all ${SEED_USERS.length} users share the same password)\n`)
  console.log('Admin panel at http://localhost:5175/login')
  console.log(`  ${SUPER_ADMIN_EMAIL} /  ${DEMO_PASSWORD}`)
  console.log(`  jondoe@gmail.com      /  ${DEMO_PASSWORD}\n`)
  console.log(`Acme Product workspace: /workspaces/${idOf(acme)}`)
  console.log(`Sprint 24 board:        /boards/${idOf(sprint.board)}`)
  console.log(`Pending invite:         /invite/${invite.token}`)
  console.log('')

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('Seed failed:', error)
  await mongoose.disconnect().catch(() => undefined)
  process.exit(1)
})
