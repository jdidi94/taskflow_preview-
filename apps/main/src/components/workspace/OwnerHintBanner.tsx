import { useI18n } from '@/i18n'

type OwnerHintBannerProps = {
  show: boolean
}

/** Soft security hint when the workspace has a single owner and no other admins. */
export function OwnerHintBanner({ show }: OwnerHintBannerProps) {
  const { t } = useI18n()
  if (!show) return null

  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-3">
      <div className="flex items-start gap-2">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-destructive">{t('workspace.ownerHint')}</p>
      </div>
    </div>
  )
}
