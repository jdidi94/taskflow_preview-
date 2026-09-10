import type { Board } from '@/types/domain'

type Translate = (key: 'onboarding.sampleSpaceName' | 'onboarding.sampleBoardName' | 'onboarding.sampleBoardDescription' | 'onboarding.sampleTaskWelcome' | 'onboarding.sampleTaskInvite' | 'onboarding.sampleTaskMove', vars?: Record<string, string | number>) => string

type Deps = {
  workspaceId: string
  spaceId?: string
  t: Translate
  createSpace: (body: {
    workspaceId: string
    name: string
    description?: string
  }) => { unwrap: () => Promise<{ data: { id: string } }> }
  createBoard: (body: {
    spaceId: string
    name: string
    description?: string
  }) => { unwrap: () => Promise<{ data: Board }> }
  createTask: (body: {
    boardId: string
    columnId: string
    title: string
    description?: string
  }) => { unwrap: () => Promise<unknown> }
}

export async function seedSampleBoard({
  workspaceId,
  spaceId,
  t,
  createSpace,
  createBoard,
  createTask,
}: Deps): Promise<string> {
  const resolvedSpaceId =
    spaceId ||
    (
      await createSpace({
        workspaceId,
        name: t('onboarding.sampleSpaceName'),
      }).unwrap()
    ).data.id

  const board = await createBoard({
    spaceId: resolvedSpaceId,
    name: t('onboarding.sampleBoardName'),
    description: t('onboarding.sampleBoardDescription'),
  }).unwrap()

  const columns = [...(board.data.columns ?? [])].sort((a, b) => a.position - b.position)
  const todo = columns[0]?.id
  const doing = columns[1]?.id ?? todo
  if (!todo) return board.data.id

  await createTask({
    boardId: board.data.id,
    columnId: todo,
    title: t('onboarding.sampleTaskWelcome'),
  }).unwrap()
  await createTask({
    boardId: board.data.id,
    columnId: todo,
    title: t('onboarding.sampleTaskInvite'),
  }).unwrap()
  if (doing) {
    await createTask({
      boardId: board.data.id,
      columnId: doing,
      title: t('onboarding.sampleTaskMove'),
    }).unwrap()
  }

  return board.data.id
}
