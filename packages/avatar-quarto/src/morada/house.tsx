'use client'
import {
  MORADA_CATALOG,
  type MoradaCatalog,
  type MoradaHouse,
  type MoradaInstance,
  type MoradaVector,
} from '@sistemazero/core/morada'
import type { Object3D } from 'three'
import { MoradaRoomPet } from './pet-room'
import { MoradaPieceView } from './piece'

/** Um documento, sem física: o consumidor do jogo cria colisores a partir do mesmo catálogo. */
export function MoradaHouseView({
  house,
  catalog = MORADA_CATALOG,
  roomId,
  paused = false,
  interactive = false,
  onSelect,
  onMove,
  onPieceLoad,
  showPet = true,
  petReducedMotion = false,
}: {
  house: MoradaHouse
  catalog?: MoradaCatalog
  roomId?: string
  paused?: boolean
  interactive?: boolean
  onSelect?: (instance: MoradaInstance) => void
  onMove?: (instance: MoradaInstance, position: MoradaVector) => void
  onPieceLoad?: (instance: MoradaInstance, root: Object3D, activate: () => void) => void
  showPet?: boolean
  /** O passeio ocioso é decorativo: corpo e clipe param juntos. */
  petReducedMotion?: boolean
}) {
  const render = (instance: MoradaInstance, ancestors: ReadonlySet<string>) => {
    if (ancestors.has(instance.id)) return null
    const next = new Set([...ancestors, instance.id])
    return (
      <MoradaPieceView
        key={instance.id}
        instance={instance}
        catalog={catalog}
        paused={paused}
        interactive={interactive}
        onSelect={onSelect}
        onMove={onMove}
        onLoad={onPieceLoad ? (root, activate) => onPieceLoad(instance, root, activate) : undefined}
        attachments={house.instances
          .filter((i) => i.parentId === instance.id && i.slotId)
          .map((child) => ({ slotId: child.slotId ?? '', children: render(child, next) }))}
      />
    )
  }
  const roots = house.instances.filter((i) => !i.parentId && (!roomId || i.roomId === roomId))
  return (
    <group name="morada-house">
      {roots.map((instance) => {
        const room = instance.roomId ? house.rooms.find((r) => r.id === instance.roomId) : undefined
        return (
          <group key={instance.id} position={room?.origin ?? [0, 0, 0]}>
            {render(instance, new Set())}
          </group>
        )
      })}
      {showPet && house.pet ? (
        <MoradaRoomPet
          key={house.pet}
          house={house}
          catalog={catalog}
          paused={paused}
          reducedMotion={petReducedMotion}
        />
      ) : null}
    </group>
  )
}
