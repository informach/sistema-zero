/**
 * As OPERAÇÕES sobre o modelo, puras: cada uma devolve um asset novo (nunca
 * muta o anterior; é o que o histórico por snapshots exige) e termina em
 * `syncTwins`, para os gêmeos nunca desandarem. A UI só chama daqui.
 */
import { COPY } from '../core/copy'
import { newId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import {
  createPart,
  type FaceId,
  type MoldaModelAsset,
  type MoldaPart,
  type ShapeId,
  type Vec3,
} from '../core/model'
import { normalizePartName } from '../core/names'
import { firstPaintableIndex, PALETTE_SIZE } from '../core/palette'
import { normalizeBox, normalizeRotation, resolvePaletteColors } from '../core/sanitize'
import { faceSkinSize, partSize } from './shapes'
import { resampleSkin } from './skinOps'
import { bakeTwins, syncTwins } from './twins'

export const DEFAULT_PART_SIZE: Record<ShapeId, Vec3> = {
  box: [2, 2, 2],
  wedge: [2, 1, 2],
  cylinder: [2, 2, 2],
  sphere: [2, 2, 2],
}

export interface Box {
  from: Vec3
  to: Vec3
}

/** Interseção ESTRITA de caixas alinhadas (encostar não é sobrepor). */
export function boxesOverlap(a: Box, b: Box): boolean {
  for (let i = 0; i < 3; i += 1) {
    if (
      !((a.from[i] as number) < (b.to[i] as number) && (a.to[i] as number) > (b.from[i] as number))
    ) {
      return false
    }
  }
  return true
}

export function boxInsideGrid(box: Box): boolean {
  const half = MOLDA_LIMITS.gridHalf
  return (
    box.from[0] >= -half &&
    box.to[0] <= half &&
    box.from[1] >= 0 &&
    box.to[1] <= MOLDA_LIMITS.gridHeight &&
    box.from[2] >= -half &&
    box.to[2] <= half
  )
}

function boxAt(from: Vec3, size: Vec3): Box {
  return { from, to: [from[0] + size[0], from[1] + size[1], from[2] + size[2]] }
}

function isFree(model: MoldaModelAsset, box: Box): boolean {
  return boxInsideGrid(box) && !model.parts.some((part) => boxesOverlap(part, box))
}

/**
 * O primeiro vão livre para uma caixa deste tamanho: encostada na peça de
 * referência (direita, esquerda, frente, trás, em cima), senão o chão em
 * espiral a partir do centro. Sem vão nenhum, o centro do chão (sobreposto).
 */
export function findFreeSpot(model: MoldaModelAsset, size: Vec3, near: MoldaPart | null): Box {
  if (near) {
    const [w, , d] = size
    const candidates: Vec3[] = [
      [near.to[0], near.from[1], near.from[2]],
      [near.from[0] - w, near.from[1], near.from[2]],
      [near.from[0], near.from[1], near.to[2]],
      [near.from[0], near.from[1], near.from[2] - d],
      [near.from[0], near.to[1], near.from[2]],
    ]
    for (const from of candidates) {
      const box = boxAt(from, size)
      if (isFree(model, box)) return box
    }
  }
  const [w, , d] = size
  const centerFrom: Vec3 = [-Math.round(w / 2), 0, -Math.round(d / 2)]
  for (let radius = 0; radius <= MOLDA_LIMITS.gridHalf; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue
        const box = boxAt([centerFrom[0] + dx, 0, centerFrom[2] + dz], size)
        if (isFree(model, box)) return box
      }
    }
  }
  return boxAt(centerFrom, size)
}

function shapeBaseName(shape: ShapeId): string {
  return COPY.shapes[shape].toLowerCase()
}

