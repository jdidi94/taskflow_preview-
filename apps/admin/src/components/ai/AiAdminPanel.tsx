import { useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Loading, Modal } from '@taskflow/ui'

import { QuotaFormModal } from '@/components/ai/QuotaFormModal'
import { TokenTestResultModal } from '@/components/ai/TokenTestResultModal'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/ToastProvider'
import { useI18n, type MessageKey } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useActivateAiTokenMutation,
  useArchiveAiTokenMutation,
  useCreateAiTokenMutation,
  useDeleteAiTokenMutation,
  useGetAiTokenStatsQuery,
  useListAiTokensQuery,
  useTestAiTokenMutation,
} from '@/services/adminAiTokensApi'
import {
  useClearQuotaOverrideMutation,
  useCreateQuotaMutation,
  useDeleteQuotaMutation,
  useGetQuotaStatsQuery,
  useListQuotasQuery,
  useOverrideQuotaMutation,
  useResetQuotaMutation,
  useUpdateQuotaMutation,
} from '@/services/adminQuotasApi'
import type { AiProvider, AiToken, AiTokenTestResult } from '@/types/ai'
import type { CreateQuotaInput, Quota, UpdateQuotaInput } from '@/types/quotas'

function tokenId(token: AiToken) {
  return String(token.id ?? token._id)
}

function quotaId(quota: Quota) {
  return String(quota.id ?? quota._id)
}

