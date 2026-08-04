import { AuthShell, LoginForm } from '@/components/auth'
import { RedirectIfAuthed } from '@/features/auth/RequireAuth'

export function LoginPage() {
  return (
    <RedirectIfAuthed>
      <AuthShell accent="primary">
        <LoginForm />
      </AuthShell>
    </RedirectIfAuthed>
  )
}
