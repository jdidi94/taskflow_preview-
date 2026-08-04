import crypto from 'node:crypto'

import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email'
const PROFILE_SCOPE = 'https://www.googleapis.com/auth/userinfo.profile'

function encryptionKey() {
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest()
}

export type DriveListedFile = {
  id: string
  name: string
  mimeType: string
  size: number
  webViewLink: string | null
  iconLink: string | null
  thumbnailLink: string | null
  modifiedTime: string | null
}

export const googleDriveService = {
  isConfigured() {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
  },

  scopes() {
    return [DRIVE_SCOPE, EMAIL_SCOPE, PROFILE_SCOPE]
  },

  encryptToken(token: string) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
  },

  decryptToken(value: string | null | undefined) {
    if (!value) return null
    const [ivB64, tagB64, cipherB64] = value.split(':')
    if (!ivB64 || !tagB64 || !cipherB64) return null
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey(),
        Buffer.from(ivB64, 'base64'),
      )
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
      return Buffer.concat([
        decipher.update(Buffer.from(cipherB64, 'base64')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      return null
    }
  },

  buildAuthUrl(redirectUri: string, state?: string) {
    if (!this.isConfigured()) {
      throw new AppError('Google Drive is not configured (GOOGLE_CLIENT_ID / SECRET)', 503)
    }
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.scopes().join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    })
    if (state) params.set('state', state)
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  },

  async exchangeCodeForTokens(code: string, redirectUri: string) {
    if (!this.isConfigured()) {
      throw new AppError('Google Drive is not configured', 503)
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    const data = (await response.json()) as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
      error?: string
      error_description?: string
    }
    if (!response.ok || !data.access_token) {
      throw new AppError(data.error_description || data.error || 'Failed to link Google Drive', 400)
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in ?? 3600,
      scope: data.scope ?? '',
    }
  },

  async refreshAccessToken(refreshToken: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = (await response.json()) as {
      access_token?: string
      expires_in?: number
      error?: string
      error_description?: string
    }
    if (!response.ok || !data.access_token) {
      throw new AppError(data.error_description || data.error || 'Failed to refresh Drive token', 401)
    }
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? 3600,
    }
  },

  async getUserEmail(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { email?: string }
    return data.email ?? null
  },

  async getValidAccessToken(userId: string) {
    const user = await User.findById(userId).select('+googleDrive.accessToken +googleDrive.refreshToken')
    if (!user?.googleDrive?.linked) throw new AppError('Google Drive is not linked', 400)

    const accessToken = this.decryptToken(user.googleDrive.accessToken)
    const refreshToken = this.decryptToken(user.googleDrive.refreshToken)
    const expiry = user.googleDrive.expiryDate ? new Date(user.googleDrive.expiryDate).getTime() : 0
    const stillValid = accessToken && expiry > Date.now() + 60_000

    if (stillValid) return accessToken!

    if (!refreshToken) {
      user.googleDrive.tokenValid = false
      await user.save()
      throw new AppError('Google Drive token expired — reconnect Drive', 401)
    }

    const refreshed = await this.refreshAccessToken(refreshToken)
    user.googleDrive.accessToken = this.encryptToken(refreshed.accessToken)
    user.googleDrive.expiryDate = new Date(Date.now() + refreshed.expiresIn * 1000)
    user.googleDrive.tokenValid = true
    user.googleDrive.lastSync = new Date()
    await user.save()
    return refreshed.accessToken
  },

  async listFiles(accessToken: string, { pageToken, q }: { pageToken?: string; q?: string } = {}) {
    const params = new URLSearchParams({
      pageSize: '20',
      fields:
        'nextPageToken,files(id,name,mimeType,size,webViewLink,iconLink,thumbnailLink,modifiedTime)',
      q: q?.trim() || "trashed=false and mimeType != 'application/vnd.google-apps.folder'",
      orderBy: 'modifiedTime desc',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = (await response.json()) as {
      files?: Array<Record<string, unknown>>
      nextPageToken?: string
      error?: { message?: string }
    }
    if (!response.ok) {
      throw new AppError(data.error?.message || 'Failed to list Drive files', response.status)
    }

    const files: DriveListedFile[] = (data.files ?? []).map((file) => ({
      id: String(file.id ?? ''),
      name: String(file.name ?? 'Untitled'),
      mimeType: String(file.mimeType ?? 'application/octet-stream'),
      size: Number(file.size ?? 0),
      webViewLink: file.webViewLink ? String(file.webViewLink) : null,
      iconLink: file.iconLink ? String(file.iconLink) : null,
      thumbnailLink: file.thumbnailLink ? String(file.thumbnailLink) : null,
      modifiedTime: file.modifiedTime ? String(file.modifiedTime) : null,
    }))

    return { files, nextPageToken: data.nextPageToken ?? null }
  },

  async getFileMeta(accessToken: string, fileId: string): Promise<DriveListedFile> {
    const params = new URLSearchParams({
      fields: 'id,name,mimeType,size,webViewLink,iconLink,thumbnailLink,modifiedTime',
    })
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    const data = (await response.json()) as Record<string, unknown> & {
      error?: { message?: string }
    }
    if (!response.ok) {
      throw new AppError(data.error?.message || 'Drive file not found', response.status)
    }
    return {
      id: String(data.id ?? fileId),
      name: String(data.name ?? 'Untitled'),
      mimeType: String(data.mimeType ?? 'application/octet-stream'),
      size: Number(data.size ?? 0),
      webViewLink: data.webViewLink ? String(data.webViewLink) : null,
      iconLink: data.iconLink ? String(data.iconLink) : null,
      thumbnailLink: data.thumbnailLink ? String(data.thumbnailLink) : null,
      modifiedTime: data.modifiedTime ? String(data.modifiedTime) : null,
    }
  },
}
