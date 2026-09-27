/**
 * Criação ⇄ JSON. O único ponto em que os `Uint8Array` das peles viram base64
 * (backup `.molda.json`, nuvem). A volta passa pelo `sanitizeMoldaAsset`, que
 * aceita `data` em base64: um só portão para tudo que entra.
 */

import { readMoldaDocument } from '../core/documentReader'
import { assertMoldaDocumentWritable, MOLDA_DOCUMENT_WRITE_VERSION } from '../core/documentVersion'
import type {
  FaceId,
  MoldaAsset,
  MoldaModelAsset,
  MoldaPart,
  MoldaSkin,
  MoldaSkyAsset,
  MoldaTextureAsset,
} from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'

export interface MoldaSkinJson {
  width: number
  height: number
  /** base64 dos índices (1 byte por texel). */
  data: string
}

export type MoldaPartJson = Omit<MoldaPart, 'faces'> & {
  faces: Partial<Record<FaceId, MoldaSkinJson>>
}

/** v1 is a fixed wire contract, not an alias of whichever writer is active later. */
export type MoldaModelJson = Omit<MoldaModelAsset, 'parts'> & {
  formatVersion: 1
  parts: MoldaPartJson[]
}
export type MoldaTextureJson = Omit<MoldaTextureAsset, 'bitmap'> & {
  formatVersion: 1
  bitmap: MoldaSkinJson
}
export type MoldaSkyJson = MoldaSkyAsset & { formatVersion: 1 }
/** Discriminated native JSON: every kind carries its own required format version. */
export type MoldaAssetJson = MoldaModelJson | MoldaTextureJson | MoldaSkyJson

function skinToJson(skin: MoldaSkin): MoldaSkinJson {
  return { width: skin.width, height: skin.height, data: bytesToBase64(skin.data) }
}

function partToJson(part: MoldaPart): MoldaPartJson {
  const faces: Partial<Record<FaceId, MoldaSkinJson>> = {}
  // Object.entries loses the known face-key type, so build the record from the same keys.
  for (const face of Object.keys(part.faces) as FaceId[]) {
    const skin = part.faces[face]
    if (skin) faces[face] = skinToJson(skin)
  }
  return { ...part, faces }
}

export function assetToJson(asset: MoldaModelAsset): MoldaModelJson
export function assetToJson(asset: MoldaTextureAsset): MoldaTextureJson
export function assetToJson(asset: MoldaSkyAsset): MoldaSkyJson
export function assetToJson(asset: MoldaAsset): MoldaAssetJson
export function assetToJson(asset: MoldaAsset): MoldaAssetJson {
  assertMoldaDocumentWritable(asset)
  switch (asset.kind) {
    case 'model':
      return {
        ...asset,
        formatVersion: MOLDA_DOCUMENT_WRITE_VERSION,
        parts: asset.parts.map(partToJson),
      }
    case 'texture':
      return {
        ...asset,
        formatVersion: MOLDA_DOCUMENT_WRITE_VERSION,
        bitmap: skinToJson(asset.bitmap),
      }
    case 'sky':
      return {
        ...asset,
        formatVersion: MOLDA_DOCUMENT_WRITE_VERSION,
        params: { ...asset.params, clouds: { ...asset.params.clouds } },
      }
  }
}

/** Nunca lança: `null` quando o JSON não é uma criação legível. */
export function assetFromJson(raw: unknown): MoldaAsset | null {
  const result = readMoldaDocument(raw)
  return result.status === 'valid' ? result.asset : null
}
