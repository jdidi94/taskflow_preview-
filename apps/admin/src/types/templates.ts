export type AdminTemplate = {
  id: string
  name: string
  description?: string
  type?: string
  category?: string
  tags?: string[]
  status?: string
  isPublic?: boolean
  isSystem?: boolean
  content?: unknown
  createdAt: string
  updatedAt?: string
}

export type BrandingAsset = {
  key: string
  url: string | null
  label: string
}
