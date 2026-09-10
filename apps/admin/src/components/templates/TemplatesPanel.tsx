import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Loading } from '@taskflow/ui'
import { Eye, Pencil, Trash2 } from 'lucide-react'

import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/ToastProvider'
import { TemplateForm } from '@/components/templates/TemplateForm'
import { TemplatePreview } from '@/components/templates/TemplatePreview'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { parseTemplateContent } from '@/lib/templateContent'
import {
  useCreateProjectTemplateMutation,
  useDeleteProjectTemplateMutation,
  useListAiPromptsQuery,
  useListBrandingQuery,
  useListProjectTemplatesQuery,
  useListTaskTemplatesQuery,
  useUpdateProjectTemplateMutation,
} from '@/services/adminTemplatesApi'
import type { AdminTemplate } from '@/types/templates'

type Tab = 'projects' | 'tasks' | 'prompts' | 'branding'

export function TemplatesPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('projects')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState<AdminTemplate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AdminTemplate | null>(null)

  const projectsQuery = useListProjectTemplatesQuery()
  const tasksQuery = useListTaskTemplatesQuery(undefined, { skip: tab !== 'tasks' })
  const promptsQuery = useListAiPromptsQuery(undefined, { skip: tab !== 'prompts' })
  const brandingQuery = useListBrandingQuery(undefined, { skip: tab !== 'branding' })
  const [createTemplate, { isLoading: creatingBusy }] = useCreateProjectTemplateMutation()
  const [updateTemplate, { isLoading: updatingBusy }] = useUpdateProjectTemplateMutation()
  const [deleteTemplate] = useDeleteProjectTemplateMutation()

  const list = useMemo(() => {
    if (tab === 'projects') return projectsQuery.data?.data.templates ?? []
    if (tab === 'tasks') return tasksQuery.data?.data.templates ?? []
    if (tab === 'prompts') return promptsQuery.data?.data.prompts ?? []
    return []
  }, [projectsQuery.data, promptsQuery.data, tab, tasksQuery.data])

  const filtered = list.filter((item) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q)
  })

  const loading =
    (tab === 'projects' && projectsQuery.isLoading) ||
    (tab === 'tasks' && tasksQuery.isLoading) ||
    (tab === 'prompts' && promptsQuery.isLoading) ||
    (tab === 'branding' && brandingQuery.isLoading)

  function openCreate() {
    setCreating(true)
    setEditing(null)
    setError(null)
  }

  function openEdit(item: AdminTemplate) {
    setEditing(item)
    setCreating(true)
    setError(null)
  }

  return (
    <div>
      <PageHeader
        title={t('templates.title')}
        subtitle={t('templates.subtitle')}
        actions={
          tab === 'projects' ? (
            <Button variant="primary" onClick={openCreate}>
              {t('templates.create')}
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(['projects', 'tasks', 'prompts', 'branding'] as const).map((item) => (
          <Button key={item} size="sm" variant={tab === item ? 'primary' : 'outline'} onClick={() => setTab(item)}>
            {item === 'projects'
              ? t('templates.tabProjects')
              : item === 'tasks'
                ? t('templates.tabTasks')
                : item === 'prompts'
                  ? t('templates.tabPrompts')
                  : t('templates.tabBranding')}
          </Button>
        ))}
      </div>

      {tab !== 'branding' ? (
        <Input className="mb-4 max-w-sm" placeholder={t('common.search')} value={search} onChange={(event) => setSearch(event.target.value)} />
      ) : null}

      {loading ? <Loading label={t('common.loading')} /> : null}

      {tab === 'branding' && !loading ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.tabBranding')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{t('templates.brandingStub')}</p>
            {(brandingQuery.data?.data.assets ?? []).map((asset) => (
              <div key={asset.key} className="flex justify-between gap-4">
                <span>{asset.label}</span>
                <span className="text-muted-foreground">{asset.url ?? '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab !== 'branding' && !loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.length === 0 ? (
            <Alert variant="info" title={t('templates.empty')} />
          ) : (
            filtered.map((item) => {
              const board = parseTemplateContent(item.content)
              return (
                <Card key={itemId(item)}>
                  <CardHeader>
                    <CardTitle>{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{item.description || '—'}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                      {item.isPublic ? <Badge variant="success">{t('templates.public')}</Badge> : null}
                      <Badge variant="outline">{t('templates.columnsCount', { count: board.lists.length })}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPreviewing(item)}>
                        <Eye className="me-1 h-4 w-4" />
                        {t('templates.preview')}
                      </Button>
                      {tab === 'projects' ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                            <Pencil className="me-1 h-4 w-4" />
                            {t('common.edit')}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setPendingDelete(item)}>
                            <Trash2 className="me-1 h-4 w-4" />
                            {t('common.delete')}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      ) : null}

      <TemplateForm
        isOpen={creating}
        template={editing}
        busy={creatingBusy || updatingBusy}
        error={error}
        onClose={() => {
          setCreating(false)
          setEditing(null)
          setError(null)
        }}
        onSave={async (input) => {
          try {
            if (editing) {
              await updateTemplate({ templateId: itemId(editing), ...input }).unwrap()
            } else {
              await createTemplate(input).unwrap()
            }
            setCreating(false)
            setEditing(null)
            toast.show({ message: t('templates.savedOk') })
          } catch (err) {
            setError(getApiErrorMessage(err, t('templates.saveError')))
          }
        }}
      />

      <TemplatePreview isOpen={Boolean(previewing)} template={previewing} onClose={() => setPreviewing(null)} />

      <ConfirmationDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        type="danger"
        title={t('templates.deleteTitle')}
        description={t('templates.deleteBody', { name: pendingDelete?.name ?? '' })}
        confirmText={t('common.delete')}
        onConfirm={async () => {
          if (!pendingDelete) return
          try {
            await deleteTemplate(itemId(pendingDelete)).unwrap()
            setPendingDelete(null)
            toast.show({ message: t('templates.deletedOk') })
          } catch (err) {
            toast.error(getApiErrorMessage(err, t('templates.deleteError')))
            setPendingDelete(null)
          }
        }}
      />
    </div>
  )
}

function itemId(item: AdminTemplate) {
  return String(item.id)
}
