import { useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge, Button } from '@taskflow/ui'

import { AvatarStack } from '@/components/common/AvatarStack'
import { DueChip } from '@/components/board/DueChip'
import { PriorityRail } from '@/components/board/PriorityRail'
import { PRIORITY_BADGE, PRIORITY_KEYS } from '@/components/board/priorityStyles'
import { assigneeId, assigneeLabel } from '@/components/board/taskHelpers'
import { type NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import { useI18n } from '@/i18n'
import type { Task, TaskUserRef } from '@/types/domain'

type TaskCardProps = {
  task: Task
  members?: NormalizedWorkspaceMember[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

function assigneeAvatar(value: string | TaskUserRef): string | null | undefined {
  if (typeof value === 'object' && value) return value.avatar
  return undefined
}

export function TaskCard({ task, members = [], onEdit, onDelete }: TaskCardProps) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const assignees = (task.assignees ?? [])
    .map((a) => {
      const id = assigneeId(a)
      const member = memberById.get(id)
      const name = member?.name || assigneeLabel(a) || id
      return {
        id,
        name,
        avatarUrl: member?.avatar ?? assigneeAvatar(a),
      }
    })
    .filter((a) => a.id)

  const checklist = task.checklist ?? []
  const checklistDone = checklist.filter((item) => item.done).length
  const tags = (task.tags ?? []).slice(0, 3)
  const priorityLabel = t(PRIORITY_KEYS[task.priority])
  const hasMeta = Boolean(task.dueDate) || checklist.length > 0 || tags.length > 0 || assignees.length > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative overflow-hidden rounded-lg border border-border/70 bg-card p-3 shadow-sm"
      {...attributes}
      {...listeners}
    >
      <PriorityRail priority={task.priority} />
      <div className="ps-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            {task.color ? (
              <span
                className="mt-1.5 size-2.5 shrink-0 rounded-full ring-1 ring-border/60"
                style={{ backgroundColor: task.color }}
                aria-hidden
              />
            ) : null}
            <p className="text-sm font-medium leading-snug">{task.title}</p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${PRIORITY_BADGE[task.priority]}`}
            aria-label={priorityLabel}
          >
            {priorityLabel}
          </Badge>
        </div>
        {task.description ? (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
        ) : null}

        {hasMeta ? (
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {task.dueDate ? <DueChip dueDate={task.dueDate} /> : null}
              {checklist.length > 0 ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {checklistDone}/{checklist.length}
                </Badge>
              ) : null}
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
            {assignees.length > 0 ? (
              <AvatarStack
                className="shrink-0"
                items={assignees}
                max={3}
                size="sm"
                label={t('board.assignees')}
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onEdit(task)
            }}
          >
            {t('board.edit')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(task)
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}