/** `caixa`, `caixa 2`, `caixa 3`... (respeita o teto de chars da peça). */
export function nextPartName(model: Pick<MoldaModelAsset, 'parts'>, base: string): string {
  const taken = new Set(model.parts.map((part) => part.name))
  if (!taken.has(base)) return base
  for (let n = 2; n < 1000; n += 1) {
    const suffix = ` ${n}`
    const candidate = `${base.slice(0, MOLDA_LIMITS.maxPartNameChars - suffix.length)}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return base
}

export function findPart(model: Pick<MoldaModelAsset, 'parts'>, id: string): MoldaPart | undefined {
  return model.parts.find((part) => part.id === id)
}

/** A peça que se edita de verdade: o gêmeo aponta para a fonte. */
export function resolveSourceId(model: Pick<MoldaModelAsset, 'parts'>, id: string): string {
  const part = findPart(model, id)
  return part?.mirrorOf ?? id
}

function replacePart(model: MoldaModelAsset, next: MoldaPart): MoldaModelAsset {
  return { ...model, parts: model.parts.map((part) => (part.id === next.id ? next : part)) }
}

export interface AddResult {
  model: MoldaModelAsset
  partId: string
}

interface AddOptions {
  nearId?: string | null
  color?: number
}

function addPartInBox(
  model: MoldaModelAsset,
  shape: ShapeId,
  box: Box,
  options: AddOptions,
): AddResult {
  const near = options.nearId
    ? (findPart(model, resolveSourceId(model, options.nearId)) ?? null)
    : null
  const colors = resolvePaletteColors(model)
  const color = options.color ?? near?.color ?? firstPaintableIndex(colors)
  const part = createPart({
    name: nextPartName(model, shapeBaseName(shape)),
    shape,
    from: box.from,
    to: box.to,
    color,
  })
  const next = { ...model, parts: [...model.parts, part] }
  return { model: syncTwins(next), partId: part.id }
}

/** `null` = teto de peças. */
export function addPart(
  model: MoldaModelAsset,
  shape: ShapeId,
  options: AddOptions = {},
): AddResult | null {
  if (model.parts.length >= MOLDA_LIMITS.maxParts) return null
  const near = options.nearId
    ? (findPart(model, resolveSourceId(model, options.nearId)) ?? null)
    : null
  const size = DEFAULT_PART_SIZE[shape]
  const spot = findFreeSpot(model, size, near)
  return addPartInBox(model, shape, spot, options)
}

/**
 * Adiciona uma peça encostada na superfície tocada. O eixo dominante da
 * normal decide o lado; nos outros eixos a peça fica centralizada no toque.
 * Se o ponto não produzir um vão livre (por exemplo numa face girada), cai no
 * primeiro vão livre perto da peça tocada.
 */
export function addPartAtSurface(
  model: MoldaModelAsset,
  shape: ShapeId,
  point: Vec3,
  normal: Vec3,
  options: AddOptions = {},
): AddResult | null {
  if (model.parts.length >= MOLDA_LIMITS.maxParts) return null
  const size = DEFAULT_PART_SIZE[shape]
  const axis = [0, 1, 2].reduce((best, index) =>
    Math.abs(normal[index] as number) > Math.abs(normal[best] as number) ? index : best,
  )
  const from: Vec3 = [0, 0, 0]
  for (let index = 0; index < 3; index += 1) {
    const coordinate = point[index] as number
    const length = size[index] as number
    if (index === axis) {
      from[index] =
        (normal[index] as number) >= 0
          ? Math.ceil(coordinate / model.snap) * model.snap
          : Math.floor(coordinate / model.snap) * model.snap - length
    } else {
      from[index] = Math.round((coordinate - length / 2) / model.snap) * model.snap
    }
  }
  const requested = normalizeBox(from, boxAt(from, size).to, model.snap)
  const near = options.nearId
    ? (findPart(model, resolveSourceId(model, options.nearId)) ?? null)
    : null
  const spot = isFree(model, requested) ? requested : findFreeSpot(model, size, near)
  return addPartInBox(model, shape, spot, options)
}

/** Apaga a peça (e o gêmeo dela, se houver). */
export function removePart(model: MoldaModelAsset, id: string): MoldaModelAsset {
  return syncTwins({
    ...model,
    parts: model.parts.filter((part) => part.id !== id && part.mirrorOf !== id),
  })
}

/** Cópia da peça (peles inclusas) no primeiro vão livre ao lado. `null` = teto. */
export function duplicatePart(model: MoldaModelAsset, id: string): AddResult | null {
  if (model.parts.length >= MOLDA_LIMITS.maxParts) return null
  const source = findPart(model, resolveSourceId(model, id))
  if (!source) return null
  const size = partSize(source)
  const spot = findFreeSpot(model, size, source)
  const copy = structuredClone(source)
  copy.id = newId()
  copy.name = nextPartName(model, source.name.replace(/ \d+$/, ''))
  copy.from = spot.from
  copy.to = spot.to
  if (copy.origin) {
    const delta: Vec3 = [
      spot.from[0] - source.from[0],
      spot.from[1] - source.from[1],
      spot.from[2] - source.from[2],
    ]
    copy.origin = [copy.origin[0] + delta[0], copy.origin[1] + delta[1], copy.origin[2] + delta[2]]
  }
  delete copy.mirrorOf
  const next = { ...model, parts: [...model.parts, copy] }
  return { model: syncTwins(next), partId: copy.id }
}

/** Re-amostra as peles para o tamanho novo da caixa (a pintura acompanha). */
export function resizePartSkins(part: MoldaPart, texelsPerUnit: number): MoldaPart['faces'] {
  const faces: MoldaPart['faces'] = {}
  for (const face of Object.keys(part.faces) as FaceId[]) {
    const skin = part.faces[face]
    const size = faceSkinSize(part, face, texelsPerUnit)
    if (!skin || !size) continue
    faces[face] = resampleSkin(skin, size.width, size.height)
  }
  return faces
}

/** Caixa nova (arredondada ao encaixe e dentro da grade), pivô clampado e peles re-amostradas. */
export function setPartBox(
  model: MoldaModelAsset,
  id: string,
  from: Vec3,
  to: Vec3,
): MoldaModelAsset {
  const part = findPart(model, id)
  if (!part || part.mirrorOf) return model
  const box = normalizeBox(from, to, model.snap)
  const sizeBefore = partSize(part)
  const sizeAfter = partSize(box)
  const sameSize =
    sizeBefore[0] === sizeAfter[0] &&
    sizeBefore[1] === sizeAfter[1] &&
    sizeBefore[2] === sizeAfter[2]
  const next: MoldaPart = { ...part, from: box.from, to: box.to }
  if (!sameSize) next.faces = resizePartSkins(next, model.texelsPerUnit)
  if (part.origin) {
    if (sameSize) {
      // Moveu: o pivô vai junto.
      next.origin = [
        part.origin[0] + (box.from[0] - part.from[0]),
        part.origin[1] + (box.from[1] - part.from[1]),
        part.origin[2] + (box.from[2] - part.from[2]),
      ]
    } else {
      next.origin = [
        Math.min(Math.max(part.origin[0], box.from[0]), box.to[0]),
        Math.min(Math.max(part.origin[1], box.from[1]), box.to[1]),
        Math.min(Math.max(part.origin[2], box.from[2]), box.to[2]),
      ]
    }
  }
  return syncTwins(replacePart(model, next))
}

export function movePartBy(model: MoldaModelAsset, id: string, delta: Vec3): MoldaModelAsset {
  const part = findPart(model, id)
  if (!part) return model
  return setPartBox(
    model,
    id,
    [part.from[0] + delta[0], part.from[1] + delta[1], part.from[2] + delta[2]],
    [part.to[0] + delta[0], part.to[1] + delta[1], part.to[2] + delta[2]],
  )
}

/** Tamanho novo ancorado em `from` (o canto de trás, embaixo, à esquerda). */
export function setPartSize(model: MoldaModelAsset, id: string, size: Vec3): MoldaModelAsset {
  const part = findPart(model, id)
  if (!part) return model
  return setPartBox(model, id, part.from, [
    part.from[0] + size[0],
    part.from[1] + size[1],
    part.from[2] + size[2],
  ])
}

export interface PartPatch {
  name?: string
  color?: number
  rotation?: Vec3
  origin?: Vec3 | null
}

export function updatePart(model: MoldaModelAsset, id: string, patch: PartPatch): MoldaModelAsset {
  const part = findPart(model, id)
  if (!part || part.mirrorOf) return model
  const next: MoldaPart = { ...part }
  if (patch.name !== undefined) next.name = normalizePartName(patch.name, part.name)
  if (patch.color !== undefined) {
    const colors = resolvePaletteColors(model)
    next.color =
      Number.isInteger(patch.color) &&
      patch.color > 0 &&
      patch.color < colors.length &&
      colors[patch.color]
        ? patch.color
        : part.color
  }
  if (patch.rotation !== undefined) next.rotation = normalizeRotation(patch.rotation)
  if (patch.origin === null) delete next.origin
  else if (patch.origin) {
    next.origin = [
      Math.min(Math.max(patch.origin[0], part.from[0]), part.to[0]),
      Math.min(Math.max(patch.origin[1], part.from[1]), part.to[1]),
      Math.min(Math.max(patch.origin[2], part.from[2]), part.to[2]),
    ]
  }
  return syncTwins(replacePart(model, next))
}

/**
 * Liga/desliga o espelho de modelagem. Ligar cria o gêmeo de toda peça
 * própria que não cruza x = 0 (até o teto de peças); desligar ASSA os gêmeos
 * em peças próprias, com a pele que mostravam.
 */
export function setMirrorX(model: MoldaModelAsset, on: boolean): MoldaModelAsset {
  if (!on) return { ...bakeTwins(model), mirrorX: false }
  return syncTwins({ ...model, mirrorX: true })
}

export function setSnap(model: MoldaModelAsset, snap: MoldaModelAsset['snap']): MoldaModelAsset {
  if (snap === model.snap) return model
  let next: MoldaModelAsset = { ...model, snap }
  const sourceIds = model.parts.filter((part) => !part.mirrorOf).map((part) => part.id)
  for (const id of sourceIds) {
    const part = findPart(next, id)
    if (part) next = setPartBox(next, id, part.from, part.to)
  }
  return next
}

/** Cor extra nova (índice ≥ 16). `null` = teto ou já existe (devolve o índice existente). */
export function addExtraColor(
  model: MoldaModelAsset,
  hex: string,
): { model: MoldaModelAsset; index: number } | null {
  const colors = resolvePaletteColors(model)
  const existing = colors.indexOf(hex)
  if (existing > 0) return { model, index: existing }
  const extras = model.extraColors ?? []
  if (extras.length >= MOLDA_LIMITS.maxExtraColors) return null
  const next: MoldaModelAsset = { ...model, extraColors: [...extras, hex] }
  return { model: next, index: colors.length }
}

/** Troca a resolução das peles: toda pele é re-amostrada para o tamanho novo. */
export function setTexelsPerUnit(
  model: MoldaModelAsset,
  texelsPerUnit: MoldaModelAsset['texelsPerUnit'],
): MoldaModelAsset {
  if (texelsPerUnit === model.texelsPerUnit) return model
  const parts = model.parts.map((part) =>
    part.mirrorOf ? part : { ...part, faces: resizePartSkins(part, texelsPerUnit) },
  )
  return syncTwins({ ...model, texelsPerUnit, parts })
}

/**
 * Apaga uma cor EXTRA (índice ≥ 16): texels dessa cor voltam ao 0 (cor base),
 * as extras seguintes descem 1 em toda pele e em toda cor de peça; peça que
 * era dessa cor cai na primeira pintável. `null` para as 16 fixas.
 */
export function removeExtraColor(model: MoldaModelAsset, index: number): MoldaModelAsset | null {
  const extras = model.extraColors ?? []
  const first = PALETTE_SIZE
  if (index < first || index >= first + extras.length) return null
  const nextExtras = extras.filter((_hex, i) => i !== index - first)
  const base: MoldaModelAsset = { ...model }
  if (nextExtras.length > 0) base.extraColors = nextExtras
  else delete base.extraColors
  const colors = resolvePaletteColors(base)
  const remap = (value: number): number => (value === index ? 0 : value > index ? value - 1 : value)
  const parts = model.parts.map((part) => {
    if (part.mirrorOf) return part
    const faces: MoldaPart['faces'] = {}
    for (const face of Object.keys(part.faces) as FaceId[]) {
      const skin = part.faces[face]
      if (!skin) continue
      const data = new Uint8Array(skin.data.length)
      for (let i = 0; i < data.length; i += 1) data[i] = remap(skin.data[i] ?? 0)
      faces[face] = { width: skin.width, height: skin.height, data }
    }
    const color = part.color === index ? firstPaintableIndex(colors) : remap(part.color)
    return { ...part, color, faces }
  })
  return syncTwins({ ...base, parts })
}
