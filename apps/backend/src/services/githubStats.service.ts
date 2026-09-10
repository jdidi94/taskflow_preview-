import { Types } from 'mongoose'

import { logger } from '../config/logger.js'
import { GitHubOrgSnapshot, type IGitHubPulseTotals } from '../models/GitHubOrgSnapshot.js'
import { Workspace } from '../models/Workspace.js'
import { AppError } from '../utils/AppError.js'
import { githubService } from './github.service.js'

const MAX_REPOS = 15
const SYNC_MIN_INTERVAL_MS = 15 * 60 * 1000
const PR_CONCURRENCY = 3

function emptyPulse(days: number): IGitHubPulseTotals {
  const series = []
  const today = startOfUtcDay(new Date())
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    series.push({
      date: d.toISOString().slice(0, 10),
      commits: 0,
      prsMerged: 0,
      issuesClosed: 0,
    })
  }
  return { commits: 0, prsMerged: 0, issuesClosed: 0, series }
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function daysAgoIso(days: number) {
  const d = startOfUtcDay(new Date())
  d.setUTCDate(d.getUTCDate() - (days - 1))
  return isoDate(d)
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0
  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await fn(items[current]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

function buildPulseFromEvents(events: any[], days: number): IGitHubPulseTotals {
  const pulse = emptyPulse(days)
  const byDate = new Map(pulse.series.map((row) => [row.date, row]))
  const cutoff = startOfUtcDay(new Date())
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1))

  for (const event of events) {
    const created = event?.created_at ? new Date(event.created_at) : null
    if (!created || Number.isNaN(created.getTime()) || created < cutoff) continue
    const key = isoDate(created)
    const bucket = byDate.get(key)
    if (!bucket) continue

    const type = String(event.type ?? '')
    if (type === 'PushEvent') {
      const commits = Array.isArray(event.payload?.commits) ? event.payload.commits.length : 1
      bucket.commits += commits
      pulse.commits += commits
    } else if (type === 'PullRequestEvent' && event.payload?.action === 'closed' && event.payload?.pull_request?.merged) {
      bucket.prsMerged += 1
      pulse.prsMerged += 1
    } else if (type === 'IssuesEvent' && event.payload?.action === 'closed') {
      bucket.issuesClosed += 1
      pulse.issuesClosed += 1
    }
  }

  return pulse
}

function assertWorkspaceMember(workspace: InstanceType<typeof Workspace>, userId: string) {
  const uid = String(userId)
  const isOwner = String(workspace.owner) === uid
  const isMember = workspace.members.some((m) => String(m.user) === uid)
  if (!isOwner && !isMember) {
    throw new AppError('Forbidden', 403)
  }
}

