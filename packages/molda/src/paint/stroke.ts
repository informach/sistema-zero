/**
 * Pintura no MODELO, pura: cada função devolve um asset novo (structural
 * sharing: só a peça e a pele tocadas mudam). O palco encadeia os segmentos
 * de um gesto e entrega o resultado UMA vez ao editor (`commitGesture`).
 *
 * - `paintSegment`: carimbo no primeiro toque, linha de Bresenham nos toques
 *   seguintes na MESMA face (face diferente começa outro segmento).
 * - `fillFace`: balde na face (face sem pele ganha uma inteira da cor).
 * - `sampleColor`: conta-gotas (texel 0 = a cor base da peça).
 * - `finishStroke`: pele que ficou toda 0 sai do asset (é a cor base).
 */
import type { FaceId, MoldaModelAsset, MoldaPart } from '../core/model'
import type { TexelHit } from '../model/pick'
import { faceSkinSize } from '../model/shapes'
import { createSkin, isSkinBlank } from '../model/skinOps'
import { syncTwins } from '../model/twins'
import { type BrushSize, floodFillSkin, lineTexels, paintSkin, type Texel } from './skinPaint'

export type PaintTool = 'pencil' | 'eraser' | 'fillFace' | 'fillPart' | 'picker'

export interface PaintSettings {
  tool: PaintTool
  /** Índice da paleta (o lápis); a borracha pinta 0. */
  color: number
  size: BrushSize
  /** Espelho de pintura: cada toque pinta também o ponto espelhado em x = 0. */
  mirror: boolean
}

function replacePart(model: MoldaModelAsset, next: MoldaPart): MoldaModelAsset {
  return { ...model, parts: model.parts.map((part) => (part.id === next.id ? next : part)) }
}

function withFace(part: MoldaPart, face: FaceId, skin: MoldaPart['faces'][FaceId]): MoldaPart {
  const faces = { ...part.faces }
  if (skin) faces[face] = skin
  else delete faces[face]
  return { ...part, faces }
}

/** A pele da face existe (nova = toda 0, no tamanho da face). */
export function ensureFaceSkin(
  model: MoldaModelAsset,
  partId: string,
  face: FaceId,
): MoldaModelAsset {
  const part = model.parts.find((item) => item.id === partId)
  if (!part || part.mirrorOf || part.faces[face]) return model
  const size = faceSkinSize(part, face, model.texelsPerUnit)
  if (!size) return model
  return replacePart(model, withFace(part, face, createSkin(size.width, size.height)))
}

/** Um segmento do gesto: carimbo em `to`, ou linha `from → to` na mesma face. */
export function paintSegment(
  model: MoldaModelAsset,
  from: TexelHit | null,
  to: TexelHit,
  color: number,
  size: BrushSize,
): MoldaModelAsset {
  const ensured = ensureFaceSkin(model, to.partId, to.face)
  const part = ensured.parts.find((item) => item.id === to.partId)
  const skin = part?.faces[to.face]
  if (!part || !skin) return model
  const sameFace = from !== null && from.partId === to.partId && from.face === to.face
  const texels: Texel[] = sameFace && from ? lineTexels(from.x, from.y, to.x, to.y) : [[to.x, to.y]]
  const painted = paintSkin(skin, texels, color, size)
  if (painted === skin) return ensured
  return replacePart(ensured, withFace(part, to.face, painted))
}

export function fillFace(model: MoldaModelAsset, hit: TexelHit, color: number): MoldaModelAsset {
  const ensured = ensureFaceSkin(model, hit.partId, hit.face)
  const part = ensured.parts.find((item) => item.id === hit.partId)
  const skin = part?.faces[hit.face]
  if (!part || !skin) return model
  const filled = floodFillSkin(skin, hit.x, hit.y, color)
  if (filled === skin) return ensured
  return replacePart(ensured, withFace(part, hit.face, filled))
}

/** Conta-gotas: o índice sob o texel; 0 (ou face sem pele) = a cor base da peça. */
export function sampleColor(model: Pick<MoldaModelAsset, 'parts'>, hit: TexelHit): number {
  const part = model.parts.find((item) => item.id === hit.partId)
  if (!part) return 1
  const skin = part.faces[hit.face]
  const index = skin ? (skin.data[hit.y * skin.width + hit.x] ?? 0) : 0
  return index === 0 ? part.color : index
}

/** Fim do gesto: peles todas 0 saem (voltam a ser "só a cor base"). */
export function finishStroke(model: MoldaModelAsset): MoldaModelAsset {
  let changed = false
  const parts = model.parts.map((part) => {
    if (part.mirrorOf) return part
    let next = part
    for (const face of Object.keys(part.faces) as FaceId[]) {
      const skin = part.faces[face]
      if (skin && isSkinBlank(skin)) {
        next = withFace(next, face, undefined)
        changed = true
      }
    }
    return next
  })
  return changed ? syncTwins({ ...model, parts }) : model
}
