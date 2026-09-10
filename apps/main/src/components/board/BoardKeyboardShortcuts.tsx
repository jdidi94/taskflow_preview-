import { useEffect } from 'react'

import { BoardShortcutCheatsheet } from '@/components/board/BoardShortcutCheatsheet'
import {
  focusBoardFilter,
  hasBlockingOverlay,
  isInsideDialog,
  isTypingTarget,
} from '@/components/board/boardKeyboard'

type BoardKeyboardShortcutsProps = {
  enabled: boolean
  canCreate: boolean
  supportsColumnNew: boolean
  quickAddOpen: boolean
  cheatsheetOpen: boolean
  onCheatsheetOpenChange: (open: boolean) => void
  onNewInFocusedColumn: () => void
  onCloseQuickAdd: () => void
}

export function BoardKeyboardShortcuts({
  enabled,
  canCreate,
  supportsColumnNew,
  quickAddOpen,
  cheatsheetOpen,
  onCheatsheetOpenChange,
  onNewInFocusedColumn,
  onCloseQuickAdd,
}: BoardKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target) && event.key !== 'Escape') return
      if (isInsideDialog(event.target) && event.key !== 'Escape') return

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        if (hasBlockingOverlay() && !cheatsheetOpen) return
        event.preventDefault()
        onCheatsheetOpenChange(!cheatsheetOpen)
        return
      }

      if (event.key === 'Escape') {
        if (cheatsheetOpen) {
          event.preventDefault()
          onCheatsheetOpenChange(false)
          return
        }
        if (quickAddOpen && !hasBlockingOverlay()) {
          event.preventDefault()
          onCloseQuickAdd()
        }
        return
      }

      if (hasBlockingOverlay() || isInsideDialog(event.target)) return

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        focusBoardFilter()
        return
      }

      if (event.key.toLowerCase() === 'n') {
        if (!canCreate || !supportsColumnNew) return
        event.preventDefault()
        onNewInFocusedColumn()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    canCreate,
    cheatsheetOpen,
    enabled,
    onCheatsheetOpenChange,
    onCloseQuickAdd,
    onNewInFocusedColumn,
    quickAddOpen,
    supportsColumnNew,
  ])

  return <BoardShortcutCheatsheet open={cheatsheetOpen} onClose={() => onCheatsheetOpenChange(false)} />
}
