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
import { PreviewNoticeModal } from '@/components/common/PreviewNoticeModal'
import { ToastProvider } from '@/components/common/ToastProvider'
import { I18nProvider } from '@/i18n'
import { useLazyMeQuery } from '@/services/authApi'
import { store } from '@/store'
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
  }, [bootstrapped, dispatch, fetchMe, token])

  return children
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider defaultTheme="light">
        <I18nProvider>
          <ToastProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <ApiHealthGate>
                  <AuthBootstrap>
                    <PreviewNoticeModal />
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
