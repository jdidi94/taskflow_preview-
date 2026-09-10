import { useI18n } from '@/i18n'

type BrandLogoProps = {
  /** mark = icon only · wordmark = logo-full · lockup = mark+word image */
  variant?: 'mark' | 'wordmark' | 'lockup'
  /** Replaces default size box when set (include h/w or max-w). */
  className?: string
  imgClassName?: string
}

const sources = {
  mark: '/logo.svg',
  wordmark: '/logo-full.svg',
  lockup: '/lockup.png',
} as const

/**
 * Default boxes. `logo-full.svg` is a padded square canvas, so it needs an
 * explicit square size — height-only made the glyph look tiny.
 */
const defaultBox: Record<keyof typeof sources, string> = {
  mark: 'h-9 w-9 sm:h-10 sm:w-10',
  wordmark: 'h-12 w-12 sm:h-14 sm:w-14',
  lockup: 'h-10 w-auto max-w-[12rem] sm:h-12 sm:max-w-[16rem] md:h-14 md:max-w-[18rem]',
}

export function BrandLogo({
  variant = 'wordmark',
  className,
  imgClassName = '',
}: BrandLogoProps) {
  const { t } = useI18n()
  const brand = t('common.brand')
  const box = className?.trim() ? className : defaultBox[variant]

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box}`.trim()}>
      <img
        src={sources[variant]}
        alt={brand}
        className={`block h-full w-full object-contain object-center ${imgClassName}`.trim()}
        decoding="async"
      />
    </span>
  )
}
