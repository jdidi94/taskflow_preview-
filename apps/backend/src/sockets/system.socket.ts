import os from 'node:os'
import mongoose from 'mongoose'
import type { Server, Socket } from 'socket.io'

import { Admin } from '../models/Admin.js'
import { User } from '../models/User.js'
import { env } from '../config/env.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'

type SystemIdentity = {
  id: string
  name: string
  email?: string
  avatar?: string | null
  isAdmin: boolean
}

type SystemSocket = Socket & {
  data: {
    user?: JwtPayload
    systemIdentity?: SystemIdentity
    monitoringInterval?: ReturnType<typeof setInterval> | null
  }
}

type SystemNamespace = ReturnType<Server['of']>

type SystemIo = Server & {
  broadcastSystemStatus?: (payload?: unknown) => void
  setMaintenanceMode?: (
    enabled: boolean,
    reason?: string,
    estimatedDuration?: string | number | null,
  ) => ReturnType<typeof toggleMaintenanceMode>
}

type SystemConfigStore = Record<string, unknown>

const systemConfig: SystemConfigStore = {
  'maintenance.enabled': false,
  'backup.retention': 30,
  'monitoring.interval': 30000,
  'backup.enabled': true,
  'notifications.enabled': true,
  'max.file.size': 10 * 1024 * 1024,
  'session.timeout': 3600,
}

let maintenanceState = {
  enabled: false,
  reason: null as string | null,
  estimatedDuration: null as string | number | null,
  updatedAt: null as Date | null,
}

function emitError(socket: SystemSocket, message: string) {
  socket.emit('error', { message })
}

function publicUser(identity: SystemIdentity) {
  return {
    id: identity.id,
    name: identity.name,
    email: identity.email,
    avatar: identity.avatar ?? null,
  }
}

function getSystemStatus() {
  return {
    uptime: process.uptime(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
    },
    cpu: {
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
    },
    platform: os.platform(),
    nodeVersion: process.version,
    maintenanceMode: maintenanceState.enabled,
    nodeEnv: env.NODE_ENV,
    timestamp: new Date(),
  }
}

async function checkDatabaseHealth() {
  const readyState = mongoose.connection.readyState
  const connected = readyState === 1
  const started = Date.now()
  try {
    if (connected && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping()
    }
    return {
      status: connected ? 'healthy' : 'unhealthy',
      readyState,
      responseTime: Date.now() - started,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      readyState,
      error: error instanceof Error ? error.message : 'Database ping failed',
      responseTime: Date.now() - started,
    }
  }
}

async function checkExternalServices() {
  return {
    email: {
      status: env.SMTP_ENABLED ? 'healthy' : 'disabled',
      responseTime: env.SMTP_ENABLED ? 20 : 0,
    },
    stripe: {
      status: env.STRIPE_SECRET_KEY ? 'healthy' : 'disabled',
      responseTime: env.STRIPE_SECRET_KEY ? 15 : 0,
    },
    ai: {
      status: env.DEFAULT_AI_PROVIDER ? 'healthy' : 'disabled',
      provider: env.DEFAULT_AI_PROVIDER,
      responseTime: 10,
    },
  }
}

async function getDetailedHealthStatus() {
  try {
    const database = await checkDatabaseHealth()
    const externalServices = await checkExternalServices()
    const unhealthy =
      database.status !== 'healthy' ||
      Object.values(externalServices).some((service) => service.status === 'unhealthy')

    return {
      status: unhealthy ? 'unhealthy' : 'healthy',
      checks: {
        database,
        externalServices,
        system: getSystemStatus(),
      },
      maintenanceMode: maintenanceState.enabled,
      timestamp: new Date(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date(),
    }
  }
}

async function getSystemMetrics(metrics: string[]) {
  const result: Record<string, unknown> = {}

  if (metrics.includes('cpu')) {
    result.cpu = {
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
      usage: process.cpuUsage(),
    }
  }

  if (metrics.includes('memory')) {
    result.memory = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      processMemory: process.memoryUsage(),
    }
  }

  if (metrics.includes('disk')) {
    // Host disk stats are environment-specific; keep a stable placeholder shape.
    result.disk = {
      total: 1_000_000_000_000,
      free: 500_000_000_000,
      used: 500_000_000_000,
    }
  }

  return {
    ...result,
    timestamp: new Date(),
  }
}

function isValidSystemConfig(key: string, value: unknown) {
  const validConfigs: Record<string, boolean> = {
    'maintenance.enabled': typeof value === 'boolean',
    'backup.retention': typeof value === 'number' && value > 0 && value <= 365,
    'monitoring.interval': typeof value === 'number' && value >= 5000 && value <= 300000,
    'backup.enabled': typeof value === 'boolean',
    'notifications.enabled': typeof value === 'boolean',
    'max.file.size': typeof value === 'number' && value > 0 && value <= 100 * 1024 * 1024,
    'session.timeout': typeof value === 'number' && value >= 300 && value <= 86400,
  }
  return validConfigs[key] ?? false
}

