import { AuthShell, ForgotPasswordForm } from '@/components/auth'
import { RedirectIfAuthed } from '@/features/auth/RequireAuth'

export function ForgotPasswordPage() {
  return (
    <RedirectIfAuthed>
      <AuthShell accent="accent">
        <ForgotPasswordForm />
      </AuthShell>
    </RedirectIfAuthed>
  )
}
