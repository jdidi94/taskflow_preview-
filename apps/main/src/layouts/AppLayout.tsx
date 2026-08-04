import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate } from 'react-router'
import { ThemeToggle } from '@taskflow/theme'
import { Button } from '@taskflow/ui'
import { Menu, Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ChatFab } from '@/components/chat/ChatFab'
import { AppSidebar } from '@/components/common/AppSidebar'
import { CommandPalette } from '@/components/common/CommandPalette'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { AnimatedOutlet } from '@/components/common/PageTransition'
import { NotificationNavLink } from '@/components/notifications'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'
import { useI18n } from '@/i18n'
import { reduced, softSpring } from '@/lib/motion'
import { useLogoutMutation } from '@/services/authApi'
import { useGetNotificationStatsQuery } from '@/services/notificationsApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout as logoutAction } from '@/store/slices/authSlice'

export function AppLayout() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const user = useAppSelector((state) => state.auth.user)
  const token = useAppSelector((state) => state.auth.token)
  const [logoutRequest, { isLoading }] = useLogoutMutation()
  const { data: statsData } = useGetNotificationStatsQuery(undefined, { skip: !token })
  useNotificationSocket(Boolean(token))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  const unread = statsData?.data.stats.unread ?? 0

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  async function handleLogout() {
    try {
      await logoutRequest().unwrap()
    } catch {
      // Still clear local session if the API call fails.
    }
    dispatch(logoutAction())
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={t('nav.menu')}
              aria-expanded={mobileNavOpen}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Link
              to="/dashboard"
              className="rounded-sm font-display text-xl font-semibold tracking-tight text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('common.brand')}
            </Link>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => setCommandOpen(true)}
              aria-label={t('command.open')}
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              <span className="text-muted-foreground">{t('command.open')}</span>
              <kbd className="rounded border border-border/70 px-1 py-0.5 text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="sm:hidden"
              onClick={() => setCommandOpen(true)}
              aria-label={t('command.open')}
            >
              <Search className="h-4 w-4" />
            </Button>
            <NotificationNavLink unread={unread} />
            <span className="hidden truncate text-sm text-muted-foreground lg:inline">
              {user?.name ?? user?.email}
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => void handleLogout()} disabled={isLoading}>
              {t('common.logOut')}
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {mobileNavOpen ? (
          <motion.div
            key="mobile-nav"
            className="overflow-hidden border-b border-border/40 bg-background/90 lg:hidden"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={reduced(softSpring, reduceMotion)}
          >
            <div className="px-4 py-3">
              <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto flex max-w-7xl">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">
          <AnimatedOutlet />
        </main>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ChatFab />
    </div>
  )
}
