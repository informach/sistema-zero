'use client'

import { LazyRoomCanvas as Shared } from '@sistemazero/member-shell/components/cosmetics/room/lazy-room-canvas'
import type { ComponentProps } from 'react'
import { KidsCosmetics } from '../cosmetics-presentation'

export * from '@sistemazero/member-shell/components/cosmetics/room/lazy-room-canvas'
export function LazyRoomCanvas(props: ComponentProps<typeof Shared>) {
  return (
    <KidsCosmetics>
      <Shared {...props} />
    </KidsCosmetics>
  )
}
