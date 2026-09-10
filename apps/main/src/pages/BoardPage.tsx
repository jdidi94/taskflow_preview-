import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { Alert, Button, Card, CardContent } from '@taskflow/ui'

import {
  AddColumnModal,
  BoardColumnsSkeleton,
  BoardFilterBar,
  BoardHeader,
  BoardKeyboardShortcuts,
  BoardPageSkeleton,
  BoardRefetchBar,
  BoardSettingsPanel,
  BoardViewSwitcher,
  CalendarView,
  DeleteColumnModal,
  KanbanBoard,
  ListView,
  TaskDetailDrawer,
  TimelineView,
  ViewTransition,
  filterBoardTasks,
  type BoardViewMode,
  type TaskDetailValues,
} from '@/components/board'
import { dueDateFromInput } from '@/components/board/taskHelpers'
import { AiPlaceAgentPanel } from '@/components/ai/AiPlaceAgentPanel'
import { normalizeWorkspaceMembers } from '@/components/workspace/normalizeMembers'
import { useBoardFilters } from '@/hooks/useBoardFilters'
import { useBoardInstantFeedback } from '@/hooks/useBoardInstantFeedback'
import { useBoardSocket } from '@/hooks/useBoardSocket'
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket'
import { useI18n } from '@/i18n'
import { touchRecentBoard } from '@/lib/recentBoards'
import { useAppSelector } from '@/store/hooks'
import { useGetBoardQuery, useReorderColumnsMutation } from '@/services/boardsApi'
import { useGetSpaceQuery } from '@/services/spacesApi'
import {
  useCreateTaskMutation,
  useListByBoardQuery,
  useUpdateTaskMutation,
} from '@/services/tasksApi'
import {
  useGetWorkspaceQuery,
  useListWorkspaceMembersQuery,
} from '@/services/workspacesApi'
import type { BoardColumn, Task } from '@/types/domain'

function columnIdOf(task: Task) {
  return String(task.column)
}

