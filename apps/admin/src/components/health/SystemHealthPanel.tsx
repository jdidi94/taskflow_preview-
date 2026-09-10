import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { Activity, Cpu, Database, HardDrive, RefreshCw, Server } from 'lucide-react'

import { HealthConnectionBanner } from '@/components/health/HealthConnectionBanner'
import { PageHeader } from '@/components/common/PageHeader'
import { useSystemHealthLive } from '@/hooks/useSystemHealthLive'
import { useI18n } from '@/i18n'
import { useGetSystemHealthQuery } from '@/services/adminAnalyticsApi'

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  return `${hours}h ${mins}m`
}

function roundMb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 100) / 100
}

function Meter({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const tone = clamped >= 90 ? 'bg-destructive' : clamped >= 75 ? 'bg-warning' : 'bg-success'
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{Math.round(clamped)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

function serviceBadge(status: string | undefined, configured: string, notConfigured: string, healthy: string, unhealthy: string) {
  if (!status || status === 'disabled') return { label: notConfigured, variant: 'secondary' as const }
  if (status === 'healthy') return { label: `${configured} · ${healthy}`, variant: 'success' as const }
  return { label: unhealthy, variant: 'error' as const }
}

export function SystemHealthPanel() {
  const { t } = useI18n()
  const { data, isLoading, isError, isFetching, refetch } = useGetSystemHealthQuery(undefined, {
    pollingInterval: 30_000,
  })
  const { tone, liveStatus, healthDetail, metrics, reconnect, refreshLive } = useSystemHealthLive()
  const snapshot = data?.data

  if (isLoading && !snapshot) return <Loading label={t('common.loading')} />

  if ((isError || !snapshot) && !liveStatus) {
    return (
      <div className="space-y-3">
        <PageHeader title={t('health.title')} subtitle={t('health.subtitle')} />
        <Alert variant="error" title={t('health.loadError')} />
        <Button variant="outline" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const uptime = liveStatus?.uptime ?? snapshot?.systemPerformance.serverUptime ?? 0
  const memoryUsedPct =
    liveStatus && liveStatus.memory.total > 0
      ? (liveStatus.memory.used / liveStatus.memory.total) * 100
      : (snapshot?.systemPerformance.memoryUsedPct ?? 0)
  const rssMb =
    metrics?.memory?.processMemory?.rss != null
      ? roundMb(metrics.memory.processMemory.rss)
      : (snapshot?.systemPerformance.memoryRssMb ?? 0)
  const heapMb =
    metrics?.memory?.processMemory?.heapUsed != null
      ? roundMb(metrics.memory.processMemory.heapUsed)
      : (snapshot?.systemPerformance.memoryHeapUsedMb ?? 0)
  const cores = liveStatus?.cpu.cores ?? snapshot?.systemPerformance.cpuCores ?? 1
  const load = liveStatus?.cpu.loadAverage ?? snapshot?.systemPerformance.loadAverage ?? [0, 0, 0]
  const cpuPct = cores > 0 ? Math.min(100, (load[0] / cores) * 100) : 0
  const dbConnected =
    healthDetail?.checks?.database?.status === 'healthy' || snapshot?.database.connection === 'Connected'
  const pingMs = healthDetail?.checks?.database?.responseTime ?? snapshot?.database.pingMs
  const overall =
    healthDetail?.status ??
    snapshot?.status ??
    (dbConnected ? 'healthy' : 'degraded')
  const maintenance = Boolean(liveStatus?.maintenanceMode || healthDetail?.maintenanceMode)
  const checkedAt = snapshot?.checkedAt ? new Date(snapshot.checkedAt) : new Date()
  const smtp = serviceBadge(
    healthDetail?.checks?.externalServices?.email?.status ?? (snapshot?.features.smtpEnabled ? 'healthy' : 'disabled'),
    t('health.configured'),
    t('health.notConfigured'),
    t('health.healthy'),
    t('health.unhealthy'),
  )
  const stripe = serviceBadge(
    healthDetail?.checks?.externalServices?.stripe?.status ?? (snapshot?.features.stripeConfigured ? 'healthy' : 'disabled'),
    t('health.configured'),
    t('health.notConfigured'),
    t('health.healthy'),
    t('health.unhealthy'),
  )
  const ai = serviceBadge(
    healthDetail?.checks?.externalServices?.ai?.status ?? (snapshot?.features.defaultAiProvider ? 'healthy' : 'disabled'),
    t('health.configured'),
    t('health.notConfigured'),
    t('health.healthy'),
    t('health.unhealthy'),
  )

  return (
    <div>
      <PageHeader
        title={t('health.title')}
        subtitle={t('health.subtitle')}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              void refetch()
              refreshLive()
            }}
            disabled={isFetching}
          >
            <RefreshCw className={`me-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        }
      />

      <HealthConnectionBanner tone={tone} onRetry={reconnect} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant={overall === 'healthy' ? 'success' : overall === 'unhealthy' ? 'error' : 'warning'}>
          {overall === 'healthy' ? t('health.healthy') : overall === 'unhealthy' ? t('health.unhealthy') : t('health.degraded')}
        </Badge>
        {maintenance ? <Badge variant="warning">{t('health.maintenanceOn')}</Badge> : <Badge variant="secondary">{t('health.maintenanceOff')}</Badge>}
        <Badge variant={tone === 'live' ? 'success' : tone === 'offline' ? 'error' : 'warning'}>
          {tone === 'live'
            ? t('health.live')
            : tone === 'offline'
              ? t('health.liveOfflineLabel')
              : t('health.liveReconnectingLabel')}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {t('health.checkedAt')}: {checkedAt.toLocaleString()}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Server className="h-4 w-4" />
              {t('dashboard.uptime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatUptime(uptime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4" />
              {t('health.hostMemory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">{Math.round(memoryUsedPct)}%</p>
            <Meter value={memoryUsedPct} label={t('health.hostMemory')} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Cpu className="h-4 w-4" />
              {t('health.cpu')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl font-semibold">{load[0]?.toFixed(2)}</p>
            <Meter value={cpuPct} label={t('health.load')} />
            <p className="text-xs text-muted-foreground">
              {t('health.cores')}: {cores}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Activity className="h-4 w-4" />
              {t('health.processMemory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              {t('health.memory')}: {rssMb} MB
            </p>
            <p>
              {t('health.heap')}: {heapMb} MB
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('health.database')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant={dbConnected ? 'success' : 'error'}>
              {dbConnected ? t('health.connected') : t('health.disconnected')}
            </Badge>
            {pingMs != null ? (
              <p>
                {t('health.dbPing')}: {pingMs} ms
              </p>
            ) : null}
            {snapshot?.database.error || healthDetail?.checks?.database?.error ? (
              <p className="text-destructive">{snapshot?.database.error ?? healthDetail?.checks?.database?.error}</p>
            ) : null}
            <p>
              {t('health.env')}: {liveStatus?.nodeEnv ?? snapshot?.systemPerformance.nodeEnv}
            </p>
            <p>
              {t('health.runtime')}: {liveStatus?.nodeVersion ?? snapshot?.systemPerformance.nodeVersion ?? '—'} ·{' '}
              {liveStatus?.platform ?? snapshot?.systemPerformance.platform ?? '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('health.features')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span>{t('health.smtp')}</span>
              <Badge variant={smtp.variant}>{smtp.label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t('health.stripe')}</span>
              <Badge variant={stripe.variant}>{stripe.label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t('health.aiService')}</span>
              <Badge variant={ai.variant}>{ai.label}</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t('health.provider')}</span>
              <span className="text-muted-foreground">
                {healthDetail?.checks?.externalServices?.ai?.provider ?? snapshot?.features.defaultAiProvider ?? '—'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
