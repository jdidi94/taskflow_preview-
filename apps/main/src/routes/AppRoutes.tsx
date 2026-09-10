import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { RouteFallback } from '@/components/common/RouteFallback'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'

const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const FeaturesPage = lazy(() => import('@/pages/FeaturesPage').then((m) => ({ default: m.FeaturesPage })))
const PricingPage = lazy(() => import('@/pages/PricingPage').then((m) => ({ default: m.PricingPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const OAuthCallbackPage = lazy(() =>
  import('@/pages/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage })),
)
const GitHubLinkCallbackPage = lazy(() =>
  import('@/pages/GitHubLinkCallbackPage').then((m) => ({ default: m.GitHubLinkCallbackPage })),
)
const DriveLinkCallbackPage = lazy(() =>
  import('@/pages/DriveLinkCallbackPage').then((m) => ({ default: m.DriveLinkCallbackPage })),
)
const InviteLandingPage = lazy(() =>
  import('@/pages/InviteLandingPage').then((m) => ({ default: m.InviteLandingPage })),
)
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const MyTasksPage = lazy(() => import('@/pages/MyTasksPage').then((m) => ({ default: m.MyTasksPage })))
const TemplatesPage = lazy(() => import('@/pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })))
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage').then((m) => ({ default: m.WorkspacePage })))
const SpacePage = lazy(() => import('@/pages/SpacePage').then((m) => ({ default: m.SpacePage })))
const BoardPage = lazy(() => import('@/pages/BoardPage').then((m) => ({ default: m.BoardPage })))
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
)
const ChatPage = lazy(() => import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const BillingUpgradePage = lazy(() =>
  import('@/pages/BillingUpgradePage').then((m) => ({ default: m.BillingUpgradePage })),
)
const AiPage = lazy(() => import('@/pages/AiPage').then((m) => ({ default: m.AiPage })))
const BillingSuccessPage = lazy(() =>
  import('@/pages/BillingSuccessPage').then((m) => ({ default: m.BillingSuccessPage })),
)
const BillingCancelPage = lazy(() =>
  import('@/pages/BillingCancelPage').then((m) => ({ default: m.BillingCancelPage })),
)

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/auth/github-link-callback" element={<GitHubLinkCallbackPage />} />
        <Route path="/auth/drive-link-callback" element={<DriveLinkCallbackPage />} />
        <Route path="/invite/:token" element={<InviteLandingPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/my-tasks" element={<MyTasksPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
            <Route path="/spaces/:spaceId" element={<SpacePage />} />
            <Route path="/boards/:boardId" element={<BoardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/upgrade" element={<BillingUpgradePage />} />
            <Route path="/ai" element={<AiPage />} />
            <Route path="/success" element={<BillingSuccessPage />} />
            <Route path="/cancel" element={<BillingCancelPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
