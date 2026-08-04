import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal } from '@taskflow/ui'
import { Copy, Link2, Shield, Trash2 } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import type { NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import { WorkspaceGitHubPanel } from '@/components/workspace/WorkspaceGitHubPanel'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useArchiveWorkspaceMutation,
  useCreateInviteLinkMutation,
  useGetWorkspaceRulesQuery,
  usePermanentDeleteWorkspaceMutation,
  useRestoreWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useUpdateWorkspaceRulesMutation,
} from '@/services/workspacesApi'
import type { Workspace } from '@/types/domain'

type WorkspaceSettingsPanelProps = {
  workspace: Workspace
  members: NormalizedWorkspaceMember[]
  canManage: boolean
  /** Which blocks to render — used by page subnav tabs. */
  sections?: 'all' | 'general' | 'rules' | 'integrations'
}

export function WorkspaceSettingsPanel({
  workspace,
  members,
  canManage,
  sections = 'all',
}: WorkspaceSettingsPanelProps) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const archived = Boolean(workspace.archived) || workspace.isActive === false
  const adminCount = members.filter((m) => m.isOwner || m.role === 'admin' || m.role === 'owner').length

  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? '')
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [generalSaved, setGeneralSaved] = useState(false)

  const [rulesDraft, setRulesDraft] = useState<string | null>(null)
  const [rulesError, setRulesError] = useState<string | null>(null)
  const [rulesSaved, setRulesSaved] = useState(false)

  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [updateWorkspace, { isLoading: savingGeneral }] = useUpdateWorkspaceMutation()
  const [archiveWorkspace, { isLoading: archiving }] = useArchiveWorkspaceMutation()
  const [restoreWorkspace, { isLoading: restoring }] = useRestoreWorkspaceMutation()
  const [permanentDelete, { isLoading: deleting }] = usePermanentDeleteWorkspaceMutation()
  const [createInviteLink, { isLoading: creatingLink }] = useCreateInviteLinkMutation()
  const { data: rulesData, isLoading: rulesLoading } = useGetWorkspaceRulesQuery(workspace.id)
  const [updateRules, { isLoading: savingRules }] = useUpdateWorkspaceRulesMutation()

  useEffect(() => {
    setName(workspace.name)
    setDescription(workspace.description ?? '')
  }, [workspace.id, workspace.name, workspace.description])

  const serverRules = rulesData?.data?.content ?? ''
  const rulesValue = rulesDraft ?? serverRules

  const generalDirty = useMemo(() => {
    return (
      name.trim() !== workspace.name.trim() ||
      description.trim() !== (workspace.description ?? '').trim()
    )
  }, [name, description, workspace.name, workspace.description])

  async function saveGeneral(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    setGeneralError(null)
    setGeneralSaved(false)
    try {
      await updateWorkspace({
        id: workspace.id,
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap()
      setGeneralSaved(true)
    } catch (err) {
      setGeneralError(getApiErrorMessage(err, t('wsSettings.generalSaveError')))
    }
  }

  async function saveRules(event: FormEvent) {
    event.preventDefault()
    if (!canManage) return
    setRulesError(null)
    setRulesSaved(false)
    try {
      await updateRules({ workspaceId: workspace.id, content: rulesValue }).unwrap()
      setRulesSaved(true)
      setRulesDraft(null)
    } catch (err) {
      setRulesError(getApiErrorMessage(err, t('rules.saveError')))
    }
  }

  async function handleGenerateLink() {
    if (!canManage) return
    setInviteError(null)
    setInviteCopied(false)
    try {
      const result = await createInviteLink(workspace.id).unwrap()
      setInviteUrl(result.data.inviteUrl)
    } catch (err) {
      setInviteError(getApiErrorMessage(err, t('wsSettings.inviteError')))
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setInviteCopied(true)
    } catch {
      setInviteError(t('wsSettings.copyFailed'))
    }
  }

  async function confirmArchiveOrRestore() {
    setArchiveError(null)
    try {
      if (archived) {
        await restoreWorkspace(workspace.id).unwrap()
      } else {
        await archiveWorkspace(workspace.id).unwrap()
        navigate('/dashboard')
      }
      setArchiveOpen(false)
    } catch (err) {
      setArchiveError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  async function confirmPermanentDelete() {
    if (deleteConfirm.trim() !== workspace.name) return
    setDeleteError(null)
    try {
      await permanentDelete(workspace.id).unwrap()
      setDeleteOpen(false)
      navigate('/dashboard')
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, t('wsSettings.deleteError')))
    }
  }

  const showGeneral = sections === 'all' || sections === 'general'
  const showRules = sections === 'all' || sections === 'rules'
  const showIntegrations = sections === 'all' || sections === 'integrations'

  const heading =
    sections === 'rules'
      ? t('rules.title')
      : sections === 'integrations'
        ? t('pageSubnav.integrations')
        : t('wsSettings.title')
  const subheading =
    sections === 'rules'
      ? t('rules.subtitle')
      : sections === 'integrations'
        ? t('pageSubnav.integrationsHint')
        : t('wsSettings.subtitle')

  return (
    <section id="workspace-settings" className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">{heading}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
      </div>

      {/* General */}
      {showGeneral ? (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('wsSettings.generalTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('wsSettings.generalSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={(e) => void saveGeneral(e)}>
            {generalError ? (
              <Alert
                variant="error"
                title={t('wsSettings.generalSaveError')}
                description={generalError}
              />
            ) : null}
            {generalSaved ? <Alert variant="success" title={t('wsSettings.generalSaved')} /> : null}
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
                  {savingGeneral ? t('wsSettings.saving') : t('common.save')}
                </Button>
              </div>
            ) : null}
            {!canManage ? (
              <p className="text-xs text-muted-foreground">{t('wsSettings.readOnlyHint')}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
      ) : null}

      {/* Permissions (+ rules when full) */}
      {showGeneral || showRules ? (
      <Card className="border-border/70">
        <CardHeader>
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <CardTitle className="text-base">
                {showRules && !showGeneral ? t('rules.title') : t('wsSettings.permissionsTitle')}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {showRules && !showGeneral
                  ? t('rules.subtitle')
                  : t('wsSettings.permissionsSubtitle')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {showGeneral ? (
            <>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t('wsSettings.permAdmins', { count: adminCount })}</li>
            <li>{t('wsSettings.permInvite')}</li>
            <li>{t('wsSettings.permArchive')}</li>
            <li>{t('wsSettings.permMembers')}</li>
          </ul>

          {canManage && !archived ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium">{t('wsSettings.inviteLinkTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('wsSettings.inviteLinkHint')}</p>
              {inviteError ? (
                <Alert
                  className="mt-3"
                  variant="error"
                  title={t('wsSettings.inviteError')}
                  description={inviteError}
                />
              ) : null}
              {inviteUrl ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={inviteUrl} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5 shrink-0"
                    onClick={() => void copyInviteLink()}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    {inviteCopied ? t('wsSettings.copied') : t('wsSettings.copyLink')}
                  </Button>
                </div>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                disabled={creatingLink}
                onClick={() => void handleGenerateLink()}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
                {creatingLink ? t('wsSettings.generatingLink') : t('wsSettings.generateLink')}
              </Button>
            </div>
          ) : null}
            </>
          ) : null}

          {showRules ? (
          <form
            className={`flex flex-col gap-3 ${showGeneral ? 'border-t border-border/60 pt-4' : ''}`}
            onSubmit={(e) => void saveRules(e)}
          >
            {showGeneral ? (
              <div>
                <p className="text-sm font-medium">{t('rules.title')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('rules.subtitle')}</p>
              </div>
            ) : null}
            {rulesLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
            {rulesError ? (
              <Alert variant="error" title={t('rules.saveError')} description={rulesError} />
            ) : null}
            {rulesSaved ? <Alert variant="success" title={t('rules.saved')} /> : null}
            {!rulesLoading ? (
              <>
                <textarea
                  className="tf-input min-h-32 resize-y"
                  value={rulesValue}
                  onChange={(e) => {
                    setRulesDraft(e.target.value)
                    setRulesSaved(false)
                  }}
                  placeholder={t('rules.placeholder')}
                  disabled={!canManage || savingRules || archived}
                />
                {canManage && !archived ? (
                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" disabled={savingRules}>
                      {savingRules ? t('rules.saving') : t('common.save')}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </form>
          ) : null}
        </CardContent>
      </Card>
      ) : null}

      {showIntegrations ? (
        <WorkspaceGitHubPanel workspace={workspace} canManage={canManage && !archived} />
      ) : null}

      {/* Danger zone */}
      {showGeneral && canManage ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">{t('wsSettings.dangerTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('wsSettings.dangerSubtitle')}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
              <div>
                <p className="text-sm font-medium">
                  {archived ? t('wsSettings.restoreLabel') : t('wsSettings.archiveLabel')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {archived ? t('wsSettings.restoreHint') : t('wsSettings.archiveHint')}
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
                <p className="text-sm font-medium text-destructive">{t('wsSettings.deleteLabel')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {archived ? t('wsSettings.deleteHint') : t('wsSettings.deleteNeedArchive')}
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
                {t('wsSettings.deletePermanent')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ArchiveConfirmModal
        open={archiveOpen}
        mode={archived ? 'restore' : 'archive'}
        entityLabel={t('archive.entityWorkspace')}
        name={workspace.name}
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
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteError(null)
          setDeleteConfirm('')
        }}
        title={t('wsSettings.deleteTitle')}
        description={t('wsSettings.deleteDescription', { name: workspace.name })}
      >
        <div className="mt-4 flex flex-col gap-3">
          {deleteError ? (
            <Alert variant="error" title={t('wsSettings.deleteError')} description={deleteError} />
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('wsSettings.deleteConfirmLabel')}</span>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              disabled={deleting}
              placeholder={workspace.name}
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
              disabled={deleting || deleteConfirm.trim() !== workspace.name}
              onClick={() => void confirmPermanentDelete()}
            >
              {deleting ? t('wsSettings.deleting') : t('wsSettings.deletePermanent')}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
