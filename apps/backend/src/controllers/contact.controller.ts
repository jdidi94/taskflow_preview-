import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { env } from '../config/env.js'
import { sendEmail } from '../services/email.service.js'
import { AppError } from '../utils/AppError.js'

export const sendContact = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, message } = req.body as { name: string; email: string; message: string }
  const to = env.CONTACT_TO || env.SMTP_USER
  if (!to && env.SMTP_ENABLED) {
    throw new AppError('Contact inbox is not configured', 503)
  }

  await sendEmail({
    to: to || 'no-reply@taskflow.local',
    replyTo: email,
    subject: `TaskFlow contact from ${name}`,
    text: `${name} <${email}>\n\n${message}`,
    html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
  })

  res.json({ success: true })
})

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
