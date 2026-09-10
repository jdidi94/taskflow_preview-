import { initialsFromName, resolveAvatarUrl } from '@/lib/avatarUrl'

type AdminAvatarProps = {
  name?: string | null
  email?: string | null
  avatar?: string | null
  size?: 'sm' | 'md'
}

export function AdminAvatar({ name, email, avatar, size = 'sm' }: AdminAvatarProps) {
  const src = resolveAvatarUrl(avatar)
  const dim = size === 'md' ? 'h-16 w-16 text-lg' : 'h-8 w-8 text-xs'

  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary`}
      aria-hidden
    >
      {initialsFromName(name, email)}
    </span>
  )
}
