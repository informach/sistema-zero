/**
 * Bytes aproximados de uma criação — o payload dominante são as peles. Alimenta
 * o orçamento do desfazer (snapshots) e o orçamento local da galeria.
 */
import type { MoldaAsset, MoldaPart } from './model'

const PART_BASE_BYTES = 160

export function partBytes(part: MoldaPart): number {
  let bytes = PART_BASE_BYTES
  for (const skin of Object.values(part.faces)) if (skin) bytes += skin.data.byteLength + 16
  return bytes
}

export function assetBytes(asset: MoldaAsset): number {
  const thumb = asset.thumb ? asset.thumb.length : 0
  switch (asset.kind) {
    case 'model':
      return asset.parts.reduce((sum, part) => sum + partBytes(part), 256 + thumb)
    case 'texture':
      return asset.bitmap.data.byteLength + 64 + thumb
    case 'sky':
      return 512 + thumb
  }
}
