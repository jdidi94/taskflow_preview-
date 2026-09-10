import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Button } from '@taskflow/ui'
import { ThemeToggle } from '@taskflow/theme'
import { Menu, X } from 'lucide-react'

import { AdminAvatar } from '@/components/common/AdminAvatar'
import { AdminBrandLogo } from '@/components/common/AdminBrandLogo'
import { AdminSidebar } from '@/components/common/AdminSidebar'
import { AdminNotificationBell } from '@/components/notifications/AdminNotificationBell'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { staffRoleMessageKey } from '@/lib/staff'
import { useLogoutMutation } from '@/services/adminAuthApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout as logoutAction } from '@/store/slices/authSlice'
import type { AdminRole } from '@/types/auth'

const titles: Record<string, { title: MessageKey; desc: MessageKey }> = {
  '/dashboard': { title: 'nav.dashboard', desc: 'nav.overview' },
  '/users': { title: 'nav.users', desc: 'nav.manageUsers' },
  '/templates': { title: 'nav.templates', desc: 'nav.systemTemplates' },
  '/analytics': { title: 'nav.analytics', desc: 'nav.globalStats' },
  '/system-health': { title: 'nav.health', desc: 'nav.healthDesc' },
  '/chat': { title: 'nav.chat', desc: 'nav.chatDesc' },
  '/notifications': { title: 'nav.activity', desc: 'nav.activityDesc' },
  '/ai': { title: 'nav.ai', desc: 'nav.aiQuota' },
  '/settings': { title: 'nav.settings', desc: 'nav.security' },
}

export function AdminLayout() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const admin = useAppSelector((state) => state.auth.admin)
  const [logoutRequest, { isLoading }] = useLogoutMutation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const meta =
    Object.entries(titles).find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[1] ??
    titles['/dashboard']!

  async function handleLogout() {
    try {
      await logoutRequest().unwrap()
    } catch {
      // still clear local session
    }
    dispatch(logoutAction())
    navigate('/login', { replace: true })
  }

  const role = (admin?.role ?? 'admin') as AdminRole

  return (
    <div className="min-h-screen bg-background text-foreground lg:ps-64">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e border-border/60 bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-4">
          <Link to="/dashboard" className="inline-flex min-w-0" aria-label={t('common.brand')}>
            <AdminBrandLogo className="h-9 max-w-[12rem]" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar />
        </div>
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t('common.close')}
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-72 bg-card shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
              <AdminBrandLogo className="h-8 max-w-[10rem]" />
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} aria-label={t('common.close')}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label={t('nav.menu')}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate font-medium">{t(meta.title)}</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{t(meta.desc)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/settings"
              className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-muted/60"
            >
              <AdminAvatar name={admin?.name} email={admin?.email} avatar={admin?.avatar} />
              <span className="hidden min-w-0 md:flex md:flex-col">
                <span className="max-w-[10rem] truncate text-sm font-medium">{admin?.name ?? admin?.email}</span>
                <span className="text-xs text-muted-foreground">{t(staffRoleMessageKey(role))}</span>
              </span>
            </Link>
            <AdminNotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => setConfirmLogout(true)} disabled={isLoading}>
              {t('common.logOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <ConfirmationDialog
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => void handleLogout()}
        title={t('logout.title')}
        description={t('logout.body')}
        confirmText={t('common.logOut')}
        type="warning"
        isLoading={isLoading}
      />
    </div>
  )
}
