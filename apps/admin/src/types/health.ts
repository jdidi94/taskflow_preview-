export type SystemHealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export type SystemHealthSnapshot = {
  status?: SystemHealthStatus | string
  systemPerformance: {
    serverUptime: number
    memoryRssMb: number
    memoryHeapUsedMb: number
    memoryHeapTotalMb?: number
    memoryTotalMb?: number
    memoryFreeMb?: number
    memoryUsedPct?: number
    cpuCores?: number
    loadAverage?: number[]
    platform?: string
    nodeVersion?: string
    nodeEnv: string
  }
  database: {
    connection: string
    readyState: number
    pingMs?: number | null
    error?: string | null
  }
  features: {
    stripeConfigured: boolean
    smtpEnabled: boolean
    defaultAiProvider: string
  }
  checkedAt: string
}

export type SystemLiveStatus = {
  uptime: number
  memory: {
    total: number
    free: number
    used: number
  }
  cpu: {
    loadAverage: number[]
    cores: number
  }
  platform: string
  nodeVersion: string
  maintenanceMode: boolean
  nodeEnv?: string
  timestamp?: string | Date
}

export type SystemServiceCheck = {
  status: string
  responseTime?: number
  provider?: string
  error?: string
}

export type SystemHealthDetail = {
  status: string
  maintenanceMode?: boolean
  error?: string
  checks?: {
    database?: {
      status: string
      readyState?: number
      responseTime?: number
      error?: string
    }
    externalServices?: {
      email?: SystemServiceCheck
      stripe?: SystemServiceCheck
      ai?: SystemServiceCheck
    }
    system?: SystemLiveStatus
  }
  timestamp?: string | Date
}

export type SystemMetrics = {
  cpu?: {
    loadAverage: number[]
    cores: number
  }
  memory?: {
    total: number
    free: number
    used: number
    processMemory?: {
      rss: number
      heapUsed: number
      heapTotal: number
    }
  }
  timestamp?: string | Date
}

export type ConnectionTone = 'live' | 'reconnecting' | 'offline'
