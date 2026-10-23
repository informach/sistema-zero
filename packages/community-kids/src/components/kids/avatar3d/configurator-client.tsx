'use client'

import { AvatarConfiguratorClient as Shared } from '@sistemazero/member-shell/components/cosmetics/avatar3d/configurator-client'
import type { ComponentProps } from 'react'
import { KidsCosmetics } from '../cosmetics-presentation'

export * from '@sistemazero/member-shell/components/cosmetics/avatar3d/configurator-client'
export function AvatarConfiguratorClient(props: ComponentProps<typeof Shared>) {
  return (
    <KidsCosmetics>
      <Shared {...props} />
    </KidsCosmetics>
  )
}
