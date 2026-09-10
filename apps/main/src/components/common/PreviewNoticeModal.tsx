import { useState } from 'react'
import { Button, Modal } from '@taskflow/ui'

import { BrandLogo } from '@/components/common/BrandLogo'
import { useI18n } from '@/i18n'

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
        <div className="flex justify-center py-2">
          <BrandLogo variant="wordmark" className="h-16 w-16 sm:h-20 sm:w-20" />
        </div>
        <p className="text-center text-sm text-muted-foreground">{t('preview.contactHint')}</p>
        <div className="flex justify-end">
          <Button type="button" onClick={() => setOpen(false)}>
            {t('preview.dismiss')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
