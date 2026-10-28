'use client'

import type { ReactNode } from 'react'
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
  header,
}: {
  avatarPhotoUrl?: string | null
  /** Como conquistar cada troféu, na voz do app. */
  trophyHints?: Readonly<Record<string, string>>
  /** O voltar e o título da página, na mesma linha das moedas e do Salvar. */
  header?: ReactNode
}) {
  return (
    <RoomBuilder
      avatarPhotoUrl={avatarPhotoUrl}
      header={header}
      skin="adult"
      trophyHints={trophyHints}
      view={AdultRoomBuilderView}
    />
  )
}
