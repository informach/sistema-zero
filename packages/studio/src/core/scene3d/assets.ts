import {
  isStudioPortablePath,
  isStudioPythonAssetPath,
} from '@sistemazero/core/studio/portable-path'
import {
  lerCenaParaStudio,
  MAX_BYTES_DA_CENA_PARA_STUDIO,
  MIME_DA_CENA_PARA_STUDIO,
  type PapelDoDado3D,
  PapelDoDado3DSchema,
} from '@sistemazero/molda-cenarios-core/studio'
import { decodeProjectAsset } from '../assetBinary'

export const MAX_BYTES_DO_DADO_3D = 5 * 1024 * 1024

export function isScene3DAssetKind(kind: unknown): kind is 'scene3d' | 'scene3d-data' {
  return kind === 'scene3d' || kind === 'scene3d-data'
}

/** A kind-aware exception, not a widening of the media/audio path contract. */
export function isPythonMaterialPath(path: unknown, kind?: string): path is string {
  if (!isScene3DAssetKind(kind)) return isStudioPythonAssetPath(path)
  return (
    typeof path === 'string' &&
    isStudioPortablePath(path) &&
    !path.split('/').some((p) => p.startsWith('.')) &&
    path.endsWith(kind === 'scene3d' ? '.json' : '.bin')
  )
}

export function readScene3DDataMetadata(value: unknown): { papel: PapelDoDado3D } | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== 1) return undefined
  const role = PapelDoDado3DSchema.safeParse(record.papel)
  return role.success ? { papel: role.data } : undefined
}

/** Closed encodings: these are compiler artifacts, never arbitrary executable attachments. */
export function isValidScene3DDataUrl(
  value: string,
  kind: 'scene3d' | 'scene3d-data',
  fileName?: string,
): boolean {
  const scene = kind === 'scene3d',
    maxBytes = scene ? MAX_BYTES_DA_CENA_PARA_STUDIO : MAX_BYTES_DO_DADO_3D,
    prefix = `data:${scene ? MIME_DA_CENA_PARA_STUDIO : 'application/octet-stream'};base64,`
  if (
    !fileName?.toLowerCase().endsWith(scene ? '.json' : '.bin') ||
    value.length > Math.ceil(maxBytes / 3) * 4 + prefix.length ||
    !value.startsWith(prefix)
  )
    return false
  try {
    const { bytes } = decodeProjectAsset(value)
    if (!bytes.byteLength || bytes.byteLength > maxBytes) return false
    if (scene) lerCenaParaStudio(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    return true
  } catch {
    return false
  }
}

export function assertScene3DDataBytes(bytes: Uint8Array, papel: PapelDoDado3D): void {
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES_DO_DADO_3D)
    throw Error('O campo de dados 3D excede o limite de bytes.')
  if (papel === 'buracos') {
    if (bytes.some((v) => v !== 0 && v !== 1))
      throw Error('A máscara de buracos precisa conter somente 0 ou 1.')
  } else {
    if (bytes.byteLength % 4)
      throw Error('As alturas precisam ser Float32 little endian completos.')
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    for (let i = 0; i < bytes.byteLength; i += 4)
      if (!Number.isFinite(view.getFloat32(i, true)))
        throw Error('O campo de alturas contém um valor inválido.')
  }
}
