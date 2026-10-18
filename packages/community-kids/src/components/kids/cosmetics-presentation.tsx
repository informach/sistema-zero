'use client'

import {
  type CosmeticsPresentation,
  CosmeticsPresentationProvider,
} from '@sistemazero/member-shell/components/cosmetics/presentation'
import type { PropsWithChildren } from 'react'
import { KidsBackButton } from './back-button'
import { KidsAvatar } from './kids-avatar'
import { KidsMascot } from './mascot'
import { ZappyCoin } from './zappy-coin'

const presentation: CosmeticsPresentation = {
  BackButton: KidsBackButton,
  Avatar: KidsAvatar,
  Mascot: KidsMascot,
  Coin: ZappyCoin,
}
export function KidsCosmetics({ children }: PropsWithChildren) {
  return (
    <CosmeticsPresentationProvider value={presentation}>{children}</CosmeticsPresentationProvider>
  )
}
