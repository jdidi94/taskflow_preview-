import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type GitHubPulseWindow = 7 | 30

export type IGitHubPulseDay = {
  date: string
  commits: number
  prsMerged: number
  issuesClosed: number
}

export type IGitHubPulseTotals = {
  commits: number
  prsMerged: number
  issuesClosed: number
  series: IGitHubPulseDay[]
}

export type IGitHubRepoStatRow = {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  language: string | null
  stars: number
  forks: number
  openPrs: number
  openIssues: number
  pushedAt: Date | null
  isPrivate: boolean
}

export interface IGitHubOrgSnapshot extends Document {
  workspace: Types.ObjectId
  orgLogin: string
  syncedAt: Date
  syncedBy: Types.ObjectId | null
  overview: {
    reposCount: number
    openPrs: number
    openIssues: number
    lastActivityAt: Date | null
  }
  repos: IGitHubRepoStatRow[]
  pulse7: IGitHubPulseTotals
  pulse30: IGitHubPulseTotals
}

const pulseDaySchema = new Schema<IGitHubPulseDay>(
  {
    date: { type: String, required: true },
    commits: { type: Number, default: 0 },
    prsMerged: { type: Number, default: 0 },
    issuesClosed: { type: Number, default: 0 },
  },
  { _id: false },
)

const pulseTotalsSchema = new Schema<IGitHubPulseTotals>(
  {
    commits: { type: Number, default: 0 },
    prsMerged: { type: Number, default: 0 },
    issuesClosed: { type: Number, default: 0 },
    series: { type: [pulseDaySchema], default: [] },
  },
  { _id: false },
)

const repoStatSchema = new Schema<IGitHubRepoStatRow>(
  {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    htmlUrl: { type: String, required: true },
    language: { type: String, default: null },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    openPrs: { type: Number, default: 0 },
    openIssues: { type: Number, default: 0 },
    pushedAt: { type: Date, default: null },
    isPrivate: { type: Boolean, default: false },
  },
  { _id: false },
)

const githubOrgSnapshotSchema = new Schema<IGitHubOrgSnapshot>(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    orgLogin: { type: String, required: true, trim: true, maxlength: 100 },
    syncedAt: { type: Date, required: true },
    syncedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    overview: {
      reposCount: { type: Number, default: 0 },
      openPrs: { type: Number, default: 0 },
      openIssues: { type: Number, default: 0 },
      lastActivityAt: { type: Date, default: null },
    },
    repos: { type: [repoStatSchema], default: [] },
    pulse7: { type: pulseTotalsSchema, default: () => ({ commits: 0, prsMerged: 0, issuesClosed: 0, series: [] }) },
    pulse30: { type: pulseTotalsSchema, default: () => ({ commits: 0, prsMerged: 0, issuesClosed: 0, series: [] }) },
  },
  { timestamps: true },
)

githubOrgSnapshotSchema.index({ workspace: 1, orgLogin: 1 }, { unique: true })

export const GitHubOrgSnapshot: Model<IGitHubOrgSnapshot> =
  mongoose.models.GitHubOrgSnapshot ??
  mongoose.model<IGitHubOrgSnapshot>('GitHubOrgSnapshot', githubOrgSnapshotSchema)