export function AiAdminPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const tokensQuery = useListAiTokensQuery({ includeArchived: true })
  const tokenStatsQuery = useGetAiTokenStatsQuery()
  const quotasQuery = useListQuotasQuery()
  const quotaStatsQuery = useGetQuotaStatsQuery()
  const [createToken, { isLoading: creating }] = useCreateAiTokenMutation()
  const [activateToken] = useActivateAiTokenMutation()
  const [archiveToken] = useArchiveAiTokenMutation()
  const [deleteToken] = useDeleteAiTokenMutation()
  const [testToken, { isLoading: testing }] = useTestAiTokenMutation()
  const [createQuota, { isLoading: creatingQuota }] = useCreateQuotaMutation()
  const [updateQuota, { isLoading: updatingQuota }] = useUpdateQuotaMutation()
  const [deleteQuota] = useDeleteQuotaMutation()
  const [overrideQuota] = useOverrideQuotaMutation()
  const [clearOverride] = useClearQuotaOverrideMutation()
  const [resetQuota] = useResetQuotaMutation()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [tokenValue, setTokenValue] = useState('')
  const [provider, setProvider] = useState<AiProvider>('google')
  const [model, setModel] = useState('gemini-1.5-flash')
  const [error, setError] = useState<string | null>(null)
  const [overrideTarget, setOverrideTarget] = useState<Quota | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [quotaFormOpen, setQuotaFormOpen] = useState(false)
  const [editingQuota, setEditingQuota] = useState<Quota | null>(null)
  const [quotaFormError, setQuotaFormError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<AiTokenTestResult | null>(null)
  const [pendingDeleteToken, setPendingDeleteToken] = useState<AiToken | null>(null)
  const [pendingDeleteQuota, setPendingDeleteQuota] = useState<Quota | null>(null)

  const tokens = tokensQuery.data?.data.tokens ?? []
  const quotas = quotasQuery.data?.data.quotas ?? []
  const quotaStats = quotaStatsQuery.data?.data.stats ?? {}
  const tokenStats = tokenStatsQuery.data?.data.stats

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createToken({
        name: name.trim(),
        token: tokenValue.trim(),
        provider,
        config: { model },
      }).unwrap()
      setShowCreate(false)
      setName('')
      setTokenValue('')
      toast.show({ message: t('common.success') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('ai.saveError')))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')} />
      {error ? <Alert variant="error" title={t('common.error')} description={error} /> : null}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('ai.tokensTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('ai.tokensSubtitle')}</p>
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            {t('ai.addToken')}
          </Button>
        </div>

        {tokenStatsQuery.isLoading ? <Loading label={t('common.loading')} /> : null}
        {tokenStats ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('ai.tokenStatsTotal')} value={tokenStats.total} />
            <StatCard
              label={t('ai.tokenStatsActive')}
              value={Object.values(tokenStats.providers).reduce((sum, item) => sum + item.active, 0)}
            />
            <StatCard
              label={t('ai.tokenStatsInvalid')}
              value={Object.values(tokenStats.providers).reduce((sum, item) => sum + item.invalid, 0)}
            />
            <StatCard
              label={t('ai.tokenStatsUsage')}
              value={Object.values(tokenStats.providers).reduce((sum, item) => sum + item.totalUsage, 0)}
            />
          </div>
        ) : null}
        {tokenStats && Object.keys(tokenStats.providers).length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(tokenStats.providers).map(([key, stat]) => (
              <Badge key={key} variant="secondary">
                {key}: {stat.active}/{stat.total}
              </Badge>
            ))}
          </div>
        ) : null}

        {tokensQuery.isLoading ? <Loading label={t('common.loading')} /> : null}
        {tokensQuery.isError ? <Alert variant="error" title={t('ai.loadError')} /> : null}
        {!tokensQuery.isLoading && tokens.length === 0 ? <Alert variant="info" title={t('ai.emptyTokens')} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {tokens.map((token) => (
            <Card key={tokenId(token)}>
              <CardHeader>
                <CardTitle>{token.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{token.provider}</Badge>
                  <Badge variant={token.status === 'active' ? 'success' : token.isValid === false ? 'error' : 'secondary'}>
                    {token.status}
                  </Badge>
                </div>
                <p className="font-mono text-xs">{token.maskedToken}</p>
                <p className="text-muted-foreground">
                  {t('ai.model')}: {token.config?.model ?? '—'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void activateToken(tokenId(token))}>
                    {t('ai.activate')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void archiveToken(tokenId(token))}>
                    {t('ai.archive')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testing}
                    onClick={async () => {
                      try {
                        const result = await testToken(tokenId(token)).unwrap()
                        setTestResult(result.data)
                        toast.show({ message: result.data.success ? t('ai.testOk') : t('ai.testFail') })
                      } catch (err) {
                        setError(getApiErrorMessage(err, t('ai.testFail')))
                      }
                    }}
                  >
                    {testing ? t('ai.testing') : t('ai.test')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setPendingDeleteToken(token)}>
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('ai.quotasTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('ai.quotasSubtitle')}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingQuota(null)
              setQuotaFormError(null)
              setQuotaFormOpen(true)
            }}
          >
            {t('ai.addQuota')}
          </Button>
        </div>

        {quotaStatsQuery.isLoading ? <Loading label={t('common.loading')} /> : null}
        {quotaStatsQuery.isError ? <Alert variant="error" title={t('ai.loadError')} /> : null}
        {!quotaStatsQuery.isLoading && Object.keys(quotaStats).length === 0 ? (
          <Alert variant="info" title={t('ai.statsEmpty')} />
        ) : (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(quotaStats).map(([type, stat]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{typeLabel(type, t)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    {t('ai.totalQuotas')}: {stat.totalQuotas}
                  </p>
                  <p>
                    {t('ai.usage')}: {stat.totalUsage} / {stat.totalLimit}
                  </p>
                  <p>
                    {t('ai.exceeded')}: {stat.exceededQuotas}
                  </p>
                  <p className="text-muted-foreground">
                    {t('ai.usagePct')}: {Math.round(stat.usagePercentage)}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {quotasQuery.isLoading ? <Loading label={t('common.loading')} /> : null}
        {quotasQuery.isError ? <Alert variant="error" title={t('ai.loadError')} /> : null}
        {!quotasQuery.isLoading && quotas.length === 0 ? <Alert variant="info" title={t('ai.emptyQuotas')} /> : null}
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">{t('ai.userId')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('ai.type')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('ai.period')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('ai.usage')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('ai.limit')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('common.status')}</th>
                <th className="px-3 py-2 text-start font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {quotas.map((quota) => (
                <tr key={quotaId(quota)} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{String(quota.userId)}</td>
                  <td className="px-3 py-2">{quota.type}</td>
                  <td className="px-3 py-2">{quota.period}</td>
                  <td className="px-3 py-2">{quota.currentUsage}</td>
                  <td className="px-3 py-2">{quota.limit}</td>
                  <td className="px-3 py-2">
                    <Badge variant={quota.isOverridden ? 'warning' : quota.isActive ? 'success' : 'secondary'}>
                      {quota.isOverridden ? t('ai.override') : quota.isActive ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingQuota(quota)
                          setQuotaFormError(null)
                          setQuotaFormOpen(true)
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setOverrideTarget(quota)}>
                        {t('ai.override')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void clearOverride(quotaId(quota))}>
                        {t('ai.clearOverride')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await resetQuota(quotaId(quota)).unwrap()
                          toast.show({ message: t('ai.resetOk') })
                        }}
                      >
                        {t('ai.reset')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setPendingDeleteQuota(quota)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('ai.addToken')}>
        <form className="space-y-3" onSubmit={(event) => void onCreate(event)}>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('ai.tokenName')}</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('ai.provider')}</span>
            <select
              className="h-10 rounded-md border border-border bg-background px-3"
              value={provider}
              onChange={(event) => setProvider(event.target.value as AiProvider)}
            >
              <option value="google">google</option>
              <option value="groq">groq</option>
              <option value="openai">openai</option>
              <option value="anthropic">anthropic</option>
              <option value="azure">azure</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('ai.model')}</span>
            <Input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('ai.tokenValue')}</span>
            <Input value={tokenValue} onChange={(event) => setTokenValue(event.target.value)} required />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <QuotaFormModal
        isOpen={quotaFormOpen}
        quota={editingQuota}
        busy={creatingQuota || updatingQuota}
        error={quotaFormError}
        onClose={() => {
          setQuotaFormOpen(false)
          setEditingQuota(null)
          setQuotaFormError(null)
        }}
        onSubmit={async (input) => {
          try {
            if (editingQuota) {
              await updateQuota({ id: quotaId(editingQuota), ...(input as UpdateQuotaInput) }).unwrap()
              toast.show({ message: t('ai.quotaUpdated') })
            } else {
              await createQuota(input as CreateQuotaInput).unwrap()
              toast.show({ message: t('ai.quotaCreated') })
            }
            setQuotaFormOpen(false)
            setEditingQuota(null)
            setQuotaFormError(null)
          } catch (err) {
            setQuotaFormError(getApiErrorMessage(err, t('ai.saveError')))
          }
        }}
      />

      <TokenTestResultModal isOpen={Boolean(testResult)} result={testResult} onClose={() => setTestResult(null)} />

      <Modal isOpen={Boolean(overrideTarget)} onClose={() => setOverrideTarget(null)} title={t('ai.override')}>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!overrideTarget) return
            try {
              await overrideQuota({ id: quotaId(overrideTarget), reason: overrideReason.trim() }).unwrap()
              setOverrideTarget(null)
              setOverrideReason('')
              toast.show({ message: t('ai.overrideOk') })
            } catch (err) {
              setError(getApiErrorMessage(err, t('ai.saveError')))
            }
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('ai.overrideReason')}</span>
            <Input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} required />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOverrideTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(pendingDeleteToken)}
        onClose={() => setPendingDeleteToken(null)}
        type="danger"
        title={t('common.delete')}
        description={pendingDeleteToken?.name}
        confirmText={t('common.delete')}
        onConfirm={async () => {
          if (!pendingDeleteToken) return
          try {
            await deleteToken(tokenId(pendingDeleteToken)).unwrap()
            toast.show({ message: t('common.success') })
          } catch (err) {
            toast.error(getApiErrorMessage(err, t('ai.saveError')))
          } finally {
            setPendingDeleteToken(null)
          }
        }}
      />

      <ConfirmationDialog
        isOpen={Boolean(pendingDeleteQuota)}
        onClose={() => setPendingDeleteQuota(null)}
        type="danger"
        title={t('ai.deleteQuota')}
        description={t('ai.deleteQuotaBody', { userId: pendingDeleteQuota ? String(pendingDeleteQuota.userId) : '' })}
        confirmText={t('common.delete')}
        onConfirm={async () => {
          if (!pendingDeleteQuota) return
          try {
            await deleteQuota(quotaId(pendingDeleteQuota)).unwrap()
            toast.show({ message: t('ai.quotaDeleted') })
          } catch (err) {
            toast.error(getApiErrorMessage(err, t('ai.saveError')))
          } finally {
            setPendingDeleteQuota(null)
          }
        }}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function typeLabel(type: string, t: (key: MessageKey) => string) {
  const map: Record<string, MessageKey> = {
    api_requests: 'ai.typeApi',
    file_uploads: 'ai.typeUploads',
    ai_jobs: 'ai.typeAiJobs',
    storage: 'ai.typeStorage',
    users: 'ai.typeUsers',
    spaces: 'ai.typeSpaces',
  }
  const key = map[type]
  return key ? t(key) : type
}
