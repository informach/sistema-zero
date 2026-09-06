/**
 * Acabamentos automáticos para uma seleção de peças. Todas as operações são
 * transações puras: projetam o resultado inteiro, validam e só então devolvem
 * o modelo com os gêmeos sincronizados.
 */
import { newId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaModelAsset, MoldaPart, Vec3 } from '../core/model'
import { meshBox, translateMesh } from './mesh'
import { boxInsideGrid, findPart, nextPartName, resolveSourceId, setPartBoxes } from './partOps'
import { type Bounds, partBounds } from './transform'
import { partCrossesMirror, syncedTriangleCount, syncTwins } from './twins'

export type ArrangeFailureReason =
  | 'invalid-selection'
  | 'invalid-repeat'
  | 'locked'
  | 'outside-grid'
  | 'parts-full'
  | 'triangles-full'

export type ArrangeResult =
  | { ok: true; model: MoldaModelAsset }
  | { ok: false; reason: ArrangeFailureReason; model: MoldaModelAsset }

export type RepeatDirection = '+x' | '-x' | '+y' | '-y' | '+z' | '-z'

export type RepeatResult =
  | { ok: true; model: MoldaModelAsset; addedIds: string[] }
  | { ok: false; reason: ArrangeFailureReason; model: MoldaModelAsset }

interface SelectionResult {
  parts: MoldaPart[]
}

function selectedSources(model: MoldaModelAsset, ids: readonly string[]): SelectionResult | null {
  const parts: MoldaPart[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    const selected = findPart(model, id)
    if (!selected) return null
    const sourceId = resolveSourceId(model, id)
    if (seen.has(sourceId)) continue
    const source = findPart(model, sourceId)
    if (!source || source.mirrorOf) return null
    seen.add(sourceId)
    parts.push(source)
  }
  return parts.length > 0 ? { parts } : null
}

function selectionBounds(parts: readonly MoldaPart[]): Bounds {
  const min: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
  const max: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
  for (const part of parts) {
    const bounds = partBounds(part)
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis] as number, bounds.min[axis] as number)
      max[axis] = Math.max(max[axis] as number, bounds.max[axis] as number)
    }
  }
  return { min, max }
}

function precise(value: number): number {
  const precision = MOLDA_LIMITS.positionPrecision
  const rounded = Math.round(value / precision) * precision
  return Object.is(rounded, -0) ? 0 : rounded
}

function moveSelection(
  model: MoldaModelAsset,
  parts: readonly MoldaPart[],
  deltas: ReadonlyMap<string, Vec3>,
): ArrangeResult {
  if (parts.some((part) => part.locked)) return { ok: false, reason: 'locked', model }
  const patches = parts.map((part) => {
    const delta = deltas.get(part.id) ?? ([0, 0, 0] as Vec3)
    return {
      id: part.id,
      from: [
        precise(part.from[0] + delta[0]),
        precise(part.from[1] + delta[1]),
        precise(part.from[2] + delta[2]),
      ] as Vec3,
      to: [
        precise(part.to[0] + delta[0]),
        precise(part.to[1] + delta[1]),
        precise(part.to[2] + delta[2]),
      ] as Vec3,
    }
  })
  if (
    patches.every((patch, index) => {
      const part = parts[index] as MoldaPart
      return patch.from.every((value, axis) => value === part.from[axis])
    })
  ) {
    return { ok: true, model }
  }
  if (patches.some((patch) => !boxInsideGrid(patch))) {
    return { ok: false, reason: 'outside-grid', model }
  }
  const next = setPartBoxes(model, patches)
  return next === model ? { ok: false, reason: 'outside-grid', model } : { ok: true, model: next }
}

export function putPartsOnFloor(model: MoldaModelAsset, ids: readonly string[]): ArrangeResult {
  const selection = selectedSources(model, ids)
  if (!selection) return { ok: false, reason: 'invalid-selection', model }
  const delta: Vec3 = [0, precise(-selectionBounds(selection.parts).min[1]), 0]
  return moveSelection(
    model,
    selection.parts,
    new Map(selection.parts.map((part) => [part.id, delta] as const)),
  )
}

export function centerPartsOnStage(model: MoldaModelAsset, ids: readonly string[]): ArrangeResult {
  const selection = selectedSources(model, ids)
  if (!selection) return { ok: false, reason: 'invalid-selection', model }
  const bounds = selectionBounds(selection.parts)
  const delta: Vec3 = [
    precise(-(bounds.min[0] + bounds.max[0]) / 2),
    0,
    precise(-(bounds.min[2] + bounds.max[2]) / 2),
  ]
  return moveSelection(
    model,
    selection.parts,
    new Map(selection.parts.map((part) => [part.id, delta] as const)),
  )
}

