import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { PaginationBar } from '@/components/common/PaginationBar'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useI18n } from '@/i18n'
import {
  useAcceptByIdMutation,
  useDeclineByIdMutation,
  useListPendingQuery,
} from '@/services/invitationsApi'

export function PendingInvitesList() {
  const { t } = useI18n()
  const { data, isLoading, isError, refetch } = useListPendingQuery()
  const [acceptById, { isLoading: accepting }] = useAcceptByIdMutation()
  const [declineById, { isLoading: declining }] = useDeclineByIdMutation()

  const invites = data?.data ?? []
  const { pageItems, pagination, setPage, setLimit } = useClientPagination(invites, 10)

  if (isLoading) return <Loading label={t('common.loading')} />
  if (isError) return <Alert variant="error" title={t('invites.loadError')} />

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('invites.pendingTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('invites.emptyPending')}</p>
        ) : (
          <>
            {pageItems.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-2 rounded-md border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{invite.type ?? 'workspace'}</p>
                  <p className="text-muted-foreground">{invite.role}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={accepting}
                    onClick={() => void acceptById({ invitationId: invite.id }).then(() => refetch())}
                  >
                    {t('invites.accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={declining}
                    onClick={() => void declineById({ invitationId: invite.id }).then(() => refetch())}
                  >
                    {t('invites.decline')}
                  </Button>
                </div>
              </div>
            ))}
            <PaginationBar
              className="pt-1"
              pagination={pagination}
              onPageChange={setPage}
              onLimitChange={setLimit}
              pageSizeOptions={[5, 10, 20]}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
