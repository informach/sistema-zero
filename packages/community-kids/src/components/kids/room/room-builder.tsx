'use client'

import { RoomBuilder as Shared } from '@sistemazero/member-shell/components/cosmetics/room/room-builder'
import type { ComponentProps } from 'react'
import { KidsCosmetics } from '../cosmetics-presentation'

export * from '@sistemazero/member-shell/components/cosmetics/room/room-builder'
export function RoomBuilder(props: ComponentProps<typeof Shared>) {
  return (
    <KidsCosmetics>
      <Shared {...props} />
    </KidsCosmetics>
  )
}
