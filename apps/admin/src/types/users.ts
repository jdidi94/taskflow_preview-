export type AppUser = {
  id: string
  username: string
  email: string
  role: string
  status: 'Active' | 'Inactive' | string
  lastLoginAt: string
  createdAt: string
  avatar?: string | null
}

export type AddUserFormData = {
  username: string
  email: string
  role: string
}

export type EditUserFormData = {
  username: string
  email: string
  role: string
  isActive: boolean
}
