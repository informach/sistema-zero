'use client'

import type { ConsoleAppLink } from '@sistemazero/ui/console-apps'
import { ConsoleUserMenu } from '@sistemazero/ui/console-user-menu'
import type { SessionUser } from '@/lib/types'

export function UserMenu({
  user,
  apps,
}: {
  user: SessionUser
  /** Os outros consoles (admin, atendimento) — montados no layout a partir da env. */
  apps?: readonly ConsoleAppLink[]
}) {
  return (
    <ConsoleUserMenu user={user} fallbackInitial="M" logoutPath="/api/auth/logout" apps={apps} />
  )
}
