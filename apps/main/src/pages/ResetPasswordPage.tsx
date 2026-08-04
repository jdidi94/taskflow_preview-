import { AuthShell, ResetPasswordForm } from '@/components/auth'
import { RedirectIfAuthed } from '@/features/auth/RequireAuth'

export function ResetPasswordPage() {
  return (
    <RedirectIfAuthed>
      <AuthShell accent="accent">
        <ResetPasswordForm />
      </AuthShell>
    </RedirectIfAuthed>
  )
}
