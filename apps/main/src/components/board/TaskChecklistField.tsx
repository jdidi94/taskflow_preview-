import { Button, Input } from '@taskflow/ui'
import { Plus, Trash2 } from 'lucide-react'

import { useI18n } from '@/i18n'
import type { TaskChecklistItem } from '@/types/domain'

type TaskChecklistFieldProps = {
  value: TaskChecklistItem[]
  onChange: (next: TaskChecklistItem[]) => void
  disabled?: boolean
}

export function TaskChecklistField({ value, onChange, disabled }: TaskChecklistFieldProps) {
  const { t } = useI18n()
  const done = value.filter((item) => item.done).length

  function updateAt(index: number, patch: Partial<TaskChecklistItem>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function addItem() {
    onChange([...value, { text: '', done: false }])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t('board.checklist')}</span>
        {value.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {t('board.checklistProgress', { done: String(done), total: String(value.length) })}
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {value.map((item, index) => (
          <li key={item.id ?? `new-${index}`} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={item.done}
              disabled={disabled}
              onChange={(e) => updateAt(index, { done: e.target.checked })}
              aria-label={t('board.checklistToggle')}
            />
            <Input
              value={item.text}
              disabled={disabled}
              placeholder={t('board.checklistPlaceholder')}
              onChange={(e) => updateAt(index, { text: e.target.value })}
              maxLength={200}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              disabled={disabled}
              onClick={() => removeAt(index)}
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="outline" className="gap-1.5 self-start" disabled={disabled} onClick={addItem}>
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t('board.addChecklistItem')}
      </Button>
    </div>
  )
}
