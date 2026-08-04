import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/domain'

export type TemplateItem = {
  id: string
  name: string
  description?: string
  type: string
  category?: string
  tags?: string[]
  isPublic?: boolean
  views?: number
  likesCount: number
  likedBy: string[]
  content?: unknown
}

function normalizeLikedBy(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>
        return String(record.id ?? record._id ?? '')
      }
      return ''
    })
    .filter(Boolean)
}

export function normalizeTemplate(item: unknown): TemplateItem {
  const record = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
  const likedBy = normalizeLikedBy(record.likedBy)
  return {
    id: String(record.id ?? record._id ?? ''),
    name: String(record.name ?? ''),
    description: record.description ? String(record.description) : undefined,
    type: String(record.type ?? 'board'),
    category: record.category ? String(record.category) : undefined,
    tags: Array.isArray(record.tags) ? record.tags.map(String) : [],
    isPublic: Boolean(record.isPublic),
    views: typeof record.views === 'number' ? record.views : 0,
    likesCount: likedBy.length,
    likedBy,
    content: record.content,
  }
}

export function extractTemplateLists(content: unknown): Array<{ name: string }> {
  if (!content || typeof content !== 'object') return []
  const record = content as Record<string, unknown>
  const raw = Array.isArray(record.lists)
    ? record.lists
    : Array.isArray(record.columns)
      ? record.columns
      : []
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const list = entry as Record<string, unknown>
      const name = String(list.title ?? list.name ?? '').trim()
      return name ? { name } : null
    })
    .filter((entry): entry is { name: string } => Boolean(entry))
}

export const templatesApi = createApi({
  reducerPath: 'templatesApi',
  baseQuery,
  tagTypes: ['Templates'],
  endpoints: (builder) => ({
    listTemplates: builder.query<
      ApiSuccess<TemplateItem[]>,
      { type?: string; category?: string } | void
    >({
      query: (params) => {
        const search = new URLSearchParams()
        if (params && typeof params === 'object') {
          if (params.type) search.set('type', params.type)
          if (params.category) search.set('category', params.category)
        }
        const qs = search.toString()
        return `/templates${qs ? `?${qs}` : ''}`
      },
      transformResponse: (response: ApiSuccess<TemplateItem[] | { templates?: unknown[] }>) => {
        const raw = Array.isArray(response.data)
          ? response.data
          : ((response.data as { templates?: unknown[] }).templates ?? [])
        return { success: true as const, data: raw.map(normalizeTemplate) }
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((template) => ({ type: 'Templates' as const, id: template.id })),
              { type: 'Templates', id: 'LIST' },
            ]
          : [{ type: 'Templates', id: 'LIST' }],
    }),
    getTemplate: builder.query<ApiSuccess<TemplateItem>, string>({
      query: (id) => `/templates/${id}`,
      transformResponse: (response: ApiSuccess<TemplateItem | { template?: unknown }>) => {
        const raw =
          response.data && typeof response.data === 'object' && 'template' in response.data
            ? (response.data as { template?: unknown }).template
            : response.data
        return { success: true as const, data: normalizeTemplate(raw) }
      },
      providesTags: (_result, _error, id) => [{ type: 'Templates', id }],
    }),
    likeTemplate: builder.mutation<ApiSuccess<TemplateItem>, { id: string }>({
      query: ({ id }) => ({
        url: `/templates/${id}/like`,
        method: 'POST',
      }),
      transformResponse: (response: ApiSuccess<{ template?: unknown } | TemplateItem>) => {
        const raw =
          response.data && typeof response.data === 'object' && 'template' in response.data
            ? (response.data as { template?: unknown }).template
            : response.data
        return { success: true as const, data: normalizeTemplate(raw) }
      },
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const template = data.data
          for (const arg of [{ type: 'board' }, { type: 'space' }, undefined] as const) {
            dispatch(
              templatesApi.util.updateQueryData('listTemplates', arg, (draft) => {
                const index = draft.data.findIndex((item) => item.id === id)
                if (index >= 0) draft.data[index] = template
              }),
            )
          }
        } catch {
          // list refresh via invalidatesTags
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Templates', id: arg.id },
        { type: 'Templates', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useListTemplatesQuery,
  useGetTemplateQuery,
  useLikeTemplateMutation,
} = templatesApi
