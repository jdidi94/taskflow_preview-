import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Button } from '@taskflow/ui'

import { useSocketConnectionState } from '@/hooks/useSocketConnectionState'
import { useI18n } from '@/i18n'
import { reduced, snappySpring } from '@/lib/motion'
import { reconnectAllSockets } from '@/lib/socket'

export function ConnectionBanner() {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const tone = useSocketConnectionState('/notifications')

  return (
    <AnimatePresence initial={false}>
      {tone === 'live' ? null : (
        <motion.div
          key={tone}
          role="status"
          aria-live="polite"
          className={`border-b px-4 py-2 sm:px-6 ${
            tone === 'offline'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border/60 bg-muted/80 text-foreground'
          }`}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={reduced(snappySpring, reduceMotion)}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-sm">
            <p>{tone === 'offline' ? t('connection.offline') : t('connection.reconnecting')}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => reconnectAllSockets()}>
              {t('connection.retry')}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
