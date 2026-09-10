import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { ThemeProvider } from '@taskflow/theme'
import '@taskflow/theme/variables.css'
import '@taskflow/ui/styles.css'
import './index.css'

import App from './App.tsx'
import { ApiHealthGate } from '@/components/common/ApiHealthGate'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastProvider } from '@/components/common/ToastProvider'
import { I18nProvider } from '@/i18n'
import { useLazyMeQuery } from '@/services/adminAuthApi'
import { store } from '@/store'
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

function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch()
  const { token, bootstrapped } = useAppSelector((state) => state.auth)
  const [fetchMe] = useLazyMeQuery()

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (bootstrapped) return
      if (!token) {
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
  }, [bootstrapped, dispatch, fetchMe, token])

  return children
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider>
          <ToastProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <ApiHealthGate>
                  <AuthBootstrap>
                    <App />
                  </AuthBootstrap>
                </ApiHealthGate>
              </ErrorBoundary>
            </BrowserRouter>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
