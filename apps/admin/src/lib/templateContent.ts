export const LIST_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#F97316',
  '#06B6D4',
  '#84CC16',
  '#EC4899',
  '#6B7280',
] as const

export type TemplateCardPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TemplateListDraft = {
  id: string
  title: string
  order: number
  color: string
}

export type TemplateCardDraft = {
  id: string
  title: string
  description: string
  listId: string
  order: number
  priority: TemplateCardPriority
  estimatedHours: number
  tags: string[]
}

export type TemplateBoardContent = {
  lists: TemplateListDraft[]
  cards: TemplateCardDraft[]
}

const PRIORITIES: TemplateCardPriority[] = ['low', 'medium', 'high', 'urgent']

export function newTemplateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyBoardContent(): TemplateBoardContent {
  return {
    lists: [
      { id: newTemplateId(), title: 'Todo', order: 0, color: LIST_COLORS[0] },
      { id: newTemplateId(), title: 'Doing', order: 1, color: LIST_COLORS[1] },
      { id: newTemplateId(), title: 'Done', order: 2, color: LIST_COLORS[2] },
    ],
    cards: [],
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export function parseTemplateContent(content: unknown): TemplateBoardContent {
  const record = asRecord(content)
  if (!record) return emptyBoardContent()

  const rawLists = Array.isArray(record.lists)
    ? record.lists
    : Array.isArray(record.defaultLists)
      ? record.defaultLists
      : Array.isArray(record.columns)
        ? record.columns
        : []

  const lists: TemplateListDraft[] = []
  rawLists.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const title = entry.trim()
      if (!title) return
      lists.push({
        id: newTemplateId(),
        title,
        order: index,
        color: LIST_COLORS[index % LIST_COLORS.length],
      })
      return
    }
    const list = asRecord(entry)
    if (!list) return
    const title = String(list.title ?? list.name ?? '').trim()
    if (!title) return
    lists.push({
      id: String(list.id ?? newTemplateId()),
      title,
      order: typeof list.order === 'number' ? list.order : index,
      color: typeof list.color === 'string' && list.color ? list.color : LIST_COLORS[index % LIST_COLORS.length],
    })
  })

  const sortedLists = [...lists]
    .sort((a, b) => a.order - b.order)
    .map((list, index) => ({ ...list, order: index }))

  const rawCards = Array.isArray(record.cards)
    ? record.cards
    : Array.isArray(record.defaultCards)
      ? record.defaultCards
      : []

  const titleToId = new Map(sortedLists.map((list) => [list.title, list.id]))
  const cards: TemplateCardDraft[] = []

  rawCards.forEach((entry, index) => {
    const card = asRecord(entry)
    if (!card) return
    const title = String(card.title ?? '').trim()
    if (!title) return
    const listRef = String(card.listKey ?? card.listId ?? card.listTitle ?? '')
    const listId =
      titleToId.get(listRef) ?? (sortedLists.some((list) => list.id === listRef) ? listRef : sortedLists[0]?.id)
    if (!listId) return
    const priorityRaw = String(card.priority ?? 'medium')
    const priority = PRIORITIES.includes(priorityRaw as TemplateCardPriority)
      ? (priorityRaw as TemplateCardPriority)
      : 'medium'
    const tags = Array.isArray(card.tags) ? card.tags.map((tag) => String(tag).trim()).filter(Boolean) : []
    cards.push({
      id: String(card.id ?? newTemplateId()),
      title,
      description: String(card.description ?? ''),
      listId,
      order: typeof card.order === 'number' ? card.order : index,
      priority,
      estimatedHours: typeof card.estimatedHours === 'number' ? card.estimatedHours : 0,
      tags,
    })
  })

  if (sortedLists.length === 0) return emptyBoardContent()
  return { lists: sortedLists, cards }
}

export function serializeTemplateContent(board: TemplateBoardContent): Record<string, unknown> {
  const lists = board.lists
    .map((list) => ({ ...list, title: list.title.trim() }))
    .filter((list) => list.title)
    .map((list, index) => ({
      id: list.id,
      title: list.title,
      name: list.title,
      order: index,
      color: list.color,
    }))

  const idToTitle = new Map(lists.map((list) => [list.id, list.title]))
  const cards = board.cards
    .filter((card) => card.title.trim() && idToTitle.has(card.listId))
    .map((card, index) => ({
      id: card.id,
      title: card.title.trim(),
      description: card.description.trim() || undefined,
      listId: idToTitle.get(card.listId),
      listKey: card.listId,
      order: typeof card.order === 'number' ? card.order : index,
      priority: card.priority,
      estimatedHours: card.estimatedHours,
      tags: card.tags,
    }))

  return {
    lists,
    columns: lists,
    cards,
    defaultLists: lists,
    defaultCards: cards,
  }
}

export function boardFromPreset(lists: Array<{ title: string; color?: string }>): TemplateBoardContent {
  return {
    lists: lists.map((list, index) => ({
      id: newTemplateId(),
      title: list.title,
      order: index,
      color: list.color ?? LIST_COLORS[index % LIST_COLORS.length],
    })),
    cards: [],
  }
}
