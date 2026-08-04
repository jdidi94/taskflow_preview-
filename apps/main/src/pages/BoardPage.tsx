import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { Card, CardContent, Loading } from '@taskflow/ui'

import {
  AddColumnModal,
  BoardHeader,
  BoardSettingsPanel,
  BoardViewSwitcher,
  CalendarView,
  DeleteColumnModal,
  KanbanBoard,
  ListView,
  TaskDetailDrawer,
  TimelineView,
  ViewTransition,
  type BoardViewMode,
  type TaskDetailValues,
} from '@/components/board'
import { AiPlaceAgentPanel } from '@/components/ai/AiPlaceAgentPanel'
import { normalizeWorkspaceMembers } from '@/components/workspace/normalizeMembers'
import { useBoardSocket } from '@/hooks/useBoardSocket'
import { useWorkspaceSocket } from '@/hooks/useWorkspaceSocket'
import { useI18n } from '@/i18n'
import { useGetBoardQuery, useReorderColumnsMutation } from '@/services/boardsApi'
import { useGetSpaceQuery } from '@/services/spacesApi'
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useListByBoardQuery,
  useMoveTaskMutation,
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
  const [searchParams, setSearchParams] = useSearchParams()
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

  const { data: tasksData, isLoading: tasksLoading } = useListByBoardQuery(boardId, {
    skip: !boardId,
  })
  const [createTask, { isLoading: creating }] = useCreateTaskMutation()
  const [updateTask, { isLoading: updating }] = useUpdateTaskMutation()
  const [moveTask] = useMoveTaskMutation()
  const [deleteTask] = useDeleteTaskMutation()
  const [reorderColumns] = useReorderColumnsMutation()

  const [createColumnId, setCreateColumnId] = useState<string | null>(null)
  const [createDueDate, setCreateDueDate] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [deletingColumn, setDeletingColumn] = useState<BoardColumn | null>(null)
  const [viewMode, setViewMode] = useState<BoardViewMode>('kanban')

  const columns = useMemo(() => {
    return [...(board?.columns ?? [])].sort((a, b) => a.position - b.position)
  }, [board?.columns])

  const tasks = tasksData?.data ?? []

  useEffect(() => {
    const taskFromQuery = searchParams.get('task')
    if (!taskFromQuery || !tasks.length) return
    if (tasks.some((task) => task.id === taskFromQuery)) {
      setEditingTaskId(taskFromQuery)
      setCreateColumnId(null)
      setCreateDueDate(null)
    }
  }, [searchParams, tasks])

  const editingTask = useMemo(() => {
    if (!editingTaskId) return null
    return tasks.find((task) => task.id === editingTaskId) ?? null
  }, [editingTaskId, tasks])

  const tasksByColumn = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const column of columns) map.set(column.id, [])
    for (const task of tasks) {
      const key = columnIdOf(task)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position)
    }
    return map
  }, [columns, tasks])

  const deletingTaskCount = deletingColumn
    ? (tasksByColumn.get(deletingColumn.id)?.length ?? 0)
    : 0

  if (boardLoading || tasksLoading) {
    return <Loading label={t('common.loading')} />
  }

  if (!board) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{t('board.notFound')}</CardContent>
      </Card>
    )
  }

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
      setEditingTaskId(null)
      setCreateDueDate(null)
      return
    }
    if (createColumnId) {
      await createTask({
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
    }
  }

  function openEdit(task: Task) {
    setEditingTaskId(task.id)
    setCreateColumnId(null)
    setCreateDueDate(null)
  }

  function openCreate(columnId: string, dueDate?: string | null) {
    setCreateColumnId(columnId)
    setCreateDueDate(dueDate ?? null)
    setEditingTaskId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <BoardHeader
        board={board}
        workspaceId={workspaceId}
        workspaceName={workspaceData?.data?.name}
        spaceId={spaceId || undefined}
        spaceName={space?.name}
        onAddColumn={() => setAddColumnOpen(true)}
        onAskAgent={() => setAgentOpen(true)}
      />

      <AiPlaceAgentPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        place={{ type: 'board', id: board.id }}
        placeName={board.name}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BoardViewSwitcher value={viewMode} onChange={setViewMode} />
      </div>

      <ViewTransition contentKey={`${boardId}:${viewMode}`}>
        {viewMode === 'kanban' ? (
          <KanbanBoard
            columns={columns}
            tasksByColumn={tasksByColumn}
            members={members}
            onMoveTask={async ({ task, targetColumnId, position }) => {
              await moveTask({
                id: task.id,
                boardId,
                columnId: targetColumnId,
                position,
              }).unwrap()
            }}
            onReorderColumns={async (columnIds) => {
              await reorderColumns({ boardId, columnIds }).unwrap()
            }}
            onAddTask={(columnId) => {
              openCreate(columnId)
            }}
            onEditTask={openEdit}
            onDeleteTask={(task) => {
              void deleteTask({ id: task.id, boardId })
            }}
            onDeleteColumn={(column) => setDeletingColumn(column)}
          />
        ) : null}
        {viewMode === 'list' ? (
          <ListView
            columns={columns}
            tasksByColumn={tasksByColumn}
            onEditTask={openEdit}
          />
        ) : null}
        {viewMode === 'calendar' ? (
          <CalendarView
            tasks={tasks}
            onEditTask={openEdit}
            onCreateOnDate={
              columns[0]
                ? (dateKey) => openCreate(columns[0].id, dateKey)
                : undefined
            }
          />
        ) : null}
        {viewMode === 'timeline' ? (
          <TimelineView tasks={tasks} columns={columns} onEditTask={openEdit} />
        ) : null}
      </ViewTransition>

      {spaceId ? (
        <BoardSettingsPanel
          board={board}
          spaceId={spaceId}
          disabled={Boolean(board.archived) || board.isActive === false}
        />
      ) : null}

      <TaskDetailDrawer
        open={Boolean(createColumnId || editingTaskId)}
        mode={editingTask ? 'edit' : 'create'}
        task={editingTask}
        boardId={boardId}
        members={members}
        saving={creating || updating}
        defaultDueDate={createDueDate}
        onClose={() => {
          setCreateColumnId(null)
          setCreateDueDate(null)
          setEditingTaskId(null)
          if (searchParams.has('task')) {
            const next = new URLSearchParams(searchParams)
            next.delete('task')
            setSearchParams(next, { replace: true })
          }
        }}
        onSubmit={handleTaskSubmit}
        onDelete={
          editingTask
            ? async () => {
                await deleteTask({ id: editingTask.id, boardId }).unwrap()
                setEditingTaskId(null)
                if (searchParams.has('task')) {
                  const next = new URLSearchParams(searchParams)
                  next.delete('task')
                  setSearchParams(next, { replace: true })
                }
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