export function BoardPage() {
  const { t } = useI18n()
  const { boardId = '' } = useParams()
  const currentUserId = useAppSelector((state) => state.auth.user?.id)
  const { filters, setFilters, clearFilters, searchParams, setSearchParams } = useBoardFilters()
  useBoardSocket(boardId || undefined)

  const { data: boardData, isLoading: boardLoading } = useGetBoardQuery(boardId, { skip: !boardId })
  const board = boardData?.data
  const spaceId = board ? String(board.space) : ''
  const { data: spaceData } = useGetSpaceQuery(spaceId, { skip: !spaceId })
  const space = spaceData?.data
  const workspaceId = space ? String(space.workspace) : undefined
  useWorkspaceSocket(workspaceId)
  const { data: workspaceData } = useGetWorkspaceQuery(workspaceId ?? '', {
    skip: !workspaceId,
  })
  const { data: membersData } = useListWorkspaceMembersQuery(workspaceId ?? '', {
    skip: !workspaceId,
  })
  const members = useMemo(
    () => normalizeWorkspaceMembers(membersData?.data),
    [membersData?.data],
  )

  const { data: tasksData, isLoading: tasksLoading, isFetching: tasksFetching } = useListByBoardQuery(
    boardId,
    { skip: !boardId },
  )
  const [createTask, { isLoading: creating }] = useCreateTaskMutation()
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation()
  const [reorderColumns] = useReorderColumnsMutation()
  const { moveWithUndo, archiveWithUndo } = useBoardInstantFeedback(boardId)

  const [createColumnId, setCreateColumnId] = useState<string | null>(null)
  const [createDueDate, setCreateDueDate] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [deletingColumn, setDeletingColumn] = useState<BoardColumn | null>(null)
  const [viewMode, setViewMode] = useState<BoardViewMode>('kanban')
  const [focusedColumnId, setFocusedColumnId] = useState<string | null>(null)
  const [quickAddColumnId, setQuickAddColumnId] = useState<string | null>(null)
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)

  const columns = useMemo(() => {
    return [...(board?.columns ?? [])].sort((a, b) => a.position - b.position)
  }, [board?.columns])

  const tasks = tasksData?.data ?? []
  const taskFromQuery = searchParams.get('task')?.trim() || null

  const visibleTasks = useMemo(() => {
    const filtered = filterBoardTasks(tasks, filters, currentUserId)
    if (!taskFromQuery || filtered.some((task) => task.id === taskFromQuery)) return filtered
    const extra = tasks.find((task) => task.id === taskFromQuery)
    return extra ? [...filtered, extra] : filtered
  }, [tasks, filters, currentUserId, taskFromQuery])

  const syncTaskParam = useCallback(
    (taskId: string | null) => {
      const current = searchParams.get('task')
      if (taskId) {
        if (current === taskId) return
        const next = new URLSearchParams(searchParams)
        next.set('task', taskId)
        setSearchParams(next, { replace: true })
        return
      }
      if (!current) return
      const next = new URLSearchParams(searchParams)
      next.delete('task')
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    if (!taskFromQuery) return
    if (tasksLoading || !tasksData) return
    if (tasks.some((task) => task.id === taskFromQuery)) {
      setEditingTaskId(taskFromQuery)
      setCreateColumnId(null)
      setCreateDueDate(null)
      return
    }
    if (tasksFetching) return
    setEditingTaskId(null)
  }, [taskFromQuery, tasks, tasksLoading, tasksFetching, tasksData])

  useEffect(() => {
    if (!board?.id || !board.name) return
    touchRecentBoard({
      id: board.id,
      name: board.name,
      spaceId: spaceId || undefined,
      spaceName: space?.name,
      workspaceId,
      workspaceName: workspaceData?.data?.name,
    })
  }, [board?.id, board?.name, space?.name, spaceId, workspaceData?.data?.name, workspaceId])

  useEffect(() => {
    if (!board) return
    const wantAgent = searchParams.get('agent') === '1'
    const wantNew = searchParams.get('new') === '1'
    if (!wantAgent && !wantNew) return
    const next = new URLSearchParams(searchParams)
    if (wantAgent) {
      setAgentOpen(true)
      next.delete('agent')
    }
    if (wantNew) {
      const columnId =
        (focusedColumnId && columns.some((column) => column.id === focusedColumnId)
          ? focusedColumnId
          : columns[0]?.id) ?? null
      if (columnId) {
        setQuickAddColumnId(null)
        setCreateColumnId(columnId)
        setCreateDueDate(null)
        setEditingTaskId(null)
        next.delete('task')
      }
      next.delete('new')
    }
    setSearchParams(next, { replace: true })
  }, [board, columns, focusedColumnId, searchParams, setSearchParams])

  const deepLinkMissing =
    Boolean(taskFromQuery) &&
    !tasksLoading &&
    !tasksFetching &&
    Boolean(tasksData) &&
    !tasks.some((task) => task.id === taskFromQuery)

  const editingTask = useMemo(() => {
    if (!editingTaskId) return null
    return tasks.find((task) => task.id === editingTaskId) ?? null
  }, [editingTaskId, tasks])

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const column of columns) map.set(column.id, [])
    for (const task of visibleTasks) {
      const key = columnIdOf(task)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position)
    }
    return map
  }, [columns, visibleTasks])

  const deletingTaskCount = deletingColumn
    ? tasks.filter((task) => columnIdOf(task) === deletingColumn.id).length
    : 0

  const boardLocked = Boolean(board?.archived) || board?.isActive === false
  const supportsColumnNew = viewMode === 'kanban' || viewMode === 'list'

  useEffect(() => {
    if (!columns.length) {
      setFocusedColumnId(null)
      return
    }
    if (focusedColumnId && columns.some((column) => column.id === focusedColumnId)) return
    setFocusedColumnId(columns[0].id)
  }, [columns, focusedColumnId])

  const handleNewInFocusedColumn = useCallback(() => {
    if (boardLocked) return
    const columnId = focusedColumnId ?? columns[0]?.id ?? null
    if (!columnId) return
    setFocusedColumnId(columnId)
    setQuickAddColumnId(columnId)
  }, [boardLocked, columns, focusedColumnId])

  const handleCloseQuickAdd = useCallback(() => {
    setQuickAddColumnId(null)
  }, [])

  if (boardLoading && !board) {
    return <BoardPageSkeleton />
  }

  if (!board) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{t('board.notFound')}</CardContent>
      </Card>
    )
  }

  const tasksRefetching = tasksFetching && Boolean(tasksData)

  async function handleTaskSubmit(values: TaskDetailValues) {
    if (editingTask) {
      await updateTask({
        id: editingTask.id,
        boardId,
        title: values.title,
        description: values.description,
        priority: values.priority,
        color: values.color,
        assignees: values.assignees,
        tags: values.tags,
        dueDate: values.dueDate,
        checklist: values.checklist,
      }).unwrap()
      return
    }
    if (createColumnId) {
      const created = await createTask({
        boardId,
        columnId: createColumnId,
        title: values.title,
        description: values.description,
        priority: values.priority,
        color: values.color,
        assignees: values.assignees,
        tags: values.tags,
        dueDate: values.dueDate,
        checklist: values.checklist,
      }).unwrap()
      setCreateColumnId(null)
      setCreateDueDate(null)
      const createdId = created.data?.id
      if (createdId) {
        setEditingTaskId(createdId)
        syncTaskParam(createdId)
      }
    }
  }

  function openEdit(task: Task) {
    setQuickAddColumnId(null)
    setEditingTaskId(task.id)
    setCreateColumnId(null)
    setCreateDueDate(null)
    setAgentOpen(false)
    syncTaskParam(task.id)
  }

  function openCreate(columnId: string, dueDate?: string | null) {
    setQuickAddColumnId(null)
    setCreateColumnId(columnId)
    setCreateDueDate(dueDate ?? null)
    setEditingTaskId(null)
    setAgentOpen(false)
    syncTaskParam(null)
  }

  function closeDrawer() {
    setCreateColumnId(null)
    setCreateDueDate(null)
    setEditingTaskId(null)
    syncTaskParam(null)
  }

  function openAgent() {
    setAgentOpen(true)
  }

  function closeAgent() {
    setAgentOpen(false)
  }

  function switchToEditFromAgent() {
    if (!editingTaskId && !createColumnId) return
    setAgentOpen(false)
  }

  async function quickAdd(columnId: string, title: string, dueDateKey?: string | null) {
    await createTask({
      boardId,
      columnId,
      title: title.trim(),
      dueDate: dueDateKey ? dueDateFromInput(dueDateKey) : undefined,
    }).unwrap()
  }

  return (
    <div
      className={`flex flex-col gap-6 transition-[padding] duration-200 ${
        agentOpen ? 'md:pe-[min(28rem,42vw)]' : ''
      }`}
    >
      <BoardKeyboardShortcuts
        enabled
        canCreate={!boardLocked}
        supportsColumnNew={supportsColumnNew}
        quickAddOpen={Boolean(quickAddColumnId)}
        cheatsheetOpen={cheatsheetOpen}
        onCheatsheetOpenChange={setCheatsheetOpen}
        onNewInFocusedColumn={handleNewInFocusedColumn}
        onCloseQuickAdd={handleCloseQuickAdd}
      />
      <BoardHeader
        board={board}
        workspaceId={workspaceId}
        workspaceName={workspaceData?.data?.name}
        spaceId={spaceId || undefined}
        spaceName={space?.name}
        onAddColumn={() => setAddColumnOpen(true)}
        onAskAgent={openAgent}
      />

      <AiPlaceAgentPanel
        open={agentOpen}
        onClose={closeAgent}
        place={{ type: 'board', id: board.id }}
        placeName={board.name}
        canSwitchToEdit={Boolean(editingTaskId || createColumnId)}
        onSwitchToEdit={switchToEditFromAgent}
        onOpenTask={(taskId) => {
          setAgentOpen(false)
          setEditingTaskId(taskId)
          setCreateColumnId(null)
          setCreateDueDate(null)
          syncTaskParam(taskId)
        }}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <BoardViewSwitcher
          value={viewMode}
          onChange={(mode) => {
            setViewMode(mode)
            setQuickAddColumnId(null)
          }}
        />
        <BoardFilterBar
          filters={filters}
          members={members}
          matchCount={visibleTasks.length}
          totalCount={tasks.length}
          onChange={setFilters}
          onClear={clearFilters}
          onOpenShortcuts={() => setCheatsheetOpen(true)}
        />
      </div>

      {deepLinkMissing ? (
        <Alert variant="warning" title={t('board.taskNotFound')}>
          <Button type="button" size="sm" variant="outline" onClick={() => syncTaskParam(null)}>
            {t('board.taskNotFoundDismiss')}
          </Button>
        </Alert>
      ) : null}

      <BoardRefetchBar active={tasksRefetching} />

      {tasksLoading && !tasksData ? (
        <BoardColumnsSkeleton />
      ) : (
      <div aria-busy={tasksRefetching || undefined}>
      <ViewTransition contentKey={`${boardId}:${viewMode}`}>
        {viewMode === 'kanban' ? (
          <KanbanBoard
            columns={columns}
            tasksByColumn={tasksByColumn}
            members={members}
            onMoveTask={({ task, targetColumnId, position }) =>
              moveWithUndo(task, targetColumnId, position)
            }
            onReorderColumns={async (columnIds) => {
              await reorderColumns({ boardId, columnIds }).unwrap()
            }}
            onQuickAdd={(columnId, title) => quickAdd(columnId, title)}
            onAddTaskMore={(columnId) => openCreate(columnId)}
            onEditTask={openEdit}
            highlightedTaskId={taskFromQuery}
            onDeleteTask={(task) => {
              void archiveWithUndo(task)
            }}
            onDeleteColumn={(column) => setDeletingColumn(column)}
            focusedColumnId={focusedColumnId}
            onFocusColumn={setFocusedColumnId}
            quickAddColumnId={quickAddColumnId}
            onQuickAddColumnChange={setQuickAddColumnId}
            disabled={boardLocked}
          />
        ) : null}
        {viewMode === 'list' ? (
          <ListView
            columns={columns}
            tasksByColumn={tasksByColumn}
            onEditTask={openEdit}
            highlightedTaskId={taskFromQuery}
            onQuickAdd={(columnId, title) => quickAdd(columnId, title)}
            onAddTaskMore={(columnId) => openCreate(columnId)}
            focusedColumnId={focusedColumnId}
            onFocusColumn={setFocusedColumnId}
            quickAddColumnId={quickAddColumnId}
            onQuickAddColumnChange={setQuickAddColumnId}
            disabled={boardLocked}
          />
        ) : null}
        {viewMode === 'calendar' ? (
          <CalendarView
            tasks={visibleTasks}
            onEditTask={openEdit}
            highlightedTaskId={taskFromQuery}
            disabled={boardLocked}
            onQuickCreateOnDate={
              columns[0] ? (dateKey, title) => quickAdd(columns[0].id, title, dateKey) : undefined
            }
            onCreateOnDate={columns[0] ? (dateKey) => openCreate(columns[0].id, dateKey) : undefined}
          />
        ) : null}
        {viewMode === 'timeline' ? (
          <TimelineView
            tasks={visibleTasks}
            columns={columns}
            onEditTask={openEdit}
            highlightedTaskId={taskFromQuery}
          />
        ) : null}
      </ViewTransition>
      </div>
      )}

      {spaceId ? (
        <BoardSettingsPanel
          board={board}
          spaceId={spaceId}
          disabled={Boolean(board.archived) || board.isActive === false}
        />
      ) : null}

      <TaskDetailDrawer
        open={Boolean(createColumnId || editingTask) && !agentOpen}
        mode={editingTask ? 'edit' : 'create'}
        task={editingTask}
        boardId={boardId}
        members={members}
        saving={creating || updating}
        defaultDueDate={createDueDate}
        onClose={closeDrawer}
        onSubmit={handleTaskSubmit}
        boardTasks={tasks}
        onOpenTask={openEdit}
        onOpenAi={openAgent}
        onDelete={
          editingTask
            ? async () => {
                await archiveWithUndo(editingTask)
                closeDrawer()
              }
            : undefined
        }
      />

      <AddColumnModal
        open={addColumnOpen}
        boardId={boardId}
        onClose={() => setAddColumnOpen(false)}
      />

      <DeleteColumnModal
        open={Boolean(deletingColumn)}
        boardId={boardId}
        column={deletingColumn}
        taskCount={deletingTaskCount}
        onClose={() => setDeletingColumn(null)}
      />
    </div>
  )
}
