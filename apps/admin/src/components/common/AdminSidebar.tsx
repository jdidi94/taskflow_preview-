import { NavLink } from 'react-router'
import { Activity, BarChart3, Bell, FileText, Home, MessageSquare, Settings, Sparkles, Users, type LucideIcon } from 'lucide-react'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'

type NavItem = {
  to: string
  labelKey: MessageKey
  descriptionKey: MessageKey
  icon: LucideIcon
}

const items: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', descriptionKey: 'nav.overview', icon: Home },
  { to: '/users', labelKey: 'nav.users', descriptionKey: 'nav.manageUsers', icon: Users },
  { to: '/templates', labelKey: 'nav.templates', descriptionKey: 'nav.systemTemplates', icon: FileText },
  { to: '/analytics', labelKey: 'nav.analytics', descriptionKey: 'nav.globalStats', icon: BarChart3 },
  { to: '/system-health', labelKey: 'nav.health', descriptionKey: 'nav.healthDesc', icon: Activity },
  { to: '/chat', labelKey: 'nav.chat', descriptionKey: 'nav.chatDesc', icon: MessageSquare },
  { to: '/notifications', labelKey: 'nav.activity', descriptionKey: 'nav.activityDesc', icon: Bell },
  { to: '/ai', labelKey: 'nav.ai', descriptionKey: 'nav.aiQuota', icon: Sparkles },
  { to: '/settings', labelKey: 'nav.settings', descriptionKey: 'nav.security', icon: Settings },
]

type AdminSidebarProps = {
  onNavigate?: () => void
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { t } = useI18n()

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={t('nav.menu')}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${focusRingClassName} ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted/70'
              }`
            }
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium">{t(item.labelKey)}</span>
              <span className="mt-0.5 block text-xs opacity-80">{t(item.descriptionKey)}</span>
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
