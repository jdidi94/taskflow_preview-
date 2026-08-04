import { useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateInvitationMutation } from '@/services/invitationsApi'

type Props = {
  workspaceId: string
}

export function WorkspaceInviteForm({ workspaceId }: Props) {
  const { t } = useI18n()
  const [createInvitation, { isLoading }] = useCreateInvitationMutation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await createInvitation({
        type: 'workspace',
        email: email.trim(),
        targetEntityId: workspaceId,
        role,
        message: message.trim() || undefined,
      }).unwrap()
      setStatus(t('invites.sent'))
      setEmail('')
      setMessage('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('invites.sendError')))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('invites.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t('invites.subtitle')}</p>
        {error ? <Alert variant="error" title={t('invites.sendError')} description={error} /> : null}
        {status ? <Alert variant="success" title={status} /> : null}
        <form className="flex max-w-lg flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('invites.email')}</span>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('invites.role')}</span>
            <select
              className="h-10 rounded-md border border-border bg-background px-3"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="viewer">viewer</option>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('invites.message')}</span>
            <Input value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? t('invites.sending') : t('invites.send')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
