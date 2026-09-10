import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Input, Modal } from '@taskflow/ui'
import { Plus, Trash2 } from 'lucide-react'

import { useI18n } from '@/i18n'
import {
  boardFromPreset,
  emptyBoardContent,
  LIST_COLORS,
  newTemplateId,
  parseTemplateContent,
  serializeTemplateContent,
  type TemplateBoardContent,
  type TemplateCardDraft,
  type TemplateCardPriority,
} from '@/lib/templateContent'
import type { AdminTemplate } from '@/types/templates'

const CATEGORIES = ['General', 'Marketing', 'Development', 'IT', 'Design', 'Operations', 'Support', 'Business'] as const

type TemplateFormProps = {
  isOpen: boolean
  template: AdminTemplate | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSave: (input: {
    name: string
    description: string
    category: string
    isPublic: boolean
    content: Record<string, unknown>
  }) => Promise<void>
}

export function TemplateForm({ isOpen, template, busy, error, onClose, onSave }: TemplateFormProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('General')
  const [isPublic, setIsPublic] = useState(false)
  const [board, setBoard] = useState<TemplateBoardContent>(() => emptyBoardContent())
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLocalError(null)
    if (template) {
      setName(template.name)
      setDescription(template.description ?? '')
      setCategory(template.category || 'General')
      setIsPublic(Boolean(template.isPublic))
      setBoard(parseTemplateContent(template.content))
      return
    }
    setName('')
    setDescription('')
    setCategory('General')
    setIsPublic(false)
    setBoard(emptyBoardContent())
  }, [isOpen, template])

  function updateList(index: number, patch: Partial<TemplateBoardContent['lists'][number]>) {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list, i) => (i === index ? { ...list, ...patch } : list)),
    }))
  }

  function addList() {
    setBoard((prev) => ({
      ...prev,
      lists: [
        ...prev.lists,
        {
          id: newTemplateId(),
          title: '',
          order: prev.lists.length,
          color: LIST_COLORS[prev.lists.length % LIST_COLORS.length],
        },
      ],
    }))
  }

  function removeList(index: number) {
    setBoard((prev) => {
      const removed = prev.lists[index]
      const lists = prev.lists.filter((_, i) => i !== index).map((list, order) => ({ ...list, order }))
      return {
        lists,
        cards: prev.cards.filter((card) => card.listId !== removed.id),
      }
    })
  }

  function addCard() {
    setBoard((prev) => {
      if (prev.lists.length === 0) return prev
      const listId = prev.lists[0].id
      const card: TemplateCardDraft = {
        id: newTemplateId(),
        title: '',
        description: '',
        listId,
        order: prev.cards.filter((item) => item.listId === listId).length,
        priority: 'medium',
        estimatedHours: 0,
        tags: [],
      }
      return { ...prev, cards: [...prev.cards, card] }
    })
  }

  function updateCard(index: number, patch: Partial<TemplateCardDraft>) {
    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
    }))
  }

  function removeCard(index: number) {
    setBoard((prev) => ({ ...prev, cards: prev.cards.filter((_, i) => i !== index) }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    const lists = board.lists.map((list) => ({ ...list, title: list.title.trim() })).filter((list) => list.title)
    if (!trimmedName) {
      setLocalError(t('templates.nameRequired'))
      return
    }
    if (lists.length === 0) {
      setLocalError(t('templates.listRequired'))
      return
    }
    setLocalError(null)
    await onSave({
      name: trimmedName,
      description: description.trim(),
      category,
      isPublic,
      content: serializeTemplateContent({ ...board, lists }),
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : onClose}
      title={template ? t('templates.edit') : t('templates.create')}
      className="max-w-4xl!"
    >
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        {error || localError ? <Alert variant="error" title={localError ?? error ?? ''} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('templates.name')}</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('templates.category')}</span>
            <select
              className="h-10 rounded-md border border-border bg-background px-3"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>{t('templates.description')}</span>
          <textarea
            className="min-h-20 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          {t('templates.public')}
        </label>

        {!template ? (
          <div>
            <p className="mb-2 text-sm font-medium">{t('templates.quickStart')}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                variant="outline"
                className="h-auto flex-col items-start gap-1 py-3 text-start"
                onClick={() =>
                  setBoard(
                    boardFromPreset([
                      { title: 'Todo', color: LIST_COLORS[0] },
                      { title: 'Doing', color: LIST_COLORS[1] },
                      { title: 'Done', color: LIST_COLORS[2] },
                    ]),
                  )
                }
              >
                <span className="font-medium">{t('templates.presetKanban')}</span>
                <span className="text-xs text-muted-foreground">{t('templates.presetKanbanHint')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto flex-col items-start gap-1 py-3 text-start"
                onClick={() =>
                  setBoard(
                    boardFromPreset([
                      { title: 'Backlog', color: LIST_COLORS[9] },
                      { title: 'Sprint Planning', color: LIST_COLORS[0] },
                      { title: 'In Progress', color: LIST_COLORS[2] },
                      { title: 'Testing', color: LIST_COLORS[4] },
                      { title: 'Done', color: LIST_COLORS[1] },
                    ]),
                  )
                }
              >
                <span className="font-medium">{t('templates.presetSprint')}</span>
                <span className="text-xs text-muted-foreground">{t('templates.presetSprintHint')}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto flex-col items-start gap-1 py-3 text-start"
                onClick={() =>
                  setBoard(
                    boardFromPreset([
                      { title: 'New Issues', color: LIST_COLORS[3] },
                      { title: 'Investigating', color: LIST_COLORS[2] },
                      { title: 'In Progress', color: LIST_COLORS[0] },
                      { title: 'Testing Fix', color: LIST_COLORS[4] },
                      { title: 'Resolved', color: LIST_COLORS[1] },
                    ]),
                  )
                }
              >
                <span className="font-medium">{t('templates.presetBugs')}</span>
                <span className="text-xs text-muted-foreground">{t('templates.presetBugsHint')}</span>
              </Button>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t('templates.lists')}</p>
            <Button type="button" size="sm" variant="outline" onClick={addList} disabled={board.lists.length >= 20}>
              <Plus className="me-1 h-4 w-4" />
              {t('templates.addList')}
            </Button>
          </div>
          <div className="space-y-2">
            {board.lists.map((list, index) => (
              <div key={list.id} className="flex items-center gap-2 rounded-lg border border-border/70 p-2">
                <span className="w-6 text-center text-xs text-muted-foreground">{index + 1}</span>
                <Input
                  value={list.title}
                  onChange={(event) => updateList(index, { title: event.target.value })}
                  placeholder={t('templates.listTitle')}
                  className="flex-1"
                />
                <input
                  type="color"
                  aria-label={t('templates.listTitle')}
                  className="h-10 w-12 cursor-pointer rounded border border-border bg-background"
                  value={list.color}
                  onChange={(event) => updateList(index, { color: event.target.value })}
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeList(index)} disabled={board.lists.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{t('templates.cards')}</p>
            <Button type="button" size="sm" variant="outline" onClick={addCard} disabled={board.lists.length === 0}>
              <Plus className="me-1 h-4 w-4" />
              {t('templates.addCard')}
            </Button>
          </div>
          <div className="space-y-3">
            {board.cards.map((card, index) => (
              <div key={card.id} className="space-y-2 rounded-lg border border-border/70 p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={card.title}
                    onChange={(event) => updateCard(index, { title: event.target.value })}
                    placeholder={t('templates.cardTitle')}
                  />
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={card.listId}
                    onChange={(event) => updateCard(index, { listId: event.target.value })}
                  >
                    {board.lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.title || t('templates.listTitle')}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="min-h-16 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={card.description}
                  onChange={(event) => updateCard(index, { description: event.target.value })}
                  placeholder={t('templates.cardDescription')}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                    value={card.priority}
                    onChange={(event) => updateCard(index, { priority: event.target.value as TemplateCardPriority })}
                  >
                    <option value="low">{t('templates.priorityLow')}</option>
                    <option value="medium">{t('templates.priorityMedium')}</option>
                    <option value="high">{t('templates.priorityHigh')}</option>
                    <option value="urgent">{t('templates.priorityUrgent')}</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    className="w-28"
                    value={card.estimatedHours}
                    onChange={(event) => updateCard(index, { estimatedHours: Number(event.target.value) || 0 })}
                    placeholder={t('templates.estimatedHours')}
                  />
                  <Badge variant="secondary">{t('templates.priority')}</Badge>
                  <Button type="button" size="sm" variant="ghost" className="ms-auto" onClick={() => removeCard(index)}>
                    <Trash2 className="me-1 h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
