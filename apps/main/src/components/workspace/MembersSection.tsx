import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Modal } from '@taskflow/ui'
import { Trash2, Users } from 'lucide-react'

import { AvatarStack } from '@/components/common/AvatarStack'
import { PaginationBar } from '@/components/common/PaginationBar'
import { initials, type NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
} from '@/services/workspacesApi'

type MembersSectionProps = {
  workspaceId: string
  members: NormalizedWorkspaceMember[]
  currentUserId?: string
  canManage?: boolean
  isLoading?: boolean
  isError?: boolean
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'owner') return 'default'
  if (role === 'admin') return 'secondary'
  return 'outline'
}

export function MembersSection({
  workspaceId,
  members,
  currentUserId,
  canManage = false,
  isLoading,
  isError,
}: MembersSectionProps) {
  const { t } = useI18n()
  const [updateRole, { isLoading: updatingRole }] = useUpdateMemberRoleMutation()
  const [removeMember, { isLoading: removing }] = useRemoveMemberMutation()
  const [pendingRemove, setPendingRemove] = useState<NormalizedWorkspaceMember | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)

  function roleLabel(role: string) {
    if (role === 'owner') return t('workspace.roleOwner')
    if (role === 'admin') return t('workspace.roleAdmin')
    return t('workspace.roleMember')
  }

  const stackItems = useMemo(
    () =>
      members.map((member) => ({
        id: member.id,
        name: member.name || member.email || member.id,
        avatarUrl: member.avatar,
        detail:
          member.role === 'owner'
            ? t('workspace.roleOwner')
            : member.role === 'admin'
              ? t('workspace.roleAdmin')
              : t('workspace.roleMember'),
      })),
    [members, t],
  )

  async function handleRoleChange(member: NormalizedWorkspaceMember, role: 'member' | 'admin') {
    if (member.role === role) return
    setRoleError(null)
    try {
      await updateRole({ workspaceId, memberId: member.id, role }).unwrap()
    } catch (err) {
      setRoleError(getApiErrorMessage(err, t('workspace.memberRoleError')))
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return
    setActionError(null)
    try {
      await removeMember({ workspaceId, memberId: pendingRemove.id }).unwrap()
      setPendingRemove(null)
    } catch (err) {
      setActionError(getApiErrorMessage(err, t('workspace.memberRemoveError')))
    }
  }

  const busy = updatingRole || removing
  const { pageItems, pagination, setPage, setLimit } = useClientPagination(members, 10)

  return (
    <>
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{t('workspace.membersTitle')}</CardTitle>
                <Badge variant="secondary">{members.length}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('workspace.membersSubtitle')}</p>
              {!isLoading && !isError && members.length > 0 ? (
                <div className="mt-4">
                  <AvatarStack items={stackItems} max={6} size="md" />
                </div>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {roleError ? (
            <Alert
              className="mb-3"
              variant="error"
              title={t('workspace.memberRoleError')}
              description={roleError}
            />
          ) : null}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-md border border-border/60 bg-muted/40"
                />
              ))}
            </div>
          ) : null}

          {isError ? <p className="text-sm text-destructive">{t('workspace.membersLoadError')}</p> : null}

          {!isLoading && !isError && members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 px-4 py-8 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">{t('workspace.membersEmpty')}</p>
            </div>
          ) : null}

          {!isLoading && !isError && members.length > 0 ? (
            <>
              <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
                {pageItems.map((member) => {
                  const isYou = Boolean(currentUserId && member.id === currentUserId)
                  const canEdit = canManage && !member.isOwner

                  return (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted text-xs font-semibold"
                          aria-hidden
                        >
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(member.name || member.email)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.name}
                            {isYou ? (
                              <span className="ms-2 text-xs font-normal text-muted-foreground">
                                ({t('workspace.memberYou')})
                              </span>
                            ) : null}
                          </p>
                          {member.email ? (
                            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {canEdit ? (
                          <label className="sr-only" htmlFor={`role-${member.id}`}>
                            {t('workspace.changeRole')}
                          </label>
                        ) : null}
                        {canEdit ? (
                          <select
                            id={`role-${member.id}`}
                            className="tf-input h-8 w-auto min-w-[7.5rem] py-1 text-xs"
                            value={member.role === 'admin' ? 'admin' : 'member'}
                            disabled={busy}
                            onChange={(e) =>
                              void handleRoleChange(member, e.target.value as 'member' | 'admin')
                            }
                          >
                            <option value="member">{t('workspace.roleMember')}</option>
                            <option value="admin">{t('workspace.roleAdmin')}</option>
                          </select>
                        ) : (
                          <Badge variant={roleBadgeVariant(member.role)} className="shrink-0 text-[10px]">
                            {roleLabel(member.role)}
                          </Badge>
                        )}

                        {canEdit ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            disabled={busy}
                            title={t('workspace.removeMember')}
                            aria-label={t('workspace.removeMember')}
                            onClick={() => {
                              setActionError(null)
                              setPendingRemove(member)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <PaginationBar
                className="mt-4"
                pagination={pagination}
                onPageChange={setPage}
                onLimitChange={setLimit}
                pageSizeOptions={[5, 10, 20, 40]}
              />
            </>
          ) : null}

          {canManage ? (
            <p className="mt-3 text-xs text-muted-foreground">{t('workspace.membersManageHint')}</p>
          ) : null}
        </CardContent>
      </Card>

      <Modal
        isOpen={Boolean(pendingRemove)}
        onClose={() => {
          if (removing) return
          setPendingRemove(null)
          setActionError(null)
        }}
        title={t('workspace.removeMemberTitle')}
        description={t('workspace.removeMemberDescription', {
          name: pendingRemove?.name || pendingRemove?.email || '',
        })}
      >
        <div className="mt-4 flex flex-col gap-3">
          {actionError ? (
            <Alert
              variant="error"
              title={t('workspace.memberRemoveError')}
              description={actionError}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={removing}
              onClick={() => {
                setPendingRemove(null)
                setActionError(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={removing}
              onClick={() => void confirmRemove()}
            >
              {removing ? t('workspace.removingMember') : t('workspace.removeMember')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
