import { NavLink } from 'react-router'

import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'

const items = [
  { to: '/users', end: true, labelKey: 'staff.tabAppUsers' as const },
  { to: '/users/staff', end: true, labelKey: 'staff.tabStaff' as const },
]

export function UsersSubnav() {
  const { t } = useI18n()

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border/60 pb-px" aria-label={t('staff.tabs')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${focusRingClassName} ${
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`
          }
        >
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
