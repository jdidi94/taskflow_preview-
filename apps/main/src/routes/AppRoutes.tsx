import { Navigate, Route, Routes } from 'react-router'

import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from '@/layouts/AppLayout'
import { AboutPage } from '@/pages/AboutPage'
import { AiPage } from '@/pages/AiPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { BillingCancelPage } from '@/pages/BillingCancelPage'
import { BillingSuccessPage } from '@/pages/BillingSuccessPage'
import { BillingUpgradePage } from '@/pages/BillingUpgradePage'
import { BoardPage } from '@/pages/BoardPage'
import { ChatPage } from '@/pages/ChatPage'
import { ContactPage } from '@/pages/ContactPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { FeaturesPage } from '@/pages/FeaturesPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { GitHubLinkCallbackPage } from '@/pages/GitHubLinkCallbackPage'
import { DriveLinkCallbackPage } from '@/pages/DriveLinkCallbackPage'
import { InviteLandingPage } from '@/pages/InviteLandingPage'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { PricingPage } from '@/pages/PricingPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SocketLogsPage } from '@/pages/SocketLogsPage'
import { SpacePage } from '@/pages/SpacePage'
import { TemplatesPage } from '@/pages/TemplatesPage'
import { WorkspacePage } from '@/pages/WorkspacePage'

export function AppRoutes() {
  return (
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
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/workspaces/:workspaceId" element={<WorkspacePage />} />
          <Route path="/spaces/:spaceId" element={<SpacePage />} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/upgrade" element={<BillingUpgradePage />} />
          <Route path="/dev/sockets" element={<SocketLogsPage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/success" element={<BillingSuccessPage />} />
          <Route path="/cancel" element={<BillingCancelPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

