'use client'

import type { ComponentType, ReactNode } from 'react'

import type { CosmeticsSkin } from '../skin'

import { MoradaRoomBuilder } from './morada-room-builder'
import type { MoradaRoomViewProps } from './morada-room-view'

/** O quarto é um recorte do documento canônico da casa Morada. */

export function RoomBuilder({
  skin = 'kids',
  header,
  avatarPhotoUrl,
  trophyHints,
  view,
}: {
  avatarPhotoUrl?: string | null
  skin?: CosmeticsSkin
  trophyHints?: Readonly<Record<string, string>>
  header?: ReactNode
  view?: ComponentType<MoradaRoomViewProps>
}) {
  return (
    <MoradaRoomBuilder
      adult={skin === 'adult'}
      header={header}
      avatarPhotoUrl={avatarPhotoUrl}
      trophyHints={trophyHints}
      view={view}
    />
  )
}
