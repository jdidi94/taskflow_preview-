import { useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useGetWorkspaceRulesQuery,
  useUpdateWorkspaceRulesMutation,
} from '@/services/workspacesApi'

type WorkspaceRulesPanelProps = {
  workspaceId: string
}

export function WorkspaceRulesPanel({ workspaceId }: WorkspaceRulesPanelProps) {
  const { t } = useI18n()
  const { data, isLoading, isError } = useGetWorkspaceRulesQuery(workspaceId)
  const [updateRules, { isLoading: saving }] = useUpdateWorkspaceRulesMutation()
  const [content, setContent] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const serverContent = data?.data?.content ?? ''
  const value = content ?? serverContent

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await updateRules({ workspaceId, content: value }).unwrap()
      setStatus(t('rules.saved'))
      setContent(null)
    } catch (err) {
      setError(getApiErrorMessage(err, t('rules.saveError')))
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{t('rules.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('rules.subtitle')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {isError ? <p className="text-sm text-destructive">{t('rules.loadError')}</p> : null}
        {!isLoading && !isError ? (
          <form className="flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
            {error ? <Alert variant="error" title={t('rules.saveError')} description={error} /> : null}
            {status ? <Alert variant="success" title={status} /> : null}
            <textarea
              className="tf-input min-h-40 resize-y"
              value={value}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('rules.placeholder')}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? t('rules.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
