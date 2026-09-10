import { useEffect, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { useLazyMeQuery } from '@/services/adminAuthApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout, setAdmin, setBootstrapped } from '@/store/slices/authSlice'
import type { PublicAdmin } from '@/types/auth'

function toPublicAdmin(data: Record<string, unknown>): PublicAdmin {
  return {
    id: String(data.id ?? data._id ?? ''),
    userId: (data.userId as string | null) ?? null,
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    role: (data.role as PublicAdmin['role']) ?? 'admin',
    avatar: (data.avatar as string | null) ?? null,
    firstName: (data.firstName as string | null) ?? null,
    lastName: (data.lastName as string | null) ?? null,
    phoneNumber: (data.phoneNumber as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    isActive: Boolean(data.isActive ?? true),
    hasTwoFactorAuth: Boolean(data.hasTwoFactorAuth),
    lastActivity: (data.lastActivity as string | null) ?? null,
    createdAt: String(data.createdAt ?? ''),
    updatedAt: String(data.updatedAt ?? ''),
  }
}

function SessionLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loading label={label} />
    </div>
  )
}

export function RequireAdmin() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { t } = useI18n()
  const { token, admin, bootstrapped } = useAppSelector((state) => state.auth)
  const [fetchMe] = useLazyMeQuery()

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!token) {
        dispatch(setBootstrapped(true))
        return
      }
      if (admin) {
        dispatch(setBootstrapped(true))
        return
      }

      try {
        const result = await fetchMe().unwrap()
        if (cancelled) return
        dispatch(setAdmin(toPublicAdmin(result.data.admin as unknown as Record<string, unknown>)))
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
  }, [admin, dispatch, fetchMe, token])

  if (!bootstrapped) {
    return <SessionLoading label={t('auth.loadingSession')} />
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
