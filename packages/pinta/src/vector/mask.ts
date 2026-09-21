/** Relações puras de máscara geométrica do editor vetorial. */
import { flattenPathD } from './flatten'
import type { VectorShape } from './model'

export type MaskRefusal =
  | 'needs-two'
  | 'locked'
  | 'unsupported-source'
  | 'already-masked'
  | 'nested-mask'

export type ApplyMaskResult =
  | { ok: true; shapes: VectorShape[]; maskId: string }
  | { ok: false; reason: MaskRefusal }

export interface MaskScene {
  /** Formas que de fato pintam, na ordem-Z original. Fontes usadas ficam só em `sources`. */
  painted: VectorShape[]
  /** Fontes necessárias para recortar algum conteúdo visível, indexadas pelo id persistido. */
  sources: ReadonlyMap<string, VectorShape>
}

/** Retângulo, elipse, polígono e todo caminho integralmente fechado podem recortar conteúdo. */
export function isMaskCapable(shape: VectorShape): boolean {
  if (shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'polygon') return true
  if (shape.type !== 'path') return false
  const paths = flattenPathD(shape.d)
  return Boolean(paths?.length && paths.every((path) => path.closed))
}

/** Ids que hoje são referenciados como fonte, preservando a ordem da primeira referência. */
export function maskSourceIds(shapes: readonly VectorShape[]): Set<string> {
  const sourceIds = new Set<string>()
  for (const shape of shapes) {
    if (shape.maskId) sourceIds.add(shape.maskId)
  }
  return sourceIds
}

/**
 * Unidade relacional de uma forma: fonte + todos os conteúdos que ela recorta.
 * Uma forma sem relação continua sendo uma unidade de um membro.
 */
export function maskMembers(shapes: readonly VectorShape[], shapeId: string): VectorShape[] {
  const selected = shapes.find((shape) => shape.id === shapeId)
  if (!selected) return []
  const sourceId = selected.maskId ?? (maskSourceIds(shapes).has(shapeId) ? shapeId : null)
  if (!sourceId) return [selected]
  return shapes.filter((shape) => shape.id === sourceId || shape.maskId === sourceId)
}

/** Aplica uma máscara usando como fonte a forma selecionada mais à frente no documento. */
export function applyMask(
  shapes: readonly VectorShape[],
  ids: readonly string[],
): ApplyMaskResult {
  const selectedIds = new Set(ids)
  const selected = shapes.filter((shape) => selectedIds.has(shape.id))
  if (selected.length < 2) return { ok: false, reason: 'needs-two' }
  if (selected.some((shape) => shape.locked === true)) return { ok: false, reason: 'locked' }
  if (selected.some((shape) => shape.maskId !== undefined)) {
    return { ok: false, reason: 'already-masked' }
  }

  const existingSources = maskSourceIds(shapes)
  if (selected.some((shape) => existingSources.has(shape.id))) {
    return { ok: false, reason: 'nested-mask' }
  }

  const source = selected[selected.length - 1]
  if (!source || !isMaskCapable(source)) return { ok: false, reason: 'unsupported-source' }

  return {
    ok: true,
    maskId: source.id,
    shapes: shapes.map((shape) =>
      selectedIds.has(shape.id) && shape.id !== source.id
        ? { ...shape, maskId: source.id }
        : shape,
    ),
  }
}

function withoutMaskId(shape: VectorShape): VectorShape {
  const { maskId: _maskId, ...rest } = shape
  return rest as VectorShape
}

/** Solta toda relação tocada por uma fonte ou por qualquer um de seus conteúdos. */
export function releaseMasks(
  shapes: readonly VectorShape[],
  ids: readonly string[],
): VectorShape[] | null {
  const selectedIds = new Set(ids)
  const sources = maskSourceIds(shapes)
  const release = new Set<string>()
  for (const shape of shapes) {
    if (!selectedIds.has(shape.id)) continue
    if (shape.maskId) release.add(shape.maskId)
    if (sources.has(shape.id)) release.add(shape.id)
  }
  if (release.size === 0) return null
  return shapes.map((shape) => (shape.maskId && release.has(shape.maskId) ? withoutMaskId(shape) : shape))
}

/**
 * Recupera relações vindas de disco/import sem esconder conteúdo. Uma relação
 * inválida é simplesmente solta; a forma e sua geometria sempre sobrevivem.
 */
export function sanitizeMaskReferences(shapes: VectorShape[]): VectorShape[] {
  const byId = new Map(shapes.map((shape) => [shape.id, shape]))
  return shapes.map((shape) => {
    if (!shape.maskId) return shape
    const source = byId.get(shape.maskId)
    const valid =
      source !== undefined &&
      source.id !== shape.id &&
      isMaskCapable(source) &&
      source.maskId === undefined
    return valid ? shape : withoutMaskId(shape)
  })
}

/** Cena resolvida uma vez para palco, miniaturas e todos os exportadores. */
export function resolveMaskScene(shapes: readonly VectorShape[]): MaskScene {
  const normalized = sanitizeMaskReferences([...shapes])
  const byId = new Map(normalized.map((shape) => [shape.id, shape]))
  const visibleContent = normalized.filter((shape) => shape.hidden !== true)
  const neededSourceIds = new Set(
    visibleContent.flatMap((shape) => (shape.maskId ? [shape.maskId] : [])),
  )
  const sources = new Map<string, VectorShape>()
  for (const id of neededSourceIds) {
    const source = byId.get(id)
    if (source) sources.set(id, source)
  }
  return {
    painted: visibleContent.filter((shape) => !neededSourceIds.has(shape.id)),
    sources,
  }
}

/** Id seguro e prefixável do `<clipPath>` correspondente a uma fonte. */
export function clipPathId(maskId: string, prefix = ''): string {
  return `${prefix}pin-mask-${maskId}`
}
