'use client'
import { PublicPlayer as Shared } from '@sistemazero/member-shell/components/creator/public-player'
import { KidsCosmetics } from './cosmetics-presentation'
export function PublicPlayer({ id }: { id: string }) {
  return (
    <KidsCosmetics>
      <Shared id={id} brandLabel="Sistema Zero Kids" />
    </KidsCosmetics>
  )
}
