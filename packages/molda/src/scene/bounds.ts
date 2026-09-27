import type { Vec3 } from '../core/model'
import type { Bounds } from '../model/transform'
import type { indexSceneDocument } from './documentIndex'
import { evaluateSceneInstances, evaluateSceneNodeFlags } from './evaluate'
import { transformPoint } from './matrix'
import { requireScene } from './validation'

/** One bounded, revision-owned cache; no geometry scan is needed when only pose matrices change. */
export function prepareSceneBounds(index: ReturnType<typeof indexSceneDocument>) {
  const localBounds = new Map<string, Bounds | null>()
  for (const geometry of index.geometries.values()) {
    const points =
      geometry.kind === 'mesh'
        ? Object.values(geometry.vertices)
        : geometry.kind === 'path'
          ? geometry.points.flatMap(({ position: p }) => [
              p.map((v) => v - geometry.radius) as Vec3,
              p.map((v) => v + geometry.radius) as Vec3,
            ])
          : [geometry.from, geometry.to]
    if (points.length === 0) {
      localBounds.set(geometry.id, null)
      continue
    }
    const min: Vec3 = [Infinity, Infinity, Infinity]
    const max: Vec3 = [-Infinity, -Infinity, -Infinity]
    for (const point of points)
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis] as number, point[axis] as number)
        max[axis] = Math.max(max[axis] as number, point[axis] as number)
      }
    localBounds.set(geometry.id, { min, max })
  }
  return { geometries: index.geometries, localBounds }
}

/** World bounds also reject finite inputs whose composed coordinates overflow. */
export function sceneBounds(
  index: ReturnType<typeof indexSceneDocument>,
  options: {
    nodeIds?: ReadonlySet<string>
    includeMirrors?: boolean
    includeHidden?: boolean
    includeLocators?: boolean
    /** Opt-in authorial pivots for visible support guides, including empty groups. */
    includeGroupOrigins?: boolean
    /** Session deformation bounds by mesh instance, not by shared geometry. Null means no drawn surface. */
    nodeLocalBounds?: ReadonlyMap<string, Bounds | null>
  } = {},
  prepared = prepareSceneBounds(index),
): Bounds | null {
  requireScene(
    prepared.geometries === index.geometries,
    'bounds',
    'Os limites pertencem a outra revisão da geometria.',
  )
  const { localBounds } = prepared
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  let populated = false
  if (options.includeLocators || options.includeGroupOrigins) {
    const flags = evaluateSceneNodeFlags(index.scene)
    for (const id of index.scene.order) {
      const node = index.scene.nodes.get(id)
      if (!node) continue
      if (
        !(
          (node.kind === 'locator' && options.includeLocators) ||
          (node.kind === 'group' && options.includeGroupOrigins)
        ) ||
        (options.nodeIds && !options.nodeIds.has(id)) ||
        (options.includeHidden === false && flags.get(id)?.hidden)
      )
        continue
      const world = index.scene.worldMatrices.get(id)
      if (!world) continue
      const point = transformPoint(world, [0, 0, 0])
      requireScene(point.every(Number.isFinite), `nodes.${id}`, 'O ponto excede o limite numérico.')
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis] as number, point[axis] as number)
        max[axis] = Math.max(max[axis] as number, point[axis] as number)
      }
      populated = true
    }
  }
  for (const instance of evaluateSceneInstances(index)) {
    if (options.includeHidden === false && instance.hidden) continue
    if (options.nodeIds && !options.nodeIds.has(instance.sourceNodeId)) continue
    if (options.includeMirrors === false && instance.id !== instance.sourceNodeId) continue
    const bounds = options.nodeLocalBounds?.has(instance.sourceNodeId)
      ? options.nodeLocalBounds.get(instance.sourceNodeId)
      : localBounds.get(instance.geometryId)
    if (!bounds) continue
    for (const x of [bounds.min[0], bounds.max[0]]) {
      for (const y of [bounds.min[1], bounds.max[1]]) {
        for (const z of [bounds.min[2], bounds.max[2]]) {
          const point = transformPoint(instance.worldMatrix, [x, y, z])
          requireScene(
            point.every(Number.isFinite),
            `nodes.${instance.id}`,
            'A posição da peça excede o limite numérico.',
          )
          populated = true
          for (let axis = 0; axis < 3; axis += 1) {
            min[axis] = Math.min(min[axis] as number, point[axis] as number)
            max[axis] = Math.max(max[axis] as number, point[axis] as number)
          }
        }
      }
    }
  }
  return populated ? { min, max } : null
}
