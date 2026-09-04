/**
 * Modelo → `.glb` pronto para o Estúdio (asset `model3d`): atlas empacotado e
 * rasterizado, PNG do atlas, malha fundida, container GLB, e a data URL dentro
 * do teto do Estúdio (`studioMax3DChars`, comentário recíproco em
 * `packages/studio/src/core/project.ts`).
 */
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaModelAsset } from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'
import { packAtlas } from '../model/atlas'
import { rasterAtlas } from '../model/atlasRaster'
import { buildModelMesh } from '../model/build'
import { encodeGlb } from './glb'
import { encodePng } from './png'

export const GLB_MIME = 'model/gltf-binary'

export type ModelGlbResult =
  | {
      ok: true
      bytes: Uint8Array
      dataUrl: string
      triangles: number
      atlasSize: number
      chars: number
    }
  | { ok: false; reason: 'empty' | 'atlas-full' | 'too-big' }

export function exportModelGlb(model: MoldaModelAsset): ModelGlbResult {
  if (model.parts.length === 0) return { ok: false, reason: 'empty' }
  const packed = packAtlas(model)
  if (!packed.ok) return { ok: false, reason: 'atlas-full' }
  const pixels = rasterAtlas(model, packed.layout)
  const png = encodePng(pixels, packed.layout.size, packed.layout.size)
  const mesh = buildModelMesh(model, packed.layout)
  const bytes = encodeGlb({ name: model.name, mesh, imagePng: png })
  const dataUrl = `data:${GLB_MIME};base64,${bytesToBase64(bytes)}`
  if (dataUrl.length > MOLDA_LIMITS.studioMax3DChars) return { ok: false, reason: 'too-big' }
  return {
    ok: true,
    bytes,
    dataUrl,
    triangles: mesh.triangleCount,
    atlasSize: packed.layout.size,
    chars: dataUrl.length,
  }
}