export const githubStatsService = {
  async getWorkspaceForStats(workspaceId: string, userId: string) {
    if (!Types.ObjectId.isValid(workspaceId)) throw new AppError('Invalid workspace id', 400)
    const workspace = await Workspace.findById(workspaceId)
    if (!workspace || workspace.archived) throw new AppError('Workspace not found', 404)
    assertWorkspaceMember(workspace, userId)
    return workspace
  },

  async getSnapshot(workspaceId: string, userId: string) {
    const workspace = await this.getWorkspaceForStats(workspaceId, userId)
    const orgLogin = workspace.githubOrg?.login
    if (!orgLogin) {
      return { workspace, orgLogin: null as string | null, snapshot: null }
    }
    const snapshot = await GitHubOrgSnapshot.findOne({ workspace: workspace._id, orgLogin }).lean()
    return { workspace, orgLogin, snapshot }
  },

  async syncWorkspaceOrg(input: {
    workspaceId: string
    userId: string
    accessToken: string
    force?: boolean
  }) {
    const started = Date.now()
    const workspace = await this.getWorkspaceForStats(input.workspaceId, input.userId)
    const orgLogin = workspace.githubOrg?.login
    if (!orgLogin) {
      throw new AppError('Link a GitHub organization to this workspace before syncing stats', 400)
    }

    const existing = await GitHubOrgSnapshot.findOne({ workspace: workspace._id, orgLogin })
    if (
      existing &&
      !input.force &&
      Date.now() - existing.syncedAt.getTime() < SYNC_MIN_INTERVAL_MS
    ) {
      throw new AppError('GitHub stats were synced recently. Try again in a few minutes.', 429, {
        syncedAt: existing.syncedAt,
        retryAfterMinutes: Math.ceil(
          (SYNC_MIN_INTERVAL_MS - (Date.now() - existing.syncedAt.getTime())) / 60000,
        ),
      })
    }

    const allRepos = await githubService.getRepositories(input.accessToken, orgLogin)
    const topRepos = allRepos.slice(0, MAX_REPOS)

    const openPrCounts = await mapPool(topRepos, PR_CONCURRENCY, async (repo) => {
      try {
        return await githubService.countOpenPullRequests(input.accessToken, orgLogin, repo.name)
      } catch (err) {
        logger.warn({ err, repo: repo.fullName }, 'Failed to count open PRs')
        return 0
      }
    })

    const repos = topRepos.map((repo, i) => {
      const openPrs = openPrCounts[i] ?? 0
      const openIssues = Math.max(0, repo.openIssuesCount - openPrs)
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        htmlUrl: repo.htmlUrl,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        openPrs,
        openIssues,
        pushedAt: repo.pushedAt ? new Date(repo.pushedAt) : null,
        isPrivate: repo.isPrivate,
      }
    })

    const openPrsTotal = repos.reduce((sum, r) => sum + r.openPrs, 0)
    const openIssuesTotal = repos.reduce((sum, r) => sum + r.openIssues, 0)
    const lastActivityAt = repos.reduce<Date | null>((latest, r) => {
      if (!r.pushedAt) return latest
      if (!latest || r.pushedAt > latest) return r.pushedAt
      return latest
    }, null)

    // Prefer search totals for org-wide overview when available; fall back to summed top repos.
    let overviewOpenPrs = openPrsTotal
    let overviewOpenIssues = openIssuesTotal
    try {
      const [searchPrs, searchIssues] = await Promise.all([
        githubService.searchCount(input.accessToken, `org:${orgLogin} type:pr state:open`),
        githubService.searchCount(input.accessToken, `org:${orgLogin} type:issue state:open`),
      ])
      overviewOpenPrs = searchPrs
      overviewOpenIssues = searchIssues
    } catch (err) {
      logger.warn({ err, orgLogin }, 'GitHub search counts failed; using repo sums')
    }

    let pulse7 = emptyPulse(7)
    let pulse30 = emptyPulse(30)
    try {
      const since7 = daysAgoIso(7)
      const since30 = daysAgoIso(30)
      const [merged7, closed7, merged30, closed30, events] = await Promise.all([
        githubService.searchCount(
          input.accessToken,
          `org:${orgLogin} type:pr is:merged merged:>=${since7}`,
        ),
        githubService.searchCount(
          input.accessToken,
          `org:${orgLogin} type:issue is:closed closed:>=${since7}`,
        ),
        githubService.searchCount(
          input.accessToken,
          `org:${orgLogin} type:pr is:merged merged:>=${since30}`,
        ),
        githubService.searchCount(
          input.accessToken,
          `org:${orgLogin} type:issue is:closed closed:>=${since30}`,
        ),
        githubService.getOrgEvents(input.accessToken, orgLogin),
      ])

      pulse7 = buildPulseFromEvents(events, 7)
      pulse30 = buildPulseFromEvents(events, 30)
      // Search totals are more complete than public events; prefer them for headline counts.
      pulse7.prsMerged = merged7
      pulse7.issuesClosed = closed7
      pulse30.prsMerged = merged30
      pulse30.issuesClosed = closed30
    } catch (err) {
      logger.warn({ err, orgLogin }, 'GitHub pulse aggregation failed')
    }

    const syncedAt = new Date()
    const snapshot = await GitHubOrgSnapshot.findOneAndUpdate(
      { workspace: workspace._id, orgLogin },
      {
        $set: {
          workspace: workspace._id,
          orgLogin,
          syncedAt,
          syncedBy: new Types.ObjectId(input.userId),
          overview: {
            reposCount: allRepos.length,
            openPrs: overviewOpenPrs,
            openIssues: overviewOpenIssues,
            lastActivityAt,
          },
          repos,
          pulse7,
          pulse30,
        },
      },
      { upsert: true, new: true },
    )

    logger.info(
      {
        workspaceId: input.workspaceId,
        orgLogin,
        repos: repos.length,
        ms: Date.now() - started,
      },
      'GitHub org stats synced',
    )

    return snapshot
  },
}
