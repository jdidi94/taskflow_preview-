import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Input, Loading } from '@taskflow/ui'
import {
  CheckSquare,
  FileText,
  Home,
  LayoutGrid,
  ListTodo,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  BarChart3,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useCommandPaletteIndex } from '@/hooks/useCommandPaletteIndex'
import { useRecentBoards } from '@/hooks/useRecentBoards'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'
import { taskBoardHref } from '@/lib/taskHref'
import { useListMyTasksQuery } from '@/services/tasksApi'

type PaletteGroup = 'action' | 'recent' | 'nav' | 'workspace' | 'space' | 'board' | 'task'

type PaletteItem = {
  id: string
  label: string
  hint?: string
  to?: string
  run?: () => void
  group: PaletteGroup
  icon: LucideIcon
}

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS: Array<{ to: string; labelKey: MessageKey; icon: LucideIcon }> = [
  { to: '/dashboard', labelKey: 'nav.home', icon: Home },
  { to: '/my-tasks', labelKey: 'nav.myTasks', icon: ListTodo },
  { to: '/templates', labelKey: 'nav.templates', icon: FileText },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/ai', labelKey: 'nav.ai', icon: Sparkles },
  { to: '/chat', labelKey: 'nav.chat', icon: MessageCircle },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

function matchesQuery(item: PaletteItem, query: string) {
  if (!query) return true
  const hay = `${item.label} ${item.hint ?? ''}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token))
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { boardId } = useParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const { workspaces, spaces, boards, loading } = useCommandPaletteIndex(open)
  const recents = useRecentBoards()
  const { data: myTasksData } = useListMyTasksQuery(undefined, { skip: !open })

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveIndex(0)
      return
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [open])

  const items = useMemo(() => {
    const q = query.trim()
    const navItems = [...NAV_ITEMS]

    function goBoard(path: string) {
      onClose()
      navigate(path)
    }

    const next: PaletteItem[] = [
      {
        id: 'action-ask-agent',
        label: t('command.askAgent'),
        hint: t('command.groupAction'),
        group: 'action',
        icon: Sparkles,
        run: () => {
          if (boardId) goBoard(`/boards/${boardId}?agent=1`)
          else if (recents[0]) goBoard(`/boards/${recents[0].id}?agent=1`)
          else goBoard('/ai')
        },
      },
      {
        id: 'action-new-task',
        label: t('command.newTask'),
        hint: t('command.groupAction'),
        group: 'action',
        icon: Plus,
        run: () => {
          if (boardId) goBoard(`/boards/${boardId}?new=1`)
          else if (recents[0]) goBoard(`/boards/${recents[0].id}?new=1`)
          else goBoard('/my-tasks')
        },
      },
      ...recents.map((board) => ({
        id: `recent-${board.id}`,
        label: board.name,
        hint: [board.workspaceName, board.spaceName].filter(Boolean).join(' · ') || t('command.groupRecent'),
        to: `/boards/${board.id}`,
        group: 'recent' as const,
        icon: LayoutGrid,
      })),
      ...navItems.map((item) => ({
        id: `nav-${item.to}`,
        label: t(item.labelKey),
        hint: t('command.groupNav'),
        to: item.to,
        group: 'nav' as const,
        icon: item.icon,
      })),
      ...workspaces.map((workspace) => ({
        id: `ws-${workspace.id}`,
        label: workspace.name,
        hint: t('command.groupWorkspace'),
        to: `/workspaces/${workspace.id}`,
        group: 'workspace' as const,
        icon: Users,
      })),
      ...spaces.map((space) => ({
        id: `sp-${space.id}`,
        label: space.name,
        hint: space.workspaceName,
        to: `/spaces/${space.id}`,
        group: 'space' as const,
        icon: LayoutGrid,
      })),
      ...boards.map((board) => ({
        id: `bd-${board.id}`,
        label: board.name,
        hint: [board.workspaceName, board.spaceName].filter(Boolean).join(' · '),
        to: `/boards/${board.id}`,
        group: 'board' as const,
        icon: LayoutGrid,
      })),
      ...(q
        ? (myTasksData?.data ?? []).slice(0, 40).map((task) => ({
            id: `task-${task.id}`,
            label: task.title,
            hint: [task.boardName, task.workspaceName].filter(Boolean).join(' · ') || t('command.groupTask'),
            to: taskBoardHref(String(task.board), task.id),
            group: 'task' as const,
            icon: CheckSquare,
          }))
        : []),
    ]

    return next.filter((item) => matchesQuery(item, q))
  }, [boardId, boards, myTasksData?.data, navigate, onClose, query, recents, spaces, t, workspaces])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, items.length])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function goTo(item: PaletteItem) {
    if (item.run) {
      item.run()
      return
    }
    if (!item.to) return
    onClose()
    navigate(item.to)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (items.length ? (index + 1) % items.length : 0))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (items.length ? (index - 1 + items.length) % items.length : 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const item = items[activeIndex]
      if (item) goTo(item)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  if (!open || typeof document === 'undefined') return null

  const groupLabels: Record<PaletteGroup, string> = {
    action: t('command.groupAction'),
    recent: t('command.groupRecent'),
    nav: t('command.groupNav'),
    workspace: t('command.groupWorkspace'),
    space: t('command.groupSpace'),
    board: t('command.groupBoard'),
    task: t('command.groupTask'),
  }

  let lastGroup: PaletteGroup | null = null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={t('command.title')}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('command.placeholder')}
            className="border-0 shadow-none focus-visible:ring-0"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
          />
          <kbd className="hidden rounded border border-border/70 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>

        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          className="max-h-[min(22rem,50vh)] overflow-y-auto p-2"
        >
          {loading && items.length <= NAV_ITEMS.length + 2 ? (
            <div className="px-2 py-6">
              <Loading label={t('common.loading')} />
            </div>
          ) : null}

          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('command.empty')}</p>
          ) : (
            items.map((item, index) => {
              const showGroup = item.group !== lastGroup
              lastGroup = item.group
              const Icon = item.icon
              const active = index === activeIndex
              return (
                <div key={item.id}>
                  {showGroup ? (
                    <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {groupLabels[item.group]}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-index={index}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-start text-sm transition ${
                      active ? 'bg-muted text-foreground' : 'text-foreground hover:bg-muted/60'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goTo(item)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {item.hint ? (
                      <span className="max-w-[40%] truncate text-xs text-muted-foreground">{item.hint}</span>
                    ) : null}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/70 px-3 py-2 text-[10px] text-muted-foreground">
          <span>{t('command.hintNav')}</span>
          <span>{t('command.hintOpen')}</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
