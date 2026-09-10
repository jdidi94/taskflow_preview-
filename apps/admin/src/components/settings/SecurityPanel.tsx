import { useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Loading } from '@taskflow/ui'

import { AdminAvatar } from '@/components/common/AdminAvatar'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/ToastProvider'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { ADMIN_PASSWORD_RE } from '@/lib/credentialRules'
import {
  useChangePasswordMutation,
  useDisable2FAMutation,
  useEnable2FAMutation,
  useGenerateBackupCodesMutation,
  useGenerateRecoveryTokenMutation,
  useGet2FAStatusQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useVerify2FASetupMutation,
} from '@/services/adminAuthApi'
import { useAddAdminUserMutation } from '@/services/adminUsersApi'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setAdmin } from '@/store/slices/authSlice'
import type { PublicAdmin } from '@/types/auth'

export function SecurityPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const dispatch = useAppDispatch()
  const admin = useAppSelector((state) => state.auth.admin)

  const { data: twoFa, isLoading: twoFaLoading, isError: twoFaError, refetch } = useGet2FAStatusQuery()
  const [changePassword, { isLoading: changingPassword }] = useChangePasswordMutation()
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation()
  const [uploadAvatar, { isLoading: uploadingAvatar }] = useUploadAvatarMutation()
  const [addAdmin, { isLoading: creatingAdmin }] = useAddAdminUserMutation()
  const [enable2FA, { isLoading: enabling }] = useEnable2FAMutation()
  const [verifySetup, { isLoading: verifying }] = useVerify2FASetupMutation()
  const [disable2FA, { isLoading: disabling }] = useDisable2FAMutation()
  const [generateBackup, { isLoading: generatingBackup }] = useGenerateBackupCodesMutation()
  const [generateRecovery, { isLoading: generatingRecovery }] = useGenerateRecoveryTokenMutation()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userName, setUserName] = useState(admin?.name ?? '')
  const [firstName, setFirstName] = useState(admin?.firstName ?? '')
  const [lastName, setLastName] = useState(admin?.lastName ?? '')
  const [phoneNumber, setPhoneNumber] = useState(admin?.phoneNumber ?? '')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminRole, setAdminRole] = useState('admin')
  const [setup, setSetup] = useState<{ qrCode: string; secret: string } | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [recovery, setRecovery] = useState<{ token: string; expiresAt: string } | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const enabled = Boolean(twoFa?.data.enabled)

  async function onChangePassword(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }
    if (!ADMIN_PASSWORD_RE.test(newPassword)) {
      setError(t('auth.passwordHint'))
      return
    }
    try {
      await changePassword({ currentPassword, newPassword }).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus(null)
      toast.show({ message: t('settings.passwordChanged') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.passwordChangeError')))
    }
  }

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      const result = await updateProfile({
        userName: userName.trim(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      }).unwrap()
      dispatch(setAdmin(result.data.admin as PublicAdmin))
      setStatus(null)
      toast.show({ message: t('settings.profileSaved') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.profileError')))
    }
  }

  async function onAddAdmin(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await addAdmin({ email: adminEmail.trim(), password: adminPassword, role: adminRole }).unwrap()
      setAdminEmail('')
      setAdminPassword('')
      setStatus(null)
      toast.show({ message: t('settings.adminCreated') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.adminCreateError')))
    }
  }

  async function onStartEnable() {
    setError(null)
    setStatus(null)
    try {
      const result = await enable2FA().unwrap()
      setSetup({ qrCode: result.data.qrCode, secret: result.data.secret })
      setBackupCodes([])
      setSetupCode('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.twoFactorSetupError')))
    }
  }

  async function onConfirmSetup(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await verifySetup({ token: setupCode.trim() }).unwrap()
      setBackupCodes(result.data.backupCodes)
      setSetup(null)
      setSetupCode('')
      toast.show({ message: t('settings.twoFactorEnabledToast') })
      await refetch()
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.twoFactorSetupError')))
    }
  }

  async function onDisable(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await disable2FA({ password: disablePassword, token: disableCode.trim() || undefined }).unwrap()
      setDisablePassword('')
      setDisableCode('')
      toast.show({ message: t('settings.twoFactorDisabledToast') })
      await refetch()
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.twoFactorDisableError')))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      {error ? <Alert variant="error" title={t('common.error')} description={error} /> : null}
      {status ? <Alert variant="success" title={status} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.avatar')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <AdminAvatar name={admin?.name} email={admin?.email} avatar={admin?.avatar} size="md" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('settings.avatarSubtitle')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.avatarHint')}</p>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploadingAvatar}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                setError(null)
                try {
                  const result = await uploadAvatar(file).unwrap()
                  dispatch(setAdmin(result.data.admin as PublicAdmin))
                  toast.show({ message: t('settings.avatarSaved') })
                } catch (err) {
                  setError(getApiErrorMessage(err, t('settings.avatarError')))
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            >
              {uploadingAvatar ? t('common.loading') : t('settings.avatarUpload')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t('settings.profileSubtitle')}</p>
          <form className="grid max-w-xl gap-3" onSubmit={(event) => void onSaveProfile(event)}>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('users.username')}</span>
              <Input value={userName} onChange={(event) => setUserName(event.target.value)} required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('settings.firstName')}</span>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>{t('settings.lastName')}</span>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('settings.phone')}</span>
              <Input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
            </label>
            <Button type="submit" variant="primary" disabled={savingProfile}>
              {savingProfile ? t('common.loading') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.changePassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t('settings.changePasswordSubtitle')}</p>
          <form className="grid max-w-xl gap-3" onSubmit={(event) => void onChangePassword(event)}>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('settings.currentPassword')}</span>
              <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('settings.newPassword')}</span>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              <span className="text-xs text-muted-foreground">{t('auth.passwordHint')}</span>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('settings.confirmPassword')}</span>
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </label>
            <Button type="submit" variant="primary" disabled={changingPassword}>
              {changingPassword ? t('common.loading') : t('settings.changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.addAdmin')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t('settings.addAdminSubtitle')}</p>
          <form className="grid max-w-xl gap-3" onSubmit={(event) => void onAddAdmin(event)}>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('common.email')}</span>
              <Input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('common.password')}</span>
              <Input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('common.role')}</span>
              <select
                className="h-10 rounded-md border border-border bg-background px-3"
                value={adminRole}
                onChange={(event) => setAdminRole(event.target.value)}
              >
                <option value="admin">admin</option>
                <option value="moderator">moderator</option>
                <option value="viewer">viewer</option>
                <option value="super_admin">super_admin</option>
              </select>
            </label>
            <Button type="submit" variant="primary" disabled={creatingAdmin}>
              {creatingAdmin ? t('common.loading') : t('settings.addAdmin')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.twoFactor')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('settings.twoFactorSubtitle')}</p>
          {twoFaLoading ? <Loading label={t('common.loading')} /> : null}
          {twoFaError ? <Alert variant="error" title={t('settings.twoFactorLoadError')} /> : null}

          {!setup && !enabled && !twoFaLoading ? (
            <div className="space-y-3">
              <p className="text-sm">{t('settings.twoFactorOff')}</p>
              <Button type="button" variant="primary" disabled={enabling} onClick={() => void onStartEnable()}>
                {enabling ? t('common.loading') : t('settings.twoFactorEnable')}
              </Button>
            </div>
          ) : null}

          {setup ? (
            <form className="max-w-lg space-y-3" onSubmit={(event) => void onConfirmSetup(event)}>
              <p className="text-sm">{t('settings.twoFactorScan')}</p>
              <img src={setup.qrCode} alt={t('settings.twoFactorQrAlt')} className="h-48 w-48 rounded-md border bg-white p-2" />
              <p className="break-all font-mono text-xs text-muted-foreground">
                {t('settings.twoFactorSecret')}: {setup.secret}
              </p>
              <Input value={setupCode} onChange={(event) => setSetupCode(event.target.value)} required />
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={verifying}>
                  {verifying ? t('common.loading') : t('settings.twoFactorConfirmSetup')}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          ) : null}

          {backupCodes.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">{t('settings.twoFactorBackupCodes')}</p>
              <p className="mb-2 text-xs text-muted-foreground">{t('settings.twoFactorBackupHint')}</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-xs sm:grid-cols-3">
                {backupCodes.map((code) => (
                  <li key={code} className="rounded bg-muted/60 px-2 py-1 text-center">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!setup && enabled ? (
            <div className="max-w-md space-y-4">
              <Alert variant="success" title={t('settings.twoFactorOn')} />
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t('settings.twoFactorEnabledAt')}</dt>
                  <dd>{twoFa?.data.enabledAt ? new Date(twoFa.data.enabledAt).toLocaleString() : '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t('settings.twoFactorLastUsed')}</dt>
                  <dd>{twoFa?.data.lastUsed ? new Date(twoFa.data.lastUsed).toLocaleString() : '—'}</dd>
                </div>
              </dl>
              <form className="space-y-3" onSubmit={(event) => void onDisable(event)}>
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('settings.twoFactorDisablePassword')}</span>
                  <Input type="password" value={disablePassword} onChange={(event) => setDisablePassword(event.target.value)} required />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t('settings.twoFactorDisableCode')}</span>
                  <Input value={disableCode} onChange={(event) => setDisableCode(event.target.value)} required />
                </label>
                <Button type="submit" variant="destructive" disabled={disabling}>
                  {disabling ? t('common.loading') : t('settings.twoFactorDisable')}
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={generatingBackup}
                  onClick={async () => {
                    try {
                      const result = await generateBackup().unwrap()
                      setBackupCodes(result.data.backupCodes)
                    } catch (err) {
                      setError(getApiErrorMessage(err, t('settings.twoFactorSetupError')))
                    }
                  }}
                >
                  {t('settings.generateBackup')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={generatingRecovery}
                  onClick={async () => {
                    try {
                      const result = await generateRecovery().unwrap()
                      setRecovery({ token: result.data.recoveryToken, expiresAt: String(result.data.expiresAt) })
                    } catch (err) {
                      setError(getApiErrorMessage(err, t('settings.twoFactorSetupError')))
                    }
                  }}
                >
                  {t('settings.generateRecovery')}
                </Button>
              </div>
              {recovery ? (
                <p className="break-all text-xs text-muted-foreground">
                  {t('settings.recoveryToken')}: {recovery.token} · {t('settings.recoveryExpires')}:{' '}
                  {new Date(recovery.expiresAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