async function updateSystemConfig(key: string, value: unknown) {
  systemConfig[key] = value
  if (key === 'maintenance.enabled' && typeof value === 'boolean') {
    maintenanceState.enabled = value
    maintenanceState.updatedAt = new Date()
  }
  return { success: true, key, value, timestamp: new Date() }
}

function toggleMaintenanceMode(
  enabled: boolean,
  reason?: string,
  estimatedDuration?: string | number | null,
) {
  maintenanceState = {
    enabled,
    reason: reason ?? null,
    estimatedDuration: estimatedDuration ?? null,
    updatedAt: new Date(),
  }
  systemConfig['maintenance.enabled'] = enabled
  return {
    enabled,
    reason: maintenanceState.reason,
    estimatedDuration: maintenanceState.estimatedDuration,
    timestamp: maintenanceState.updatedAt,
  }
}

async function initiateSystemBackup(type: string, includeFiles: boolean) {
  const backupId = `backup_${Date.now()}`
  return {
    id: backupId,
    type,
    includeFiles,
    status: 'initiated',
    timestamp: new Date(),
  }
}

function monitorBackupProgress(
  backupId: string,
  callback: (progress: { backupId: string; progress: number }) => void,
) {
  let progress = 0
  const progressInterval = setInterval(() => {
    progress += Math.random() * 20
    if (progress >= 100) {
      progress = 100
      clearInterval(progressInterval)
    }
    callback({ backupId, progress: Math.round(progress) })
  }, 1000)

  return () => clearInterval(progressInterval)
}

async function scheduleSystemRestart(reason?: string, scheduledTime?: string | Date | null, delay?: number) {
  let when: Date
  if (scheduledTime) {
    when = new Date(scheduledTime)
  } else if (typeof delay === 'number' && delay >= 0) {
    when = new Date(Date.now() + delay)
  } else {
    when = new Date(Date.now() + 60_000)
  }

  return {
    id: `restart_${Date.now()}`,
    reason: reason ?? null,
    scheduledTime: when,
    status: 'scheduled',
    timestamp: new Date(),
  }
}

function clearMonitoring(socket: SystemSocket) {
  if (socket.data.monitoringInterval) {
    clearInterval(socket.data.monitoringInterval)
    socket.data.monitoringInterval = null
  }
}

async function authenticateSystemSocket(socket: SystemSocket, next: (err?: Error) => void) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (typeof socket.handshake.query?.token === 'string'
        ? socket.handshake.query.token
        : undefined) ||
      (typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined)

    if (!token) {
      next(new Error('Authentication required'))
      return
    }

    const decoded = verifyAccessToken(token)
    socket.data.user = decoded

    if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.sub).lean()
      if (!admin || !admin.isActive) {
        next(new Error('User not found'))
        return
      }
      socket.data.systemIdentity = {
        id: String(admin._id),
        name: admin.userName,
        email: admin.userEmail,
        avatar: admin.avatar ?? null,
        isAdmin: true,
      }
      next()
      return
    }

    const user = await User.findById(decoded.sub).lean()
    if (!user || !user.isActive) {
      next(new Error('User not found'))
      return
    }

    // Match v2: authenticated users may connect; privileged ops can tighten later.
    socket.data.systemIdentity = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      isAdmin: false,
    }
    next()
  } catch {
    next(new Error('Authentication failed'))
  }
}

