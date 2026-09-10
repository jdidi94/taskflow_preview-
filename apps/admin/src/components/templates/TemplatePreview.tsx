import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { parseTemplateContent, type TemplateCardPriority } from '@/lib/templateContent'
import type { AdminTemplate } from '@/types/templates'

const PRIORITY_COLORS: Record<TemplateCardPriority, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#DC2626',
}

type TemplatePreviewProps = {
  isOpen: boolean
  template: AdminTemplate | null
  onClose: () => void
}

export function TemplatePreview({ isOpen, template, onClose }: TemplatePreviewProps) {
  const { t } = useI18n()
  if (!template) return null

  const board = parseTemplateContent(template.content)

  function priorityLabel(priority: TemplateCardPriority) {
    if (priority === 'low') return t('templates.priorityLow')
    if (priority === 'high') return t('templates.priorityHigh')
    if (priority === 'urgent') return t('templates.priorityUrgent')
    return t('templates.priorityMedium')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('templates.previewTitle')} className="max-w-5xl!">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold">{template.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{template.description || '—'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {template.category ? <Badge variant="secondary">{template.category}</Badge> : null}
              <Badge variant={template.isPublic ? 'success' : 'secondary'}>
                {template.isPublic ? t('templates.public') : t('templates.private')}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-2xl font-semibold">{board.lists.length}</p>
              <p className="text-xs text-muted-foreground">{t('templates.columnsCount', { count: board.lists.length })}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-2xl font-semibold">{board.cards.length}</p>
              <p className="text-xs text-muted-foreground">{t('templates.cardsCount', { count: board.cards.length })}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('templates.boardPreview')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('templates.boardPreviewHint')}</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {board.lists.map((list) => {
                const cards = board.cards.filter((card) => card.listId === list.id).sort((a, b) => a.order - b.order)
                return (
                  <div key={list.id} className="w-64 shrink-0 rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between border-b border-border/70 px-3 py-2" style={{ backgroundColor: `${list.color}20` }}>
                      <span className="text-sm font-medium">{list.title}</span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: list.color }} />
                    </div>
                    <div className="min-h-32 space-y-2 p-2">
                      {cards.length === 0 ? (
                        <p className="px-1 py-6 text-center text-xs text-muted-foreground">{t('templates.noCards')}</p>
                      ) : (
                        cards.map((card) => (
                          <div key={card.id} className="rounded-md border border-border/70 bg-card p-2 shadow-sm">
                            <p className="text-sm font-medium">{card.title}</p>
                            {card.description ? <p className="mt-1 text-xs text-muted-foreground">{card.description}</p> : null}
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[card.priority] }} />
                                {priorityLabel(card.priority)}
                              </span>
                              {card.estimatedHours > 0 ? <span>{card.estimatedHours}h</span> : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
