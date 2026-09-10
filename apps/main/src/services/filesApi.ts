import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import { tasksApi } from '@/services/tasksApi'
import type { ApiSuccess, TaskFile } from '@/types/domain'

export type DriveStatus = {
  configured: boolean
  linked: boolean
  tokenValid: boolean
  email: string | null
  lastSync: string | null
  redirectUri: string
}

export type DriveListedFile = {
  id: string
  name: string
  mimeType: string
  size: number
  webViewLink: string | null
  iconLink: string | null
  thumbnailLink: string | null
  modifiedTime: string | null
}

function normalizeFile(raw: Record<string, unknown>): TaskFile {
  const id = String(raw.id ?? raw._id ?? '')
  return {
    id,
    _id: raw._id ? String(raw._id) : id,
    originalName: String(raw.originalName ?? raw.filename ?? 'file'),
    filename: raw.filename ? String(raw.filename) : undefined,
    mimeType: String(raw.mimeType ?? 'application/octet-stream'),
    size: Number(raw.size ?? 0),
    url: String(raw.url ?? raw.externalUrl ?? ''),
    category: raw.category ? String(raw.category) : undefined,
    source: raw.source ? String(raw.source) : 'local',
    externalId: raw.externalId ? String(raw.externalId) : null,
    externalUrl: raw.externalUrl ? String(raw.externalUrl) : null,
  }
}

export const filesApi = createApi({
  reducerPath: 'filesApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Files', 'Drive'],
  endpoints: (builder) => ({
    getFile: builder.query<ApiSuccess<TaskFile>, string>({
      query: (id) => `/files/${id}`,
      transformResponse: (response: ApiSuccess<Record<string, unknown> | { file: Record<string, unknown> }>) => {
        const raw =
          response.data && typeof response.data === 'object' && 'file' in response.data
            ? (response.data as { file: Record<string, unknown> }).file
            : (response.data as Record<string, unknown>)
        return { success: true as const, data: normalizeFile(raw) }
      },
      providesTags: (_result, _error, id) => [{ type: 'Files', id }],
    }),
    getDriveStatus: builder.query<ApiSuccess<DriveStatus>, void>({
      query: () => '/files/drive/status',
      providesTags: [{ type: 'Drive', id: 'STATUS' }],
    }),
    getDriveAuthUrl: builder.query<ApiSuccess<{ url: string; redirectUri: string }>, { redirectUri?: string } | void>({
      query: (args) => {
        const params = new URLSearchParams()
        if (args && typeof args === 'object' && args.redirectUri) {
          params.set('redirectUri', args.redirectUri)
        }
        const qs = params.toString()
        return `/files/drive/auth-url${qs ? `?${qs}` : ''}`
      },
    }),
    linkDrive: builder.mutation<
      ApiSuccess<{ linked: boolean; email: string | null; scope: string }>,
      { code: string; redirectUri?: string }
    >({
      query: (body) => ({
        url: '/files/drive/link',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Drive', id: 'STATUS' }],
    }),
    unlinkDrive: builder.mutation<ApiSuccess<{ linked: boolean }>, void>({
      query: () => ({
        url: '/files/drive/unlink',
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Drive', id: 'STATUS' }],
    }),
    listDriveFiles: builder.query<
      ApiSuccess<{ files: DriveListedFile[]; nextPageToken: string | null }>,
      { pageToken?: string; q?: string } | void
    >({
      query: (args) => {
        const params = new URLSearchParams()
        if (args && typeof args === 'object') {
          if (args.pageToken) params.set('pageToken', args.pageToken)
          if (args.q) params.set('q', args.q)
        }
        const qs = params.toString()
        return `/files/drive/files${qs ? `?${qs}` : ''}`
      },
      providesTags: [{ type: 'Drive', id: 'FILES' }],
    }),
    attachDriveFile: builder.mutation<
      ApiSuccess<{ file: TaskFile }>,
      { driveFileId: string; taskId?: string; boardId?: string }
    >({
      query: ({ driveFileId, taskId }) => ({
        url: '/files/drive/attach',
        method: 'POST',
        body: { driveFileId, taskId, category: 'task_attachment' },
      }),
      transformResponse: (response: { success: true; data: { file: Record<string, unknown> } }) => ({
        success: true as const,
        data: { file: normalizeFile(response.data.file) },
      }),
      async onQueryStarted({ boardId, taskId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          if (boardId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: `BOARD_${boardId}` }]))
          }
          if (taskId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: taskId }]))
          }
        } catch {
          /* ignore */
        }
      },
    }),
    linkExternalFile: builder.mutation<
      ApiSuccess<{ file: TaskFile }>,
      {
        source: 'google_drive' | 'url'
        originalName: string
        mimeType?: string
        size?: number
        externalId?: string
        externalUrl: string
        taskId?: string
        boardId?: string
      }
    >({
      query: (body) => ({
        url: '/files/link',
        method: 'POST',
        body: {
          source: body.source,
          originalName: body.originalName,
          mimeType: body.mimeType ?? 'application/octet-stream',
          size: body.size,
          externalId: body.externalId,
          externalUrl: body.externalUrl,
          taskId: body.taskId,
          category: 'task_attachment',
        },
      }),
      transformResponse: (response: { success: true; data: { file: Record<string, unknown> } }) => ({
        success: true as const,
        data: { file: normalizeFile(response.data.file) },
      }),
      async onQueryStarted({ boardId, taskId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          if (boardId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: `BOARD_${boardId}` }]))
          }
          if (taskId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: taskId }]))
          }
        } catch {
          /* ignore */
        }
      },
    }),
    uploadTaskAttachments: builder.mutation<
      ApiSuccess<{ files: TaskFile[]; count: number }>,
      { files: File[]; taskId?: string; boardId?: string }
    >({
      query: ({ files, taskId }) => {
        const form = new FormData()
        for (const file of files) form.append('files', file)
        if (taskId) form.append('taskId', taskId)
        return {
          url: '/files/upload/task-attachments',
          method: 'POST',
          body: form,
        }
      },
      transformResponse: (response: {
        success: true
        data: { files: Record<string, unknown>[]; count: number }
      }) => ({
        success: true as const,
        data: {
          files: (response.data.files ?? []).map((f) => normalizeFile(f)),
          count: response.data.count,
        },
      }),
      async onQueryStarted({ boardId, taskId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          if (boardId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: `BOARD_${boardId}` }]))
          }
          if (taskId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: taskId }]))
          }
        } catch {
          /* ignore */
        }
      },
    }),
    deleteFile: builder.mutation<{ success: true }, { id: string; boardId?: string; taskId?: string }>({
      query: ({ id }) => ({
        url: `/files/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ boardId, taskId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
          if (boardId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: `BOARD_${boardId}` }]))
          }
          if (taskId) {
            dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: taskId }]))
          }
        } catch {
          /* ignore */
        }
      },
    }),
  }),
})

export const {
  useGetFileQuery,
  useLazyGetFileQuery,
  useGetDriveStatusQuery,
  useLazyGetDriveAuthUrlQuery,
  useLinkDriveMutation,
  useUnlinkDriveMutation,
  useListDriveFilesQuery,
  useLazyListDriveFilesQuery,
  useAttachDriveFileMutation,
  useLinkExternalFileMutation,
  useUploadTaskAttachmentsMutation,
  useDeleteFileMutation,
} = filesApi
