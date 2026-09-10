export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}
