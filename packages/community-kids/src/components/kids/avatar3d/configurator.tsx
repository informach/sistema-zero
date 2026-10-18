'use client'

import { AvatarConfigurator as Shared } from '@sistemazero/member-shell/components/cosmetics/avatar3d/configurator'
import type { ComponentProps } from 'react'
import { KidsCosmetics } from '../cosmetics-presentation'

export * from '@sistemazero/member-shell/components/cosmetics/avatar3d/configurator'
export function AvatarConfigurator(props: ComponentProps<typeof Shared>) {
  return (
    <KidsCosmetics>
      <Shared {...props} />
    </KidsCosmetics>
  )
}
