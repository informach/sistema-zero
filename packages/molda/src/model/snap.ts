/**
 * Núcleo puro do “Grudar”: enumera âncoras estáveis, resolve referências contra
 * o modelo atual e aplica uma única translação atômica em precisão de 1/16.
 */
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaMesh, MoldaModelAsset, MoldaPart, Vec3 } from '../core/model'
import { buildPartGeometry } from './geometry'
import { boxInsideGrid, movePartsBy, resolveSourceId } from './partOps'
import { partMatrix, partPivot, transformPoint } from './transform'

export type SnapAnchorRef =
  | { kind: 'vertex'; partId: string; vertexKey: string }
  | { kind: 'pivot'; partId: string }
  | { kind: 'selection-center'; partIds: readonly string[] }

export interface SnapAnchor {
  ref: SnapAnchorRef
  point: Vec3
}

interface LocalVertex {
  key: string
  point: Vec3
}

const PRIMITIVE_CACHE_LIMIT = 1024

function coordinateKey(point: Vec3): string {
  return point.map((value) => Math.round(value * 1e9) / 1e9).join(',')
}

function primitiveGeometryKey(part: MoldaPart): string {
  return `${part.shape}|${part.from.join(',')}|${part.to.join(',')}`
}

/** Cache reutilizável pelo viewport; a identidade da malha é sua própria referência. */
export class SnapAnchorCache {
  private readonly meshes = new WeakMap<MoldaMesh, readonly LocalVertex[]>()
  private readonly primitives = new Map<string, readonly LocalVertex[]>()

  localVertices(part: MoldaPart): readonly LocalVertex[] {
    if (part.mesh) {
      const cached = this.meshes.get(part.mesh)
      if (cached) return cached
      const vertices = Object.entries(part.mesh.vertices)
        .slice(0, MOLDA_LIMITS.maxMeshVertices)
        .map(([key, point]) => ({ key: `mesh:${key}`, point }))
      this.meshes.set(part.mesh, vertices)
      return vertices
    }

    const geometryKey = primitiveGeometryKey(part)
    const cached = this.primitives.get(geometryKey)
    if (cached) return cached
    const positions = buildPartGeometry(part).positions
    const seen = new Set<string>()
    const vertices: LocalVertex[] = []
    for (let index = 0; index < positions.length; index += 3) {
      const point: Vec3 = [
        positions[index] as number,
        positions[index + 1] as number,
        positions[index + 2] as number,
      ]
      const key = coordinateKey(point)
      if (seen.has(key)) continue
      seen.add(key)
      vertices.push({ key: `point:${key}`, point })
      if (vertices.length >= MOLDA_LIMITS.maxMeshVertices) break
    }
    if (this.primitives.size >= PRIMITIVE_CACHE_LIMIT) {
      const oldest = this.primitives.keys().next().value
      if (typeof oldest === 'string') this.primitives.delete(oldest)
    }
    this.primitives.set(geometryKey, vertices)
    return vertices
  }
}

const defaultCache = new SnapAnchorCache()

function findPart(model: Pick<MoldaModelAsset, 'parts'>, id: string): MoldaPart | undefined {
  return model.parts.find((part) => part.id === id)
}

function canonicalPartIds(
  model: Pick<MoldaModelAsset, 'parts'>,
  ids: readonly string[],
): string[] | null {
  const unique = new Set<string>()
  for (const id of ids) {
    const part = findPart(model, id)
    if (!part) return null
    unique.add(resolveSourceId(model, id))
  }
  return [...unique]
}

function selectionCenter(
  model: Pick<MoldaModelAsset, 'parts'>,
  partIds: readonly string[],
): Vec3 | null {
  const center: Vec3 = [0, 0, 0]
  for (const id of partIds) {
    const part = findPart(model, id)
    if (!part) return null
    const pivot = partPivot(part)
    center[0] += pivot[0]
    center[1] += pivot[1]
    center[2] += pivot[2]
  }
  if (partIds.length === 0) return null
  return [center[0] / partIds.length, center[1] / partIds.length, center[2] / partIds.length]
}

function partAnchors(part: MoldaPart, cache: SnapAnchorCache, includePivot: boolean): SnapAnchor[] {
  const matrix = partMatrix(part)
  const anchors: SnapAnchor[] = cache.localVertices(part).map(({ key, point }) => ({
    ref: { kind: 'vertex' as const, partId: part.id, vertexKey: key },
    point: transformPoint(matrix, point),
  }))
  if (includePivot)
    anchors.push({ ref: { kind: 'pivot', partId: part.id }, point: partPivot(part) })
  return anchors
}

