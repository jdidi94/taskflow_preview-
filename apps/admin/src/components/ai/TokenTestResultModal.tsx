import { Badge, Button, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { AiTokenTestResult } from '@/types/ai'

type TokenTestResultModalProps = {
  isOpen: boolean
  result: AiTokenTestResult | null
  onClose: () => void
}

export function TokenTestResultModal({ isOpen, result, onClose }: TokenTestResultModalProps) {
  const { t } = useI18n()
  const token = result?.token
  const passed = Boolean(result?.success)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('ai.testResultTitle')}>
      <div className="space-y-3 text-sm">
        <Badge variant={passed ? 'success' : 'error'}>{passed ? t('ai.testResultOk') : t('ai.testResultFail')}</Badge>
        {result?.message ? (
          <p>
            <span className="text-muted-foreground">{t('ai.testMessage')}: </span>
            {result.message}
          </p>
        ) : null}
        {token ? (
          <div className="space-y-2 rounded-lg border border-border/70 p-3">
            <p className="font-medium">{token.name}</p>
            <p className="font-mono text-xs">{token.maskedToken}</p>
            <p>
              <span className="text-muted-foreground">{t('ai.testStatus')}: </span>
              {token.status}
            </p>
            <p>
              <span className="text-muted-foreground">{t('ai.testValid')}: </span>
              {token.isValid ? t('common.yes') : t('common.no')}
            </p>
            {token.validationError ? (
              <p>
                <span className="text-muted-foreground">{t('ai.testValidationError')}: </span>
                {token.validationError}
              </p>
            ) : null}
            {token.lastValidatedAt ? (
              <p>
                <span className="text-muted-foreground">{t('ai.testLastValidated')}: </span>
                {new Date(token.lastValidatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
