import { useState, type FormEvent } from 'react'
import { Alert, Button, Input } from '@taskflow/ui'
import { Mail, MapPin } from 'lucide-react'

import { useI18n } from '@/i18n'

export function ContactContent() {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setSending(false)
    setSent(true)
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <div className="pb-16 pt-4">
      <section className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('marketing.navContact')}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('marketing.contactHeadline')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('marketing.contactSubhead')}</p>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            {t('marketing.contactEmail')}
          </p>
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {t('marketing.contactLocation')}
          </p>
        </div>

        <form className="flex max-w-lg flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
          {sent ? <Alert variant="success" title={t('marketing.contactSent')} /> : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('common.name')}</span>
            <Input required value={name} onChange={(e) => setName(e.target.value)} disabled={sending} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('common.email')}</span>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('marketing.contactMessage')}</span>
            <textarea
              className="tf-input min-h-28 resize-y"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
            />
          </label>
          <Button type="submit" variant="primary" disabled={sending}>
            {sending ? t('marketing.contactSending') : t('common.send')}
          </Button>
        </form>
      </div>
    </div>
  )
}
