import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { useLazyMeQuery } from '@/services/authApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout, setBootstrapped, setUser } from '@/store/slices/authSlice'
import type { PublicUser } from '@/types/auth'

function toPublicUser(data: Record<string, unknown>): PublicUser {
  return {
    id: String(data.id ?? data._id ?? ''),
    email: String(data.email ?? ''),
    name: String(data.name ?? ''),
    avatar: (data.avatar as string | null) ?? null,
    isActive: Boolean(data.isActive ?? true),
    emailVerified: Boolean(data.emailVerified ?? false),
    lastLogin: (data.lastLogin as string | null) ?? null,
  }
}

function SessionLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loading label={label} />
    </div>
  )
}

export function RequireAuth() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { t } = useI18n()
  const { token, user, bootstrapped } = useAppSelector((state) => state.auth)
  const [fetchMe] = useLazyMeQuery()

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!token) {
        dispatch(setBootstrapped(true))
        return
      }

      if (user) {
        dispatch(setBootstrapped(true))
        return
      }

      try {
        const result = await fetchMe().unwrap()
        if (cancelled) return
        dispatch(setUser(toPublicUser(result.data as Record<string, unknown>)))
      } catch {
        if (cancelled) return
        dispatch(logout())
      } finally {
        if (!cancelled) dispatch(setBootstrapped(true))
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [dispatch, fetchMe, token, user])

  if (!bootstrapped) {
    return <SessionLoading label={t('auth.loadingWorkspace')} />
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { token, bootstrapped } = useAppSelector((state) => state.auth)

  if (!bootstrapped && token) {
    return <SessionLoading label={t('auth.checkingSession')} />
  }

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
