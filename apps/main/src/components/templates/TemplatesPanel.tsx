import { useState } from 'react'
import { Loading } from '@taskflow/ui'
import { FileText } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { PaginationBar } from '@/components/common/PaginationBar'
import { ApplyTemplateModal } from '@/components/templates/ApplyTemplateModal'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useLikeTemplateMutation,
  useListTemplatesQuery,
  type TemplateItem,
} from '@/services/templatesApi'
import { useAppSelector } from '@/store/hooks'

export function TemplatesPanel() {
  const { t } = useI18n()
  const userId = useAppSelector((state) => state.auth.user?.id)
  const { data, isLoading, isError } = useListTemplatesQuery({ type: 'board' })
  const { data: spaceTemplatesData } = useListTemplatesQuery({ type: 'space' })
  const [likeTemplate, { isLoading: liking }] = useLikeTemplateMutation()
  const [applyTarget, setApplyTarget] = useState<TemplateItem | null>(null)
  const [likeError, setLikeError] = useState<string | null>(null)

  const boardTemplates = data?.data ?? []
  const spaceTemplates = spaceTemplatesData?.data ?? []
  const templates = [...boardTemplates, ...spaceTemplates]
  const { pageItems, pagination, setPage, setLimit } = useClientPagination(templates, 12)

  async function onToggleLike(template: TemplateItem) {
    setLikeError(null)
    try {
      await likeTemplate({ id: template.id }).unwrap()
    } catch (err) {
      setLikeError(getApiErrorMessage(err, t('templates.likeError')))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('templates.title') },
          ]}
        />
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('templates.title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('templates.subtitle')}</p>
      </section>

      {isLoading ? <Loading label={t('common.loading')} /> : null}
      {isError ? <p className="text-sm text-destructive">{t('templates.loadError')}</p> : null}
      {likeError ? <p className="text-sm text-destructive">{likeError}</p> : null}

      {!isLoading && !isError && templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('templates.emptyTitle')}
          description={t('templates.empty')}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            liked={Boolean(userId && template.likedBy.includes(userId))}
            liking={liking}
            canLike={Boolean(userId)}
            onUse={setApplyTarget}
            onToggleLike={(item) => void onToggleLike(item)}
          />
        ))}
      </div>

      {!isLoading && !isError && templates.length > 0 ? (
        <PaginationBar
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      ) : null}

      <ApplyTemplateModal
        open={Boolean(applyTarget)}
        template={applyTarget}
        onClose={() => setApplyTarget(null)}
      />
    </div>
  )
}
