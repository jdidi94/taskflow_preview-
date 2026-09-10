import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, Input, Loading } from '@taskflow/ui'
import { Eye, Pencil, UserPlus } from 'lucide-react'

import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/ToastProvider'
import { AddUserModal } from '@/components/users/AddUserModal'
import { EditUserModal } from '@/components/users/EditUserModal'
import { ViewUserModal } from '@/components/users/ViewUserModal'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useActivateUserMutation,
  useBanUserMutation,
  useChangeUserRoleMutation,
  useCreateUserMutation,
  useListAppUsersQuery,
  useUpdateUserMutation,
} from '@/services/adminUsersApi'
import type { AddUserFormData, AppUser, EditUserFormData } from '@/types/users'

export function UsersPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<AppUser | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showView, setShowView] = useState(false)
  const [confirm, setConfirm] = useState<{
    title: string
    body: string
    type: 'danger' | 'warning' | 'info'
    action: () => Promise<void>
    confirmText: string
  } | null>(null)

  const queryArgs = useMemo(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
    }),
    [page, role, search, status],
  )

  const { data, isLoading, isError, refetch } = useListAppUsersQuery(queryArgs)
  const [createUser] = useCreateUserMutation()
  const [updateUser] = useUpdateUserMutation()
  const [changeRole] = useChangeUserRoleMutation()
  const [banUser] = useBanUserMutation()
  const [activateUser] = useActivateUserMutation()

  const users = data?.data.users ?? []
  const total = data?.data.total ?? 0
  const limit = data?.data.limit ?? 20
  const totalPages = Math.max(1, Math.ceil(total / limit))

  async function handleCreate(form: AddUserFormData) {
    try {
      await createUser(form).unwrap()
      toast.show({ message: t('users.createdOk') })
    } catch (err) {
      throw new Error(getApiErrorMessage(err, t('users.createError')))
    }
  }

  async function handleUpdate(userId: string, form: EditUserFormData) {
    try {
      await updateUser({
        userId,
        name: form.username,
        email: form.email,
        isActive: form.isActive,
      }).unwrap()
      if (selected && form.role !== selected.role) {
        await changeRole({ userId, newRole: form.role }).unwrap()
      }
      toast.show({ message: t('users.updatedOk') })
    } catch (err) {
      throw new Error(getApiErrorMessage(err, t('users.updateError')))
    }
  }

  if (isLoading && users.length === 0) return <Loading label={t('common.loading')} />

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        actions={
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <UserPlus className="me-2 h-4 w-4" />
            {t('users.addUser')}
          </Button>
        }
      />

      {isError ? (
        <div className="mb-4 space-y-2">
          <Alert variant="error" title={t('users.loadError')} />
          <Button variant="outline" onClick={() => void refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={role}
            onChange={(event) => {
              setRole(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">{t('users.allRoles')}</option>
            <option value="user">{t('users.roleUser')}</option>
            <option value="admin">{t('users.roleAdmin')}</option>
            <option value="moderator">{t('users.roleModerator')}</option>
            <option value="viewer">{t('users.roleViewer')}</option>
            <option value="super_admin">{t('users.roleSuper')}</option>
          </select>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">{t('users.allStatuses')}</option>
            <option value="Active">{t('common.active')}</option>
            <option value="Inactive">{t('common.inactive')}</option>
          </select>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="min-w-full text-start text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{t('users.username')}</th>
              <th className="px-3 py-2 font-medium">{t('common.email')}</th>
              <th className="px-3 py-2 font-medium">{t('common.role')}</th>
              <th className="px-3 py-2 font-medium">{t('common.status')}</th>
              <th className="px-3 py-2 font-medium">{t('common.lastLogin')}</th>
              <th className="px-3 py-2 font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  {t('common.empty')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={String(user.id)} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{user.username}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{user.role}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={user.status === 'Active' ? 'success' : 'secondary'}>{user.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{user.lastLoginAt || t('users.never')}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelected(user)
                          setShowView(true)
                        }}
                        aria-label={t('common.view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelected(user)
                          setShowEdit(true)
                        }}
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {user.status === 'Active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirm({
                              title: t('users.deactivateTitle'),
                              body: t('users.deactivateBody', { name: user.username }),
                              type: 'warning',
                              confirmText: t('users.deactivate'),
                              action: async () => {
                                await banUser(String(user.id)).unwrap()
                                toast.show({ message: t('users.deactivatedOk') })
                              },
                            })
                          }
                        >
                          {t('users.deactivate')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setConfirm({
                              title: t('users.activateTitle'),
                              body: t('users.activateBody', { name: user.username }),
                              type: 'info',
                              confirmText: t('users.activate'),
                              action: async () => {
                                await activateUser(String(user.id)).unwrap()
                                toast.show({ message: t('users.activatedOk') })
                              },
                            })
                          }
                        >
                          {t('users.activate')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span>
          {t('common.page')} {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            {t('common.prev')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            {t('common.next')}
          </Button>
        </div>
      </div>

      <AddUserModal isOpen={showAdd} onClose={() => setShowAdd(false)} onSubmit={handleCreate} />
      <EditUserModal
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false)
          setSelected(null)
        }}
        user={selected}
        onSubmit={handleUpdate}
      />
      <ViewUserModal
        isOpen={showView}
        onClose={() => {
          setShowView(false)
          setSelected(null)
        }}
        user={selected}
      />
      <ConfirmationDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title ?? ''}
        description={confirm?.body}
        type={confirm?.type ?? 'info'}
        confirmText={confirm?.confirmText}
        onConfirm={async () => {
          if (!confirm) return
          await confirm.action()
          setConfirm(null)
        }}
      />
    </div>
  )
}
