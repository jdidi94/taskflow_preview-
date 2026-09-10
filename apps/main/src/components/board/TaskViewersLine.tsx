import { useBoardPresence } from '@/hooks/useBoardPresence'
import { useI18n } from '@/i18n'
import { useAppSelector } from '@/store/hooks'

type Props = {
  boardId?: string
  taskId?: string | null
}

export function TaskViewersLine({ boardId, taskId }: Props) {
  const { t } = useI18n()
  const selfId = useAppSelector((state) => state.auth.user?.id)
  const users = useBoardPresence(boardId)
  const viewers = users.filter((user) => user.viewingTaskId === taskId && user.id !== selfId)

  if (!taskId || viewers.length === 0) return null

  const first = viewers[0]
  const copy =
    viewers.length === 1
      ? t('board.viewerOne', { name: first.name })
      : t('board.viewerMany', { name: first.name, count: viewers.length - 1 })

  return <p className="mt-1 text-xs text-muted-foreground">{copy}</p>
}
