import { Link, useNavigate, useParams } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useAcceptByTokenMutation,
  useDeclineByTokenMutation,
  useGetByTokenQuery,
} from '@/services/invitationsApi'
import { destinationAfterInviteAccept } from '@/lib/inviteDestination'
import { useAppSelector } from '@/store/hooks'

export function InviteLandingPanel() {
  const { token = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const authToken = useAppSelector((state) => state.auth.token)
  const { data, isLoading, isError, error } = useGetByTokenQuery(token, { skip: !token || !authToken })
  const [acceptByToken, { isLoading: accepting }] = useAcceptByTokenMutation()
  const [declineByToken, { isLoading: declining }] = useDeclineByTokenMutation()

  if (!authToken) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('invites.landingTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t('invites.needLogin')}</p>
            <Link to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
              <Button variant="primary">{t('auth.signIn')}</Button>
            </Link>
            <Link to={`/register?next=${encodeURIComponent(`/invite/${token}`)}`}>
              <Button variant="outline">{t('auth.createAccount')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading label={t('common.loading')} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <Alert
          variant="error"
          title={t('invites.loadError')}
          description={getApiErrorMessage(error, t('invites.loadError'))}
        />
      </div>
    )
  }

  const invite = data?.data

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('invites.landingTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('invites.landingSubtitle')}</p>
          <p className="text-sm">
            {invite?.type} · {invite?.role}
          </p>
          {invite?.message ? <p className="text-sm text-muted-foreground">{invite.message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={accepting}
              onClick={() =>
                void acceptByToken({ token })
                  .unwrap()
                  .then((result) => navigate(destinationAfterInviteAccept(result), { replace: true }))
              }
            >
              {t('invites.acceptInvite')}
            </Button>
            <Button
              variant="outline"
              disabled={declining}
              onClick={() =>
                void declineByToken({ token })
                  .unwrap()
                  .then(() => navigate('/dashboard', { replace: true }))
              }
            >
              {t('invites.declineInvite')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
