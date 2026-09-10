import { Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'

type BoardShortcutCheatsheetProps = {
  open: boolean
  onClose: () => void
}

export function BoardShortcutCheatsheet({ open, onClose }: BoardShortcutCheatsheetProps) {
  const { t } = useI18n()

  const rows = [
    { keys: 'N', label: t('board.shortcutN') },
    { keys: 'F', label: t('board.shortcutF') },
    { keys: 'Esc', label: t('board.shortcutEsc') },
    { keys: '?', label: t('board.shortcutHelp') },
    { keys: '↑ ↓ ← →', label: t('board.shortcutArrows') },
    { keys: 'Space + ↑↓←→', label: t('board.shortcutArrowsMove') },
    { keys: '⌘K / Ctrl+K', label: t('board.shortcutCommand') },
  ]

  return (
    <Modal isOpen={open} onClose={onClose} title={t('board.shortcutsTitle')} className="max-w-md">
      <ul className="mt-3 divide-y divide-border/60">
        {rows.map((row) => (
          <li key={row.keys} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <kbd className="shrink-0 rounded-md border border-border/70 bg-muted/50 px-2 py-0.5 font-mono text-xs">
              {row.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
