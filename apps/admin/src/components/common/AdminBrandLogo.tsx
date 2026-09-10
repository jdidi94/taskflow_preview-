import { useI18n } from '@/i18n'

type AdminBrandLogoProps = {
  className?: string
  imgClassName?: string
}

export function AdminBrandLogo({ className = '', imgClassName = '' }: AdminBrandLogoProps) {
  const { t } = useI18n()
  const brand = t('common.brand')

  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <img
        src="/logo-admin.svg"
        alt={brand}
        className={`block h-full w-auto object-contain object-start ${imgClassName}`.trim()}
        decoding="async"
      />
    </span>
  )
}
