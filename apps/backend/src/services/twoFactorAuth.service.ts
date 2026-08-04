import crypto from 'node:crypto'
import QRCode from 'qrcode'
import speakeasy from 'speakeasy'

export const twoFactorAuthService = {
  async generateSecret(userEmail: string, appName = 'TaskFlow AI') {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: appName,
      length: 32,
    })

    const qrCode = await QRCode.toDataURL(secret.otpauth_url ?? '')

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url ?? '',
      qrCode,
    }
  },

  verifyToken(token: string, secret: string, window = 2) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window,
    })
  },

  generateBackupCodes(count = 10) {
    return Array.from({ length: count }, () => crypto.randomBytes(4).toString('hex').toUpperCase())
  },

  generateRecoveryToken() {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return { token, expiresAt }
  },

  generateDeviceToken(deviceId: string, userAgent: string) {
    return crypto.createHash('sha256').update(`${deviceId}:${userAgent}:${Date.now()}`).digest('hex')
  },
}

