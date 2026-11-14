import type { MoradaHouse, MoradaInstance } from '@sistemazero/avatar-quarto/morada/catalog'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import { type Object3D, Vector3 } from 'three'
import { isPlantingPiece, moradaFunction } from '../sistemas/morada'
import { moradaRestModes } from '../sistemas/morada-descanso'
import { useInterativo } from './interativos'

export function MoradaInterativos({
  house,
  roots,
  actions,
  onSelect,
}: {
  house: MoradaHouse
  roots: ReadonlyMap<string, Object3D>
  actions: ReadonlyMap<string, () => void>
  onSelect: (i: MoradaInstance) => void
}) {
  return (
    <>
      {house.instances.map((instance) => {
        const piece = MORADA_CATALOG.pieces[instance.pieceId],
          root = roots.get(instance.id)
        return piece &&
          root &&
          (piece.interactions.length ||
            moradaFunction(instance) ||
            isPlantingPiece(piece) ||
            moradaRestModes(piece).length) ? (
          <Piece
            key={instance.id}
            instance={instance}
            root={root}
            activate={actions.get(instance.id)}
            onSelect={onSelect}
          />
        ) : null
      })}
    </>
  )
}
function Piece({
  instance,
  root,
  activate,
  onSelect,
}: {
  instance: MoradaInstance
  root: Object3D
  activate?: () => void
  onSelect: (i: MoradaInstance) => void
}) {
  const point = new Vector3()
  const piece = MORADA_CATALOG.pieces[instance.pieceId]!
  useInterativo(`morada:${instance.id}`, {
    get x() {
      return root.getWorldPosition(point).x
    },
    get z() {
      return root.getWorldPosition(point).z
    },
    get y() {
      return root.getWorldPosition(point).y
    },
    raio: 1.8,
    rotulo: () => `Usar ${piece.label}`,
    agir: () => {
      activate?.()
      if (moradaFunction(instance) || isPlantingPiece(piece) || moradaRestModes(piece).length)
        onSelect(instance)
    },
  })
  return null
}
