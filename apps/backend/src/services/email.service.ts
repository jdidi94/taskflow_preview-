import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text?: string
}

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })

  return cachedTransporter
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.SMTP_ENABLED) {
    console.log(`[email disabled] ${input.subject} -> ${input.to}`)
    return
  }

  const from = env.SMTP_USER || 'no-reply@taskflow.local'
  const transporter = getTransporter()

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })
}

