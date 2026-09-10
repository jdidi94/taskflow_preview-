import { motion, useReducedMotion } from 'framer-motion'
import { NavLink, useParams } from 'react-router'
import { Button } from '@taskflow/ui'
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Home,
  LayoutGrid,
  ListTodo,
  MessageCircle,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'

import { RecentBoardsNav } from '@/components/common/RecentBoardsNav'
import { useRecentBoards } from '@/hooks/useRecentBoards'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import { reduced, snappySpring, softSpring } from '@/lib/motion'

const SIDEBAR_COLLAPSED_KEY = 'taskflow-sidebar-collapsed'

type NavItem = {
  to: string
  labelKey: MessageKey
  icon: LucideIcon
  end?: boolean
}

type AppSidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}

function readCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
}

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const { t, isRTL } = useI18n()
  const reduceMotion = useReducedMotion()
  const { workspaceId, spaceId, boardId } = useParams()
  const recents = useRecentBoards()
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const recentMatch = boardId ? recents.find((board) => board.id === boardId) : undefined
  const ctxWorkspaceId = workspaceId || recentMatch?.workspaceId
  const ctxSpaceId = spaceId || recentMatch?.spaceId

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  const items: NavItem[] = [
    { to: '/dashboard', labelKey: 'nav.home', icon: Home, end: true },
    { to: '/my-tasks', labelKey: 'nav.myTasks', icon: ListTodo },
    { to: '/templates', labelKey: 'nav.templates', icon: FileText },
    { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
    { to: '/ai', labelKey: 'nav.ai', icon: Sparkles },
    { to: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings },
  ]

  if (ctxWorkspaceId) {
    items.splice(1, 0, {
      to: `/workspaces/${ctxWorkspaceId}`,
      labelKey: 'nav.workspace',
      icon: Users,
      end: true,
    })
  }
  if (ctxSpaceId) {
    items.splice(ctxWorkspaceId ? 2 : 1, 0, {
      to: `/spaces/${ctxSpaceId}`,
      labelKey: 'nav.space',
      icon: LayoutGrid,
      end: true,
    })
  }
  if (boardId) {
    items.splice(ctxWorkspaceId && ctxSpaceId ? 3 : ctxWorkspaceId || ctxSpaceId ? 2 : 1, 0, {
      to: `/boards/${boardId}`,
      labelKey: 'nav.board',
      icon: LayoutGrid,
      end: true,
    })
  }

  const iconOnly = !mobile && collapsed
  const CollapseIcon = isRTL
    ? collapsed
      ? ChevronsLeft
      : ChevronsRight
    : collapsed
      ? ChevronsRight
      : ChevronsLeft

  const nav = (
    <nav className="flex flex-col gap-1">
      {!iconOnly ? (
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('nav.menu')}
        </p>
      ) : (
        <span className="sr-only">{t('nav.menu')}</span>
      )}
      {items.map(({ to, labelKey, icon: Icon, end }) => {
        const label = t(labelKey)
        return (
          <NavLink
            key={`${to}-${labelKey}`}
            to={to}
            end={end}
            title={iconOnly ? label : undefined}
            aria-label={iconOnly ? label : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              `relative flex items-center rounded-md text-sm transition-colors ${focusRingClassName} ${
                iconOnly ? 'justify-center px-0 py-2.5' : 'gap-2 py-2 pe-2.5 ps-3'
              } ${
                isActive
                  ? 'bg-muted font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId={mobile ? 'sidebar-active-rail-mobile' : 'sidebar-active-rail'}
                    className="absolute inset-y-1.5 start-0 w-[3px] rounded-e-full bg-primary"
                    transition={reduced(snappySpring, reduceMotion)}
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`}
                  aria-hidden
                />
                {!iconOnly ? <span className="truncate">{label}</span> : null}
              </>
            )}
          </NavLink>
        )
      })}
      <RecentBoardsNav iconOnly={iconOnly} onNavigate={onNavigate} />
    </nav>
  )

  if (mobile) return nav

  return (
    <motion.aside
      className="hidden shrink-0 overflow-hidden border-e border-border/40 bg-background/40 lg:block"
      initial={false}
      animate={{ width: collapsed ? 56 : 224 }}
      transition={reduced(softSpring, reduceMotion)}
    >
      <div className="sticky top-16 flex max-h-[calc(100vh-4rem)] flex-col gap-2 overflow-y-auto p-2">
        <div className={collapsed ? 'px-0' : 'p-1'}>{nav}</div>
        <div className={`mt-auto border-t border-border/40 pt-2 ${collapsed ? '' : 'px-1'}`}>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`w-full ${collapsed ? 'justify-center px-0' : 'justify-start gap-2'}`}
            onClick={toggleCollapsed}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            aria-expanded={!collapsed}
          >
            <CollapseIcon className="h-4 w-4 shrink-0" aria-hidden />
            {!collapsed ? <span className="truncate">{t('nav.collapseSidebar')}</span> : null}
          </Button>
        </div>
      </div>
    </motion.aside>
  )
}
