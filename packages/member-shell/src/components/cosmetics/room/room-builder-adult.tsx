'use client'

import { RoomBuilder } from './room-builder'
import { AdultRoomBuilderView } from './room-builder-view-adult'

/**
 * "Meu espaço 3D" da comunidade adulta: o mesmo orquestrador (`RoomBuilder`) com as frases e a tela
 * adultas. Mora num módulo à parte para o Kids, que importa só o `room-builder`, não baixar a tela
 * adulta.
 */
export function AdultRoomBuilder({
  avatarPhotoUrl,
  trophyHints,
}: {
  avatarPhotoUrl?: string | null
  /** Como conquistar cada troféu, na voz do app. */
  trophyHints?: Readonly<Record<string, string>>
}) {
  return (
    <RoomBuilder
      avatarPhotoUrl={avatarPhotoUrl}
      skin="adult"
      trophyHints={trophyHints}
      view={AdultRoomBuilderView}
    />
  )
}
