import type { MoldaPart, Vec3 } from '../core/model'
import { partSize } from '../model/shapes'
import { partPivot } from '../model/transform'
import type { ViewName } from './types'

export const VIEW_DIRECTIONS: Record<Exclude<ViewName, 'frame'>, Vec3> = {
  front: [0, 0.18, 1],
  back: [0, 0.18, -1],
  left: [-1, 0.18, 0],
  right: [1, 0.18, 0],
  top: [0, 1, 0.001],
}

export function rad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function deg(radians: number): number {
  return (radians * 180) / Math.PI
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

/**
 * A malha entra no hash por IDENTIDADE (um número por objeto): comparar 1 000
 * vértices a cada quadro custaria mais que reconstruir o mesh; toda operação da
 * malha devolve um objeto novo, então identidade nova = geometria nova.
 */
const meshIdentities = new WeakMap<object, number>()
let nextMeshIdentity = 1
function meshIdentity(mesh: object | undefined): string {
  if (!mesh) return ''
  let id = meshIdentities.get(mesh)
  if (id === undefined) {
    id = nextMeshIdentity
    nextMeshIdentity += 1
    meshIdentities.set(mesh, id)
  }
  return String(id)
}

export function geometryHash(part: MoldaPart, layoutVersion: number): string {
  const pivot = partPivot(part)
  const size = partSize(part)
  return [
    part.shape,
    meshIdentity(part.mesh),
    size.join(','),
    [part.from[0] - pivot[0], part.from[1] - pivot[1], part.from[2] - pivot[2]].join(','),
    part.color,
    part.mirrorOf ?? '',
    layoutVersion,
  ].join('|')
}
