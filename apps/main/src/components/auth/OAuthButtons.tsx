import { motion } from 'framer-motion'
import { Button } from '@taskflow/ui'

import { useI18n } from '@/i18n'

function startOAuth(provider: 'google' | 'github') {
  window.location.assign(`/api/auth/${provider}`)
}

const tapMotion = {
  whileTap: { scale: 0.97 },
  transition: { type: 'spring' as const, stiffness: 520, damping: 28 },
}

const focusClassName =
  'w-full transition-[box-shadow,border-color] duration-150 ease-out hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function OAuthButtons() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-2">
      <div className="relative my-1 text-center text-xs text-muted-foreground">
        <span className="bg-card px-2">{t('oauth.orContinue')}</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border/70" />
      </div>
      <motion.div {...tapMotion}>
        <Button
          type="button"
          variant="outline"
          className={focusClassName}
          onClick={() => startOAuth('google')}
        >
          {t('oauth.continueGoogle')}
        </Button>
      </motion.div>
      <motion.div {...tapMotion}>
        <Button
          type="button"
          variant="outline"
          className={focusClassName}
          onClick={() => startOAuth('github')}
        >
          {t('oauth.continueGithub')}
        </Button>
      </motion.div>
    </div>
  )
}
