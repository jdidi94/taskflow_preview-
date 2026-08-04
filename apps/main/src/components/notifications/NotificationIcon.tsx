import { AlertCircle, AlertTriangle, CheckCircle, Info, UserPlus } from 'lucide-react'

type Props = {
  type: string
  className?: string
}

/** Type icon for a notification row (ported from v2 navbar bell). */
export function NotificationIcon({ type, className = '' }: Props) {
  const props = { size: 16, className: `shrink-0 ${className}`.trim(), 'aria-hidden': true as const }

  switch (type) {
    case 'workspace_invitation':
    case 'space_invitation':
    case 'board_invitation':
      return <UserPlus {...props} className={`${props.className} text-primary`} />
    case 'invitation_accepted':
    case 'success':
    case 'payment_update':
    case 'task_completed':
      return <CheckCircle {...props} className={`${props.className} text-success`} />
    case 'invitation_declined':
    case 'due_date_changed':
    case 'member_role_changed':
    case 'warning':
      return <AlertTriangle {...props} className={`${props.className} text-warning`} />
    case 'error':
      return <AlertCircle {...props} className={`${props.className} text-destructive`} />
    case 'task_assigned':
    case 'task_moved':
    case 'task_watcher_added':
      return <Info {...props} className={`${props.className} text-primary`} />
    default:
      return <Info {...props} className={`${props.className} text-primary`} />
  }
}
