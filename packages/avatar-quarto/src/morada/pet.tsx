'use client'
import { MORADA_CATALOG, type MoradaCatalog, type MoradaVector } from '@sistemazero/core/morada'
import { MoradaPieceView } from './piece'

/** O pet usa esqueleto e mixer próprios por montagem. O jogo pode dirigir o clipe. */
export function MoradaPetView({
  pieceId,
  paused = false,
  animation,
  position = [0, 0, 0],
  rotation = 0,
  catalog = MORADA_CATALOG,
}: {
  pieceId: string
  paused?: boolean
  animation?: string
  position?: MoradaVector
  rotation?: number
  catalog?: MoradaCatalog
}) {
  const piece = catalog.pieces[pieceId]
  if (piece?.kind !== 'pet') return null
  const idle =
    piece.animations.find((a) => /parado|idle/i.test(a.id))?.id ?? piece.animations[0]?.id
  return (
    <MoradaPieceView
      catalog={catalog}
      instance={{ id: `pet:${pieceId}`, pieceId, position, rotation }}
      paused={paused}
      animation={animation ?? idle}
    />
  )
}
