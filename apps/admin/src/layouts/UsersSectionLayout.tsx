import { Outlet } from 'react-router'

import { UsersSubnav } from '@/components/users/UsersSubnav'

export function UsersSectionLayout() {
  return (
    <div>
      <UsersSubnav />
      <Outlet />
    </div>
  )
}
