import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Alert, Button, Input } from '@taskflow/ui'
import { X } from 'lucide-react'

import { TaskAttachmentsSection } from '@/components/board/TaskAttachmentsSection'
import { TaskChecklistField } from '@/components/board/TaskChecklistField'
import { TaskCommentsSection } from '@/components/board/TaskCommentsSection'
import {
  TASK_COLORS,
  dueDateFromInput,
  dueDateToInput,
  normalizeChecklist,
  taskAssigneeIds,
} from '@/components/board/taskHelpers'
import type { NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import { initials } from '@/components/workspace/normalizeMembers'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { reduced, softSpring } from '@/lib/motion'
import type { Task, TaskChecklistItem, TaskPriority } from '@/types/domain'

const DESKTOP_MQ = '(min-width: 768px)'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  )

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setIsDesktop(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isDesktop
}

export type TaskDetailValues = {
  title: string
  description?: string
  priority: TaskPriority
  color: string
  assignees: string[]
  tags: string[]
  dueDate: string | null
  checklist: TaskChecklistItem[]
}

type TaskDetailDrawerProps = {
  open: boolean
  mode: 'create' | 'edit'
  task?: Task | null
  boardId: string
  members: NormalizedWorkspaceMember[]
  saving?: boolean
  defaultDueDate?: string | null
  onClose: () => void
  onSubmit: (values: TaskDetailValues) => Promise<void>
  onDelete?: () => Promise<void>
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-foreground">{children}</span>
}

export function TaskDetailDrawer({
  open,
  mode,
  task,
  boardId,
  members,
  saving,
  defaultDueDate,
  onClose,
  onSubmit,
  onDelete,
}: TaskDetailDrawerProps) {
  const { t, isRTL } = useI18n()
  const isDesktop = useIsDesktop()
  const reduceMotion = useReducedMotion()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [color, setColor] = useState<string>(TASK_COLORS[0])
  const [assignees, setAssignees] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'medium')
    setColor(task?.color || TASK_COLORS[0])
    setAssignees(taskAssigneeIds(task))
    setTags([...(task?.tags ?? [])])
    setTagDraft('')
    setDueDate(dueDateToInput(task?.dueDate) || (mode === 'create' ? defaultDueDate ?? '' : ''))
    setChecklist(normalizeChecklist(task?.checklist))
    setFormError(null)
    setDeleting(false)
  }, [open, task, mode, defaultDueDate])

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    const id = window.requestAnimationFrame(() => {
      closeRef.current?.focus()
    })
    return () => {
      window.cancelAnimationFrame(id)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function toggleAssignee(id: string) {
    setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function addTag() {
    const next = tagDraft.trim()
    if (!next || tags.includes(next)) {
      setTagDraft('')
      return
    }
    setTags((prev) => [...prev, next].slice(0, 20))
    setTagDraft('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        color,
        assignees,
        tags,
        dueDate: dueDateFromInput(dueDate),
        checklist: checklist.filter((item) => item.text.trim()),
      })
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('board.saveError')))
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    setFormError(null)
    try {
      await onDelete()
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('board.deleteTaskError')))
      setDeleting(false)
    }
  }

  if (typeof document === 'undefined') return null

  const busy = Boolean(saving || deleting)
  const slideFromEnd = isRTL ? '-100%' : '100%'
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : isDesktop
      ? {
          initial: { x: slideFromEnd },
          animate: { x: 0 },
          exit: { x: slideFromEnd },
        }
      : {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%' },
        }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="task-detail-backdrop"
            type="button"
            className="fixed inset-0 z-50 bg-background/50 backdrop-blur-[1px] md:bg-background/35"
            aria-label={t('common.cancel')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced({ duration: 0.18 }, reduceMotion)}
          />
          <motion.aside
            key="task-detail-panel"
            className="fixed inset-x-0 bottom-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full flex-col rounded-t-2xl border border-border/80 border-b-0 bg-card shadow-xl md:inset-y-0 md:inset-x-auto md:bottom-auto md:end-0 md:h-full md:max-w-lg md:rounded-none md:border-0 md:border-s md:border-border"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
            initial={panelMotion.initial}
            animate={panelMotion.animate}
            exit={panelMotion.exit}
            transition={reduced(softSpring, reduceMotion)}
          >
            <div
              className="flex shrink-0 justify-center pb-1 pt-2.5 md:hidden"
              aria-hidden
            >
              <span className="h-1 w-10 rounded-full bg-muted-foreground/35" />
            </div>

            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-3 md:py-4">
              <div className="min-w-0">
                <h2 id="task-detail-title" className="font-display text-lg font-semibold">
                  {mode === 'edit' ? t('board.editTask') : t('board.createTask')}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {mode === 'edit' ? t('board.editTaskHint') : t('board.createTaskHint')}
                </p>
              </div>
              <Button
                ref={closeRef}
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={onClose}
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
                {formError ? (
                  <Alert variant="error" title={t('board.saveError')} description={formError} />
                ) : null}

                <label className="flex flex-col gap-1.5">
                  <FieldLabel>{t('board.taskTitle')}</FieldLabel>
                  <Input
                    required
                    minLength={1}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={busy}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <FieldLabel>{t('board.taskDescription')}</FieldLabel>
                  <textarea
                    className="tf-input min-h-24 resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={busy}
                    maxLength={2000}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>{t('board.priorityLabel')}</FieldLabel>
                    <select
                      className="tf-input"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TaskPriority)}
                      disabled={busy}
                    >
                      <option value="low">{t('board.priorityLow')}</option>
                      <option value="medium">{t('board.priorityMedium')}</option>
                      <option value="high">{t('board.priorityHigh')}</option>
                      <option value="critical">{t('board.priorityCritical')}</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <FieldLabel>{t('board.dueDate')}</FieldLabel>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel>{t('board.color')}</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {TASK_COLORS.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        disabled={busy}
                        onClick={() => setColor(swatch)}
                        className={`size-7 rounded-full border-2 transition ${
                          color === swatch ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: swatch }}
                        aria-label={swatch}
                        aria-pressed={color === swatch}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel>{t('board.assignees')}</FieldLabel>
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('board.assigneesEmpty')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => {
                        const selected = assignees.includes(member.id)
                        return (
                          <button
                            key={member.id}
                            type="button"
                            disabled={busy}
                            onClick={() => toggleAssignee(member.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                              selected
                                ? 'border-primary bg-primary/10 text-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                            }`}
                            aria-pressed={selected}
                          >
                            <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">
                              {initials(member.name || member.email || member.id)}
                            </span>
                            {member.name || member.email}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <FieldLabel>{t('board.tags')}</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        disabled={busy}
                        className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs"
                        onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
                        title={t('board.removeTag')}
                      >
                        {tag} ×
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder={t('board.tagPlaceholder')}
                      disabled={busy}
                      maxLength={50}
                    />
                    <Button type="button" variant="outline" disabled={busy} onClick={addTag}>
                      {t('board.addTag')}
                    </Button>
                  </div>
                </div>

                <TaskChecklistField value={checklist} onChange={setChecklist} disabled={busy} />

                {mode === 'edit' && task ? (
                  <>
                    <TaskAttachmentsSection task={task} boardId={boardId} disabled={busy} />
                    <TaskCommentsSection task={task} boardId={boardId} members={members} />
                  </>
                ) : null}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {mode === 'edit' && onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => void handleDelete()}
                  >
                    {deleting ? t('board.deleting') : t('common.delete')}
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={busy || !title.trim()}>
                    {saving ? t('board.saving') : t('common.save')}
                  </Button>
                </div>
              </footer>
            </form>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
