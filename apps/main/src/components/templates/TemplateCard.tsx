import { Badge, Button, Card, CardContent } from '@taskflow/ui'
import { Eye, Heart, LayoutTemplate } from 'lucide-react'

import { templateCoverGradient } from '@/components/templates/templateCategoryStyles'
import { useI18n } from '@/i18n'
import type { TemplateItem } from '@/services/templatesApi'

type TemplateCardProps = {
  template: TemplateItem
  liked: boolean
  liking?: boolean
  canLike?: boolean
  onUse: (template: TemplateItem) => void
  onToggleLike: (template: TemplateItem) => void
}

export function TemplateCard({
  template,
  liked,
  liking,
  canLike,
  onUse,
  onToggleLike,
}: TemplateCardProps) {
  const { t } = useI18n()
  const cover = templateCoverGradient(template.category, template.type)

  return (
    <Card className="overflow-hidden border-border/70 transition hover:border-primary/35">
      <div className={`relative h-28 bg-gradient-to-br ${cover}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary-foreground)_/_0.12),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/25 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-background/20 text-primary-foreground backdrop-blur-sm">
              <LayoutTemplate className="h-4 w-4" aria-hidden />
            </span>
            {template.category ? (
              <Badge
                variant="secondary"
                className="border-0 bg-background/85 text-[10px] text-foreground shadow-sm"
              >
                {template.category}
              </Badge>
            ) : null}
          </div>
          <p className="line-clamp-2 font-display text-base font-semibold leading-snug text-primary-foreground drop-shadow-sm">
            {template.name}
          </p>
        </div>
      </div>

      <CardContent className="flex flex-col gap-3 pt-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {template.description?.trim() || t('templates.noDescription')}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{t('templates.typeLabel', { type: template.type })}</span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {t('templates.viewsCount', { count: template.views ?? 0 })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current text-primary' : ''}`} aria-hidden />
            {t('templates.likesCount', { count: template.likesCount })}
          </span>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="primary" size="sm" className="flex-1" onClick={() => onUse(template)}>
            {t('templates.apply')}
          </Button>
          <Button
            type="button"
            variant={liked ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5"
            disabled={liking || !canLike}
            onClick={() => onToggleLike(template)}
            aria-label={liked ? t('templates.unlike') : t('templates.like')}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} aria-hidden />
            <span className="hidden sm:inline">{liked ? t('templates.unlike') : t('templates.like')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
