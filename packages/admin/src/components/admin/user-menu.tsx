'use client'

import type { ConsoleAppLink } from '@sistemazero/ui/console-apps'
import { ConsoleUserMenu } from '@sistemazero/ui/console-user-menu'
import type { SessionUser } from '@/lib/types'

export function UserMenu({
  user,
  apps,
  dropdownSide = 'down',
}: {
  user: SessionUser
  /** Os outros consoles (atendimento, marketing) — montados no layout a partir da env. */
  apps?: readonly ConsoleAppLink[]
  /** `up` p/ gatilhos rentes ao rodapé (footer da sidebar) — o menu abre acima. */
  dropdownSide?: 'down' | 'up'
}) {
  return (
    <ConsoleUserMenu
      user={user}
      fallbackInitial="A"
      logoutPath="/api/admin/logout"
      apps={apps}
      dropdownSide={dropdownSide}
    />
  )
}
