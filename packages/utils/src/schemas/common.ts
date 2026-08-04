import { z } from 'zod'

/** Shared primitive schemas — expand in Phase 3/4. */
export const idSchema = z.string().min(1)

export const emailSchema = z.string().email()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>
