'use client'

import { RoomCanvas as Shared } from '@sistemazero/member-shell/components/cosmetics/room/room-canvas'
import type { ComponentProps } from 'react'
import { KidsCosmetics } from '../cosmetics-presentation'

export * from '@sistemazero/member-shell/components/cosmetics/room/room-canvas'
export function RoomCanvas(props: ComponentProps<typeof Shared>) {
  return (
    <KidsCosmetics>
      <Shared {...props} />
    </KidsCosmetics>
  )
}
