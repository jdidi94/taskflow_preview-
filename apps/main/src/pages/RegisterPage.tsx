import { AuthShell, RegisterForm } from '@/components/auth'
import { RedirectIfAuthed } from '@/features/auth/RequireAuth'

export function RegisterPage() {
  return (
    <RedirectIfAuthed>
      <AuthShell accent="accent">
        <RegisterForm />
      </AuthShell>
    </RedirectIfAuthed>
  )
}
