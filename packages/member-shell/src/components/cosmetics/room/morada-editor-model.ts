import {
  MORADA_CATALOG,
  type MoradaCatalog,
  type MoradaHouse,
  type MoradaInstance,
  moradaFootprint,
} from '@sistemazero/core/morada'

/** Preserva tudo fora do quarto, inclusive quando o jogo gravou durante a edição. */
export function replaceMoradaRoom(current: MoradaHouse, draft: MoradaHouse): MoradaHouse {
  const roomId = current.roomId
  return {
    ...current,
    pet: draft.pet,
    rooms: current.rooms.map((room) =>
      room.id === roomId ? (draft.rooms.find((r) => r.id === roomId) ?? room) : room,
    ),
    instances: [
      ...current.instances.filter((i) => i.roomId !== roomId),
      ...draft.instances.filter((i) => i.roomId === roomId),
    ],
  }
}

/** Remove também os objetos dentro dos nichos; a posse continua no inventário. */
export function removeMoradaInstance(house: MoradaHouse, id: string): MoradaHouse {
  const removed = new Set([id])
  let count = 0
  while (count !== removed.size) {
    count = removed.size
    for (const instance of house.instances)
      if (instance.parentId && removed.has(instance.parentId)) removed.add(instance.id)
  }
  return { ...house, instances: house.instances.filter((instance) => !removed.has(instance.id)) }
}

export function moradaFitsRoom(
  house: MoradaHouse,
  instance: MoradaInstance,
  catalog: MoradaCatalog = MORADA_CATALOG,
): boolean {
  const piece = catalog.pieces[instance.pieceId]
  const room = house.rooms.find((r) => r.id === house.roomId)
  if (!piece || !room) return false
  if (instance.parentId) return true
  const margin = piece.kind === 'construction' ? 0.2 : 0.001
  const cos = Math.cos(instance.rotation),
    sin = Math.sin(instance.rotation)
  return [piece.min[0], piece.max[0]].every((x) =>
    [piece.min[2], piece.max[2]].every(
      (z) =>
        Math.abs(instance.position[0] + x * cos + z * sin) <= room.size[0] / 2 + margin &&
        Math.abs(instance.position[2] - x * sin + z * cos) <= room.size[1] / 2 + margin,
    ),
  )
}

export function moradaSurfaceOptions(
  house: MoradaHouse,
  child: MoradaInstance,
  catalog: MoradaCatalog = MORADA_CATALOG,
) {
  const piece = catalog.pieces[child.pieceId]
  if (!piece) return []
  return house.instances
    .filter((p) => p.roomId === house.roomId && p.id !== child.id)
    .flatMap((parent) => {
      let ancestor: MoradaInstance | undefined = parent
      while (ancestor?.parentId) {
        if (ancestor.parentId === child.id) return []
        ancestor = house.instances.find((i) => i.id === ancestor?.parentId)
      }
      return (catalog.pieces[parent.pieceId]?.slots ?? [])
        .filter(
          (slot) =>
            moradaFootprint(piece.size, child.rotation).every(
              (v, index) => v <= (slot.size[index] ?? 0) + 0.001,
            ) &&
            !house.instances.some(
              (i) => i.id !== child.id && i.parentId === parent.id && i.slotId === slot.id,
            ),
        )
        .map((slot) => ({ parent, slot }))
    })
}
