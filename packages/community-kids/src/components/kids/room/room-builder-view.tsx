'use client'

import { RoomBuilderView as Shared } from '@sistemazero/member-shell/components/cosmetics/room/room-builder-view'
import type { ComponentProps } from 'react'
import { KidsCosmetics } from '../cosmetics-presentation'

export * from '@sistemazero/member-shell/components/cosmetics/room/room-builder-view'
export function RoomBuilderView(props: ComponentProps<typeof Shared>) {
  return (
    <KidsCosmetics>
      <Shared {...props} />
    </KidsCosmetics>
  )
}