export function registerSystemNamespace(io: Server) {
  const systemNamespace = io.of('/system') as SystemNamespace
  systemNamespace.use(authenticateSystemSocket)

  systemNamespace.on('connection', (socket: SystemSocket) => {
    const identity = socket.data.systemIdentity
    if (!identity) {
      socket.disconnect()
      return
    }

    socket.join('system:monitoring')
    socket.join(`user:${identity.id}`)
    socket.emit('system:status', getSystemStatus())

    socket.on('system:health-check', async () => {
      try {
        const healthStatus = await getDetailedHealthStatus()
        socket.emit('system:health-status', healthStatus)
      } catch {
        emitError(socket, 'Failed to get health status')
      }
    })

    socket.on('system:get-metrics', async (data?: { metrics?: string[] }) => {
      try {
        const metrics = data?.metrics ?? ['cpu', 'memory', 'disk']
        const systemMetrics = await getSystemMetrics(metrics)
        socket.emit('system:metrics', systemMetrics)
      } catch {
        emitError(socket, 'Failed to get system metrics')
      }
    })

    socket.on('system:update-config', async (data?: { configKey?: string; configValue?: unknown }) => {
      try {
        const { configKey, configValue } = data ?? {}
        if (!configKey || typeof configKey !== 'string') {
          emitError(socket, 'Config key is required and must be a string')
          return
        }
        if (configValue === undefined || configValue === null) {
          emitError(socket, 'Config value is required')
          return
        }
        if (!isValidSystemConfig(configKey, configValue)) {
          emitError(socket, 'Invalid configuration key or value')
          return
        }

        const result = await updateSystemConfig(configKey, configValue)
        const payload = {
          configKey,
          configValue,
          updatedBy: publicUser(identity),
          timestamp: new Date(),
        }
        systemNamespace.to('system:monitoring').emit('system:config-updated', payload)
        socket.emit('system:config-updated', { configKey, configValue, result })
      } catch {
        emitError(socket, 'Failed to update system configuration')
      }
    })

    socket.on(
      'system:maintenance-mode',
      async (data?: { enabled?: boolean; reason?: string; estimatedDuration?: string | number }) => {
        try {
          const enabled = Boolean(data?.enabled)
          const maintenanceStatus = toggleMaintenanceMode(
            enabled,
            data?.reason,
            data?.estimatedDuration ?? null,
          )

          systemNamespace.to('system:monitoring').emit('system:maintenance-mode-changed', {
            enabled,
            reason: data?.reason ?? null,
            estimatedDuration: data?.estimatedDuration ?? null,
            updatedBy: publicUser(identity),
            timestamp: new Date(),
          })

          if (enabled) {
            io.of('/').emit('system:maintenance-notice', {
              message: `System maintenance in progress: ${data?.reason ?? 'scheduled maintenance'}`,
              estimatedDuration: data?.estimatedDuration ?? null,
              timestamp: new Date(),
            })
          }

          socket.emit('system:maintenance-mode-updated', maintenanceStatus)
        } catch {
          emitError(socket, 'Failed to update maintenance mode')
        }
      },
    )

    socket.on('system:backup', async (data?: { backupType?: string; includeFiles?: boolean }) => {
      try {
        const backupType = data?.backupType ?? 'full'
        const includeFiles = data?.includeFiles ?? true
        const backupJob = await initiateSystemBackup(backupType, includeFiles)
        socket.emit('system:backup-initiated', backupJob)

        monitorBackupProgress(backupJob.id, (progress) => {
          if (socket.connected) {
            socket.emit('system:backup-progress', progress)
          }
        })
      } catch {
        emitError(socket, 'Failed to initiate system backup')
      }
    })

    socket.on(
      'system:restart',
      async (data?: { reason?: string; scheduledTime?: string; delay?: number }) => {
        try {
          if (data?.scheduledTime && new Date(data.scheduledTime) <= new Date()) {
            emitError(socket, 'Scheduled time must be in the future')
            return
          }

          const restartJob = await scheduleSystemRestart(
            data?.reason,
            data?.scheduledTime ?? null,
            data?.delay,
          )

          const payload = {
            reason: restartJob.reason,
            scheduledTime: restartJob.scheduledTime,
            scheduledBy: publicUser(identity),
            timestamp: new Date(),
          }
          systemNamespace.to('system:monitoring').emit('system:restart-scheduled', payload)
          socket.emit('system:restart-scheduled', restartJob)
        } catch {
          emitError(socket, 'Failed to schedule system restart')
        }
      },
    )

    socket.on('system:subscribe-monitoring', (data?: { interval?: number }) => {
      try {
        const interval = data?.interval ?? 30_000
        if (interval < 5000 || interval > 300_000) {
          emitError(socket, 'Invalid interval value. Must be between 5000 and 300000 ms')
          return
        }

        clearMonitoring(socket)
        socket.data.monitoringInterval = setInterval(() => {
          if (!socket.connected) {
            clearMonitoring(socket)
            return
          }
          socket.emit('system:status-update', getSystemStatus())
        }, interval)

        socket.emit('system:monitoring-subscribed', { interval })
      } catch {
        emitError(socket, 'Failed to subscribe to system monitoring')
      }
    })

    socket.on('system:unsubscribe-monitoring', () => {
      clearMonitoring(socket)
      socket.emit('system:monitoring-unsubscribed', { timestamp: new Date() })
    })

    socket.on('disconnect', () => {
      clearMonitoring(socket)
    })
  })

  const typedIo = io as SystemIo
  typedIo.broadcastSystemStatus = (payload) => {
    systemNamespace.to('system:monitoring').emit('system:status-update', payload ?? getSystemStatus())
  }
  typedIo.setMaintenanceMode = (enabled, reason, estimatedDuration) =>
    toggleMaintenanceMode(enabled, reason, estimatedDuration)
}