function uniqueAnchors(anchors: readonly SnapAnchor[]): SnapAnchor[] {
  const seen = new Set<string>()
  return anchors.filter((anchor) => {
    const key = coordinateKey(anchor.point)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Vértices e pivô da peça principal, mais o centro das peças que viajarão juntas. */
export function snapSourceAnchors(
  model: Pick<MoldaModelAsset, 'parts'>,
  primaryId: string,
  selectedIds: readonly string[],
  cache = defaultCache,
): SnapAnchor[] {
  const primary = findPart(model, primaryId)
  const movingIds = canonicalPartIds(model, selectedIds)
  if (!primary || primary.hidden || !movingIds) return []
  const sourceId = resolveSourceId(model, primaryId)
  const source = findPart(model, sourceId)
  if (!source || source.hidden || !movingIds.includes(sourceId)) return []
  const movingParts = movingIds.map((id) => findPart(model, id))
  if (movingParts.some((part) => !part || part.locked)) return []

  const anchors = partAnchors(source, cache, true)
  const center = selectionCenter(model, movingIds)
  if (center) {
    anchors.push({ ref: { kind: 'selection-center', partIds: movingIds }, point: center })
  }
  return uniqueAnchors(anchors)
}

function movingAndTwinIds(
  model: Pick<MoldaModelAsset, 'parts'>,
  movingIds: readonly string[],
): Set<string> | null {
  const sourceIds = canonicalPartIds(model, movingIds)
  if (!sourceIds) return null
  const blocked = new Set(sourceIds)
  for (const part of model.parts) {
    if (part.mirrorOf && blocked.has(part.mirrorOf)) blocked.add(part.id)
  }
  return blocked
}

/** Âncoras só da peça que o raio tocou; alvos trancados continuam válidos. */
export function snapTargetAnchors(
  model: Pick<MoldaModelAsset, 'parts'>,
  targetId: string,
  movingIds: readonly string[],
  cache = defaultCache,
): SnapAnchor[] {
  const target = findPart(model, targetId)
  const blocked = movingAndTwinIds(model, movingIds)
  if (!target || target.hidden || !blocked || blocked.has(target.id)) return []
  return uniqueAnchors(partAnchors(target, cache, true))
}

/** Resolve contra a geometria ATUAL; `null` identifica uma referência velha. */
export function resolveSnapAnchor(
  model: Pick<MoldaModelAsset, 'parts'>,
  ref: SnapAnchorRef,
  cache = defaultCache,
): Vec3 | null {
  if (ref.kind === 'selection-center') return selectionCenter(model, ref.partIds)
  const part = findPart(model, ref.partId)
  if (!part) return null
  if (ref.kind === 'pivot') return partPivot(part)
  const local = cache.localVertices(part).find((vertex) => vertex.key === ref.vertexKey)
  return local ? transformPoint(partMatrix(part), local.point) : null
}

export type SnapMoveFailure =
  | 'invalid-source'
  | 'locked-source'
  | 'invalid-target'
  | 'stale-anchor'
  | 'outside-grid'
  | 'mirror-failure'
  | 'no-move'

export type SnapMoveResult =
  | { ok: true; model: MoldaModelAsset; movedIds: string[]; delta: Vec3 }
  | { ok: false; reason: SnapMoveFailure }

function anchorBelongsToMovingGroup(ref: SnapAnchorRef, movingIds: readonly string[]): boolean {
  if (ref.kind === 'selection-center') {
    return (
      ref.partIds.length === movingIds.length && ref.partIds.every((id) => movingIds.includes(id))
    )
  }
  return movingIds.includes(ref.partId)
}

function roundedDelta(source: Vec3, target: Vec3): Vec3 {
  return source.map((value, axis) => {
    const raw = (target[axis] as number) - value
    const rounded =
      Math.round(raw / MOLDA_LIMITS.positionPrecision) * MOLDA_LIMITS.positionPrecision
    return Object.is(rounded, -0) ? 0 : rounded
  }) as Vec3
}

/**
 * Revalida tudo e só então move. Qualquer falha devolve apenas um motivo, sem
 * publicar o modelo intermediário produzido pela tentativa.
 */
export function applySnapMove(
  model: MoldaModelAsset,
  selectedIds: readonly string[],
  sourceRef: SnapAnchorRef,
  targetRef: SnapAnchorRef,
  cache = defaultCache,
): SnapMoveResult {
  const movingIds = canonicalPartIds(model, selectedIds)
  if (!movingIds || movingIds.length === 0 || !anchorBelongsToMovingGroup(sourceRef, movingIds)) {
    return { ok: false, reason: 'invalid-source' }
  }
  const movingParts = movingIds.map((id) => findPart(model, id))
  if (movingParts.some((part) => !part)) return { ok: false, reason: 'invalid-source' }
  if (movingParts.some((part) => part?.locked)) return { ok: false, reason: 'locked-source' }

  if (targetRef.kind === 'selection-center') return { ok: false, reason: 'invalid-target' }
  const target = findPart(model, targetRef.partId)
  const blocked = movingAndTwinIds(model, movingIds)
  if (!target || target.hidden || !blocked || blocked.has(target.id)) {
    return { ok: false, reason: 'invalid-target' }
  }

  const sourcePoint = resolveSnapAnchor(model, sourceRef, cache)
  const targetPoint = resolveSnapAnchor(model, targetRef, cache)
  if (!sourcePoint || !targetPoint) return { ok: false, reason: 'stale-anchor' }
  const delta = roundedDelta(sourcePoint, targetPoint)
  if (delta.every((value) => value === 0)) return { ok: false, reason: 'no-move' }

  for (const part of movingParts) {
    if (
      !part ||
      !boxInsideGrid({
        from: [part.from[0] + delta[0], part.from[1] + delta[1], part.from[2] + delta[2]],
        to: [part.to[0] + delta[0], part.to[1] + delta[1], part.to[2] + delta[2]],
      })
    ) {
      return { ok: false, reason: 'outside-grid' }
    }
  }

  const moved = movePartsBy(model, movingIds, delta)
  if (moved === model || moved.mirrorX !== model.mirrorX) {
    return { ok: false, reason: 'mirror-failure' }
  }
  for (const id of movingIds) {
    const before = findPart(model, id)
    const after = findPart(moved, id)
    if (
      !before ||
      !after ||
      after.from.some(
        (value, axis) =>
          Math.abs(value - ((before.from[axis] as number) + (delta[axis] as number))) > 1e-9,
      )
    ) {
      return { ok: false, reason: 'mirror-failure' }
    }
  }
  return { ok: true, model: moved, movedIds: movingIds, delta }
}
