import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal } from '@taskflow/ui'
import { Trash2, Users } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { AvatarStack } from '@/components/common/AvatarStack'
import {
  initials,
  type NormalizedWorkspaceMember,
} from '@/components/workspace/normalizeMembers'
import type { NormalizedSpaceMember } from '@/components/space/normalizeSpaceMembers'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useAddSpaceMemberMutation,
  useArchiveSpaceMutation,
  usePermanentDeleteSpaceMutation,
  useRemoveSpaceMemberMutation,
  useRestoreSpaceMutation,
  useUpdateSpaceMutation,
  type SpaceMemberRole,
} from '@/services/spacesApi'
import type { Space } from '@/types/domain'

type SpaceSettingsPanelProps = {
  space: Space
  workspaceId: string
  spaceMembers: NormalizedSpaceMember[]
  workspaceMembers: NormalizedWorkspaceMember[]
  currentUserId?: string
  canManage: boolean
  membersLoading?: boolean
  sections?: 'all' | 'general' | 'members'
}

export function SpaceSettingsPanel({
  space,
  workspaceId,
  spaceMembers,
  workspaceMembers,
  currentUserId,
  canManage,
  membersLoading,
  sections = 'all',
}: SpaceSettingsPanelProps) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const archived = Boolean(space.archived) || space.isActive === false

  const [name, setName] = useState(space.name)
  const [description, setDescription] = useState(space.description ?? '')
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [generalSaved, setGeneralSaved] = useState(false)

  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<SpaceMemberRole>('member')
  const [memberError, setMemberError] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<NormalizedSpaceMember | null>(null)

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [updateSpace, { isLoading: savingGeneral }] = useUpdateSpaceMutation()
  const [addMember, { isLoading: adding }] = useAddSpaceMemberMutation()
  const [removeMember, { isLoading: removing }] = useRemoveSpaceMemberMutation()
  const [archiveSpace, { isLoading: archiving }] = useArchiveSpaceMutation()
  const [restoreSpace, { isLoading: restoring }] = useRestoreSpaceMutation()
  const [permanentDelete, { isLoading: deleting }] = usePermanentDeleteSpaceMutation()

  useEffect(() => {
    setName(space.name)
    setDescription(space.description ?? '')
  }, [space.id, space.name, space.description])

  const spaceMemberIds = useMemo(() => new Set(spaceMembers.map((m) => m.id)), [spaceMembers])

  const candidates = useMemo(
    () => workspaceMembers.filter((m) => !spaceMemberIds.has(m.id)),
    [workspaceMembers, spaceMemberIds],
  )

  const generalDirty = useMemo(() => {
    return (
      name.trim() !== space.name.trim() ||
      description.trim() !== (space.description ?? '').trim()
    )
  }, [name, description, space.name, space.description])

  function roleLabel(role: string) {
    if (role === 'admin') return t('spaceSettings.roleAdmin')
    if (role === 'viewer') return t('spaceSettings.roleViewer')
    return t('spaceSettings.roleMember')
  }

  async function saveGeneral(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    setGeneralError(null)
    setGeneralSaved(false)
    try {
      await updateSpace({
        id: space.id,
        workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap()
      setGeneralSaved(true)
    } catch (err) {
      setGeneralError(getApiErrorMessage(err, t('spaceSettings.generalSaveError')))
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    if (!canManage || !addUserId) return
    setMemberError(null)
    try {
      await addMember({ spaceId: space.id, userId: addUserId, role: addRole }).unwrap()
      setAddUserId('')
      setAddRole('member')
    } catch (err) {
      setMemberError(getApiErrorMessage(err, t('spaceSettings.memberAddError')))
    }
  }

  async function confirmRemove() {
    if (!pendingRemove) return
    setMemberError(null)
    try {
      await removeMember({ spaceId: space.id, memberId: pendingRemove.id }).unwrap()
      setPendingRemove(null)
    } catch (err) {
      setMemberError(getApiErrorMessage(err, t('spaceSettings.memberRemoveError')))
    }
  }

  async function confirmArchiveOrRestore() {
    setArchiveError(null)
    try {
      if (archived) {
        await restoreSpace({ id: space.id, workspaceId }).unwrap()
      } else {
        await archiveSpace({ id: space.id, workspaceId }).unwrap()
        navigate(`/workspaces/${workspaceId}`)
      }
      setArchiveOpen(false)
    } catch (err) {
      setArchiveError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  async function confirmPermanentDelete() {
    if (deleteConfirm.trim() !== space.name) return
    setDeleteError(null)
    try {
      await permanentDelete({ id: space.id, workspaceId }).unwrap()
      setDeleteOpen(false)
      navigate(`/workspaces/${workspaceId}`)
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, t('spaceSettings.deleteError')))
    }
  }

  const memberBusy = adding || removing

  return (
    <section id="space-settings" className="flex flex-col gap-6">
      {sections === 'all' || sections === 'general' ? (
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t('spaceSettings.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('spaceSettings.subtitle')}</p>
        </div>
      ) : (
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {t('spaceSettings.membersTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('spaceSettings.membersSubtitle')}</p>
        </div>
      )}

      {/* General */}
      {sections === 'all' || sections === 'general' ? (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('spaceSettings.generalTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('spaceSettings.generalSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={(e) => void saveGeneral(e)}>
            {generalError ? (
              <Alert
                variant="error"
                title={t('spaceSettings.generalSaveError')}
                description={generalError}
              />
            ) : null}
            {generalSaved ? (
              <Alert variant="success" title={t('spaceSettings.generalSaved')} />
            ) : null}
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('common.name')}</span>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setGeneralSaved(false)
                }}
                disabled={!canManage || savingGeneral || archived}
                required
                minLength={2}
                maxLength={200}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('workspace.description')}</span>
              <textarea
                className="tf-input min-h-24 resize-y"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setGeneralSaved(false)
                }}
                disabled={!canManage || savingGeneral || archived}
                maxLength={1000}
              />
            </label>
            {canManage && !archived ? (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={savingGeneral || !generalDirty || name.trim().length < 2}
                >
                  {savingGeneral ? t('spaceSettings.saving') : t('common.save')}
                </Button>
              </div>
            ) : null}
            {!canManage ? (
              <p className="text-xs text-muted-foreground">{t('spaceSettings.readOnlyHint')}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
      ) : null}

      {/* Members */}
      {sections === 'all' || sections === 'members' ? (
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{t('spaceSettings.membersTitle')}</CardTitle>
            <Badge variant="secondary">{spaceMembers.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t('spaceSettings.membersSubtitle')}</p>
          {!membersLoading && spaceMembers.length > 0 ? (
            <div className="mt-3">
              <AvatarStack
                items={spaceMembers.map((member) => ({
                  id: member.id,
                  name: member.name || member.email || member.id,
                  avatarUrl: member.avatar,
                  detail: roleLabel(member.role),
                }))}
                max={6}
                size="md"
              />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {memberError ? (
            <Alert
              variant="error"
              title={t('spaceSettings.memberErrorTitle')}
              description={memberError}
            />
          ) : null}

          {membersLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : null}

          {!membersLoading && spaceMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 px-4 py-6 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">{t('spaceSettings.membersEmpty')}</p>
            </div>
          ) : null}

          {!membersLoading && spaceMembers.length > 0 ? (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
              {spaceMembers.map((member) => {
                const isYou = Boolean(currentUserId && member.id === currentUserId)
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-xs font-semibold"
                        aria-hidden
                      >
                        {initials(member.name || member.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.name}
                          {isYou ? (
                            <span className="ms-2 text-xs font-normal text-muted-foreground">
                              ({t('spaceSettings.memberYou')})
                            </span>
                          ) : null}
                        </p>
                        {member.email ? (
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'admin' ? 'secondary' : 'outline'} className="text-[10px]">
                        {roleLabel(member.role)}
                      </Badge>
                      {canManage && !archived ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          disabled={memberBusy}
                          title={t('spaceSettings.removeMember')}
                          aria-label={t('spaceSettings.removeMember')}
                          onClick={() => {
                            setMemberError(null)
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
          ) : null}

          {canManage && !archived ? (
            <form
              className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:flex-row sm:items-end"
              onSubmit={(e) => void handleAddMember(e)}
            >
              <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                <span className="font-medium">{t('spaceSettings.addMember')}</span>
                <select
                  className="tf-input"
                  value={addUserId}
                  disabled={memberBusy || candidates.length === 0}
                  onChange={(e) => setAddUserId(e.target.value)}
                >
                  <option value="">
                    {candidates.length === 0
                      ? t('spaceSettings.noCandidates')
                      : t('spaceSettings.selectMember')}
                  </option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">{t('spaceSettings.roleLabel')}</span>
                <select
                  className="tf-input"
                  value={addRole}
                  disabled={memberBusy}
                  onChange={(e) => setAddRole(e.target.value as SpaceMemberRole)}
                >
                  <option value="viewer">{t('spaceSettings.roleViewer')}</option>
                  <option value="member">{t('spaceSettings.roleMember')}</option>
                  <option value="admin">{t('spaceSettings.roleAdmin')}</option>
                </select>
              </label>
              <Button
                type="submit"
                variant="outline"
                disabled={memberBusy || !addUserId}
                className="shrink-0"
              >
                {adding ? t('spaceSettings.addingMember') : t('spaceSettings.addMember')}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
      ) : null}

      {/* Danger zone */}
      {(sections === 'all' || sections === 'general') && canManage ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">{t('spaceSettings.dangerTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('spaceSettings.dangerSubtitle')}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
              <div>
                <p className="text-sm font-medium">
                  {archived ? t('spaceSettings.restoreLabel') : t('spaceSettings.archiveLabel')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {archived ? t('spaceSettings.restoreHint') : t('spaceSettings.archiveHint')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setArchiveError(null)
                  setArchiveOpen(true)
                }}
              >
                {archived ? t('archive.restore') : t('archive.archive')}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
              <div>
                <p className="text-sm font-medium text-destructive">{t('spaceSettings.deleteLabel')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {archived ? t('spaceSettings.deleteHint') : t('spaceSettings.deleteNeedArchive')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 text-destructive"
                disabled={!archived}
                onClick={() => {
                  setDeleteError(null)
                  setDeleteConfirm('')
                  setDeleteOpen(true)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                {t('spaceSettings.deletePermanent')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ArchiveConfirmModal
        open={archiveOpen}
        mode={archived ? 'restore' : 'archive'}
        entityLabel={t('archive.entitySpace')}
        name={space.name}
        busy={archiving || restoring}
        error={archiveError}
        onClose={() => {
          if (archiving || restoring) return
          setArchiveOpen(false)
          setArchiveError(null)
        }}
        onConfirm={confirmArchiveOrRestore}
      />

      <Modal
        isOpen={Boolean(pendingRemove)}
        onClose={() => {
          if (removing) return
          setPendingRemove(null)
        }}
        title={t('spaceSettings.removeMemberTitle')}
        description={t('spaceSettings.removeMemberDescription', {
          name: pendingRemove?.name || pendingRemove?.email || '',
        })}
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={removing} onClick={() => setPendingRemove(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            disabled={removing}
            onClick={() => void confirmRemove()}
          >
            {removing ? t('spaceSettings.removingMember') : t('spaceSettings.removeMember')}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteError(null)
          setDeleteConfirm('')
        }}
        title={t('spaceSettings.deleteTitle')}
        description={t('spaceSettings.deleteDescription', { name: space.name })}
      >
        <div className="mt-4 flex flex-col gap-3">
          {deleteError ? (
            <Alert variant="error" title={t('spaceSettings.deleteError')} description={deleteError} />
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('spaceSettings.deleteConfirmLabel')}</span>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              disabled={deleting}
              placeholder={space.name}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false)
                setDeleteConfirm('')
                setDeleteError(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={deleting || deleteConfirm.trim() !== space.name}
              onClick={() => void confirmPermanentDelete()}
            >
              {deleting ? t('spaceSettings.deleting') : t('spaceSettings.deletePermanent')}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