export function alignParts(
  model: MoldaModelAsset,
  ids: readonly string[],
  axis: 'x' | 'y' | 'z',
): ArrangeResult {
  const selection = selectedSources(model, ids)
  if (!selection || selection.parts.length < 2) {
    return { ok: false, reason: 'invalid-selection', model }
  }
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
  const primaryBounds = partBounds(selection.parts[0] as MoldaPart)
  const target = (primaryBounds.min[axisIndex] + primaryBounds.max[axisIndex]) / 2
  const deltas = new Map<string, Vec3>()
  for (const [index, part] of selection.parts.entries()) {
    const delta: Vec3 = [0, 0, 0]
    if (index > 0) {
      const bounds = partBounds(part)
      delta[axisIndex] = precise(target - (bounds.min[axisIndex] + bounds.max[axisIndex]) / 2)
    }
    deltas.set(part.id, delta)
  }
  return moveSelection(model, selection.parts, deltas)
}

function uniqueId(taken: Set<string>): string {
  let id = newId()
  while (taken.has(id)) id = newId()
  taken.add(id)
  return id
}

function translatedCopy(
  source: MoldaPart,
  delta: Vec3,
  id: string,
  name: string,
): MoldaPart | null {
  const copy = structuredClone(source)
  copy.id = id
  copy.name = name
  copy.from = [source.from[0] + delta[0], source.from[1] + delta[1], source.from[2] + delta[2]]
  copy.to = [source.to[0] + delta[0], source.to[1] + delta[1], source.to[2] + delta[2]]
  if (copy.origin) {
    copy.origin = [copy.origin[0] + delta[0], copy.origin[1] + delta[1], copy.origin[2] + delta[2]]
  }
  if (copy.mesh) {
    copy.mesh = translateMesh(copy.mesh, delta)
    const box = meshBox(copy.mesh)
    if (!box) return null
    copy.from = box.from
    copy.to = box.to
  }
  delete copy.mirrorOf
  delete copy.locked
  delete copy.hidden
  return copy
}

function expectedPartCount(model: MoldaModelAsset): number {
  const sources = model.parts.filter((part) => !part.mirrorOf)
  if (!model.mirrorX) return sources.length
  return sources.length + sources.filter((part) => !partCrossesMirror(part)).length
}

/**
 * Cria de 1 a 8 cópias ADICIONAIS da seleção em uma linha. `gapSteps` mede
 * encaixes do modelo; zero faz uma repetição encostar na anterior.
 */
export function repeatPartsInLine(
  model: MoldaModelAsset,
  ids: readonly string[],
  options: { direction: RepeatDirection; count: number; gapSteps: number },
): RepeatResult {
  const selection = selectedSources(model, ids)
  if (!selection) return { ok: false, reason: 'invalid-selection', model }
  if (
    !Number.isInteger(options.count) ||
    options.count < 1 ||
    options.count > 8 ||
    !Number.isInteger(options.gapSteps) ||
    options.gapSteps < 0 ||
    options.gapSteps > 16
  ) {
    return { ok: false, reason: 'invalid-repeat', model }
  }

  const axis = options.direction.endsWith('x') ? 0 : options.direction.endsWith('y') ? 1 : 2
  const sign = options.direction.startsWith('+') ? 1 : -1
  const bounds = selectionBounds(selection.parts)
  const step = precise(bounds.max[axis] - bounds.min[axis] + options.gapSteps * model.snap)
  if (step <= 0) return { ok: false, reason: 'invalid-repeat', model }

  const taken = new Set(model.parts.map((part) => part.id))
  const additions: MoldaPart[] = []
  const addedIds: string[] = []
  for (let repetition = 1; repetition <= options.count; repetition += 1) {
    for (const source of selection.parts) {
      const delta: Vec3 = [0, 0, 0]
      delta[axis] = sign * step * repetition
      const nameBase = source.name.replace(/ \d+$/, '')
      const projected = { parts: [...model.parts, ...additions] }
      const copy = translatedCopy(source, delta, uniqueId(taken), nextPartName(projected, nameBase))
      if (!copy) return { ok: false, reason: 'invalid-selection', model }
      if (!boxInsideGrid(copy)) return { ok: false, reason: 'outside-grid', model }
      additions.push(copy)
      addedIds.push(copy.id)
    }
  }

  const projected = { ...model, parts: [...model.parts, ...additions] }
  if (expectedPartCount(projected) > MOLDA_LIMITS.maxParts) {
    return { ok: false, reason: 'parts-full', model }
  }
  if (syncedTriangleCount(projected) > MOLDA_LIMITS.maxTriangles) {
    return { ok: false, reason: 'triangles-full', model }
  }
  return { ok: true, model: syncTwins(projected), addedIds }
}
