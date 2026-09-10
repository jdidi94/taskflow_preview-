import { useState } from 'react'
import { Button, Modal } from '@taskflow/ui'
import { Mail } from 'lucide-react'

import { useI18n } from '@/i18n'

const CONTACT_EMAIL = 'jdididdaoud1994@gmail.com'

/** Shown on every full page load of the main app (preview / recruiter notice). */
export function PreviewNoticeModal() {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title={t('preview.title')}
      description={t('preview.body')}
      closeOnOverlayClick
      closeOnEscape
    >
      <div className="mt-2 space-y-4">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <Mail className="h-4 w-4 shrink-0" aria-hidden />
          {CONTACT_EMAIL}
        </a>
        <p className="text-sm text-muted-foreground">{t('preview.contactHint')}</p>
        <div className="flex justify-end">
          <Button type="button" onClick={() => setOpen(false)}>
            {t('preview.dismiss')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
