import { Link } from 'react-router'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { useI18n } from '@/i18n'

type Props = {
  kind: 'success' | 'cancel'
}

export function BillingResultCard({ kind }: Props) {
  const { t } = useI18n()
  const title = kind === 'success' ? t('billing.successTitle') : t('billing.cancelTitle')
  const body = kind === 'success' ? t('billing.successBody') : t('billing.cancelBody')

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/settings/upgrade">
              <Button variant="outline">{t('billing.title')}</Button>
            </Link>
            <Link to="/settings">
              <Button variant="primary">{t('billing.backSettings')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
