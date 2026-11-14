import type { MoradaCatalog, MoradaHouse } from '@sistemazero/core/morada'

export interface MoradaPetObstacle {
  x: number
  z: number
  halfX: number
  halfZ: number
  rotation: number
}
export interface MoradaPetWalk {
  x: number
  z: number
  heading: number
  elapsed: number
  walking: boolean
}
export interface MoradaPetArea {
  size: [number, number]
  radius: number
  obstacles: MoradaPetObstacle[]
}

/** Caixas autorais, na escala nativa. Um tampo alto não ocupa o vão entre as pernas. */
export function moradaPetArea(house: MoradaHouse, catalog: MoradaCatalog): MoradaPetArea {
  const room = house.rooms.find((r) => r.id === house.roomId)
  const pet = house.pet ? catalog.pieces[house.pet] : undefined
  const radius = Math.max(0.15, (pet?.size[0] ?? 0.4) / 2, (pet?.size[2] ?? 0.4) / 2)
  const height = pet?.size[1] ?? 0.5
  const obstacles = house.instances
    .filter((i) => i.roomId === house.roomId && !i.parentId)
    .flatMap((instance) => {
      const c = Math.cos(instance.rotation),
        s = Math.sin(instance.rotation)
      return (catalog.pieces[instance.pieceId]?.colliders ?? [])
        .filter((box) => {
          const bottom = instance.position[1] + box.center[1] - box.size[1] / 2
          const top = bottom + box.size[1]
          return top > 0.08 && bottom < height * 0.8
        })
        .map((box) => ({
          x: instance.position[0] + box.center[0] * c + box.center[2] * s,
          z: instance.position[2] - box.center[0] * s + box.center[2] * c,
          halfX: box.size[0] / 2,
          halfZ: box.size[2] / 2,
          rotation: instance.rotation,
        }))
    })
  return { size: room?.size ?? [8, 6], radius, obstacles }
}

export function moradaPetBlocked(x: number, z: number, area: MoradaPetArea): boolean {
  if (Math.abs(x) > area.size[0] / 2 - area.radius || Math.abs(z) > area.size[1] / 2 - area.radius)
    return true
  return area.obstacles.some((box) => {
    const dx = x - box.x,
      dz = z - box.z,
      c = Math.cos(box.rotation),
      s = Math.sin(box.rotation)
    return (
      Math.abs(dx * c - dz * s) < box.halfX + area.radius &&
      Math.abs(dx * s + dz * c) < box.halfZ + area.radius
    )
  })
}

export function safeMoradaPetPosition(area: MoradaPetArea): [number, number] | null {
  for (let z = -area.size[1] / 2 + area.radius; z <= area.size[1] / 2 - area.radius; z += 0.5) {
    for (let x = -area.size[0] / 2 + area.radius; x <= area.size[0] / 2 - area.radius; x += 0.5) {
      if (!moradaPetBlocked(x, z, area)) return [x, z]
    }
  }
  return null
}

/** Alterna passeio e descanso, sem relógio global ou deslocamento em paredes/móveis. */
export function stepMoradaPet(
  state: MoradaPetWalk,
  area: MoradaPetArea,
  dt: number,
  motion: { paused?: boolean; reducedMotion?: boolean } = {},
): void {
  if (motion.paused || motion.reducedMotion) return
  state.elapsed += Math.min(dt, 0.1)
  if (moradaPetBlocked(state.x, state.z, area)) {
    const safe = safeMoradaPetPosition(area)
    if (!safe) {
      state.walking = false
      return
    }
    ;[state.x, state.z] = safe
  }
  if (state.elapsed % 7 >= 4.5) {
    state.walking = false
    return
  }
  const distance = Math.min(dt, 0.1) * 0.65
  for (const turn of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const heading = state.heading + turn
    const x = state.x + Math.sin(heading) * distance,
      z = state.z + Math.cos(heading) * distance
    if (!moradaPetBlocked(x, z, area)) {
      state.x = x
      state.z = z
      state.heading = heading
      state.walking = true
      return
    }
  }
  state.walking = false
}
