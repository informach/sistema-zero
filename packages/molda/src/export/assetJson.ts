/**
 * Criação ⇄ JSON. O único ponto em que os `Uint8Array` das peles viram base64
 * (backup `.molda.json`, nuvem). A volta passa pelo `sanitizeMoldaAsset`, que
 * aceita `data` em base64: um só portão para tudo que entra.
 */
import type { MoldaAsset, MoldaPart, MoldaSkin } from '../core/model'
import { sanitizeMoldaAsset } from '../core/sanitize'
import { bytesToBase64 } from '../core/skinCodec'

export interface MoldaSkinJson {
  width: number
  height: number
  /** base64 dos índices (1 byte por texel). */
  data: string
}

/** A criação com toda pele em base64. Estruturalmente igual ao asset no resto. */
export type MoldaAssetJson = Record<string, unknown> & { kind: MoldaAsset['kind']; id: string }

function skinToJson(skin: MoldaSkin): MoldaSkinJson {
  return { width: skin.width, height: skin.height, data: bytesToBase64(skin.data) }
}

function partToJson(part: MoldaPart): Record<string, unknown> {
  const faces: Record<string, MoldaSkinJson> = {}
  for (const [face, skin] of Object.entries(part.faces)) if (skin) faces[face] = skinToJson(skin)
  return { ...part, faces }
}

export function assetToJson(asset: MoldaAsset): MoldaAssetJson {
  switch (asset.kind) {
    case 'model':
      return { ...asset, parts: asset.parts.map(partToJson) }
    case 'texture':
      return { ...asset, bitmap: skinToJson(asset.bitmap) }
    case 'sky':
      return { ...asset, params: { ...asset.params, clouds: { ...asset.params.clouds } } }
  }
}

/** Nunca lança: `null` quando o JSON não é uma criação legível. */
export function assetFromJson(raw: unknown): MoldaAsset | null {
  try {
    return sanitizeMoldaAsset(raw)
  } catch {
    return null
  }
}
