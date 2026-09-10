import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/api'
import type { AdminTemplate, BrandingAsset } from '@/types/templates'

export const adminTemplatesApi = createApi({
  reducerPath: 'adminTemplatesApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Templates'],
  endpoints: (builder) => ({
    listProjectTemplates: builder.query<ApiSuccess<{ templates: AdminTemplate[] }>, void>({
      query: () => '/admin/templates/projects',
      providesTags: ['Templates'],
    }),
    createProjectTemplate: builder.mutation<
      ApiSuccess<{ template: AdminTemplate }>,
      { name: string; description?: string; content: unknown; category?: string; isPublic?: boolean }
    >({
      query: (body) => ({ url: '/admin/templates/projects', method: 'POST', body }),
      invalidatesTags: ['Templates'],
    }),
    updateProjectTemplate: builder.mutation<
      ApiSuccess<{ template: AdminTemplate }>,
      { templateId: string; name?: string; description?: string; content?: unknown; category?: string; isPublic?: boolean }
    >({
      query: ({ templateId, ...body }) => ({
        url: `/admin/templates/projects/${templateId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Templates'],
    }),
    deleteProjectTemplate: builder.mutation<{ success: true }, string>({
      query: (templateId) => ({ url: `/admin/templates/projects/${templateId}`, method: 'DELETE' }),
      invalidatesTags: ['Templates'],
    }),
    listTaskTemplates: builder.query<ApiSuccess<{ templates: AdminTemplate[] }>, void>({
      query: () => '/admin/templates/tasks',
      providesTags: ['Templates'],
    }),
    listAiPrompts: builder.query<ApiSuccess<{ prompts: AdminTemplate[] }>, void>({
      query: () => '/admin/templates/ai-prompts',
      providesTags: ['Templates'],
    }),
    listBranding: builder.query<ApiSuccess<{ assets: BrandingAsset[] }>, void>({
      query: () => '/admin/templates/branding',
    }),
  }),
})

export const {
  useListProjectTemplatesQuery,
  useCreateProjectTemplateMutation,
  useUpdateProjectTemplateMutation,
  useDeleteProjectTemplateMutation,
  useListTaskTemplatesQuery,
  useListAiPromptsQuery,
  useListBrandingQuery,
} = adminTemplatesApi
