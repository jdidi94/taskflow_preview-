import { useState } from 'react'
import { Alert, Button, Input } from '@taskflow/ui'

import {
  initials,
  type NormalizedWorkspaceMember,
} from '@/components/workspace/normalizeMembers'
import { assigneeId, assigneeLabel } from '@/components/board/taskHelpers'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAppSelector } from '@/store/hooks'
import {
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetTaskQuery,
  useUpdateCommentMutation,
} from '@/services/tasksApi'
import type { Task, TaskComment } from '@/types/domain'

type TaskCommentsSectionProps = {
  task: Task
  boardId: string
  members: NormalizedWorkspaceMember[]
}

function authorMeta(
  comment: TaskComment,
  members: NormalizedWorkspaceMember[],
  currentUserId: string | undefined,
  t: (key: 'board.commentYou') => string,
) {
  const id = assigneeId(comment.author)
  const member = members.find((m) => m.id === id)
  const label =
    member?.name ||
    assigneeLabel(comment.author) ||
    (id === currentUserId ? t('board.commentYou') : id) ||
    '?'
  return { id, label, isMine: Boolean(currentUserId && id === currentUserId) }
}

export function TaskCommentsSection({ task, boardId, members }: TaskCommentsSectionProps) {
  const { t } = useI18n()
  const user = useAppSelector((state) => state.auth.user)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Board list omits comment threads — load full task when the drawer is open. */
  const { data: fullTask } = useGetTaskQuery(task.id, { skip: !task.id })
  const hydrated = fullTask?.data ?? task

  const [addComment, { isLoading: adding }] = useAddCommentMutation()
  const [updateComment, { isLoading: updating }] = useUpdateCommentMutation()
  const [deleteComment, { isLoading: removing }] = useDeleteCommentMutation()

  const comments = [...(hydrated.comments ?? [])].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return ta - tb
  })

  async function handleAdd() {
    const body = draft.trim()
    if (!body) return
    setError(null)
    try {
      await addComment({ taskId: task.id, boardId, body }).unwrap()
      setDraft('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.commentError')))
    }
  }

  async function handleUpdate(commentId: string) {
    const body = editBody.trim()
    if (!body) return
    setError(null)
    try {
      await updateComment({ taskId: task.id, boardId, commentId, body }).unwrap()
      setEditingId(null)
      setEditBody('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.commentError')))
    }
  }

  async function handleDelete(commentId: string) {
    setError(null)
    try {
      await deleteComment({ taskId: task.id, boardId, commentId }).unwrap()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.commentError')))
    }
  }

  const busy = adding || updating || removing

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">{t('board.comments')}</h3>
      {error ? <Alert variant="error" title={t('board.commentError')} description={error} /> : null}

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('board.commentsEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const meta = authorMeta(comment, members, user?.id, t)
            const editing = editingId === comment.id
            return (
              <li key={comment.id} className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">
                    {initials(meta.label)}
                  </span>
                  <span className="text-xs font-medium">{meta.label}</span>
                  {comment.createdAt ? (
                    <span className="ms-auto text-[10px] text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <textarea
                      className="tf-input min-h-16 resize-y text-sm"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      disabled={busy}
                      maxLength={5000}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={busy || !editBody.trim()}
                        onClick={() => void handleUpdate(comment.id)}
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null)
                          setEditBody('')
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-sm">{comment.body}</p>
                    {meta.isMine ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(comment.id)
                            setEditBody(comment.body)
                          }}
                        >
                          {t('board.edit')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => void handleDelete(comment.id)}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('board.commentPlaceholder')}
          disabled={busy}
          maxLength={5000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleAdd()
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-end"
          disabled={busy || !draft.trim()}
          onClick={() => void handleAdd()}
        >
          {adding ? t('board.commentSending') : t('board.addComment')}
        </Button>
      </div>
    </section>
  )
}
