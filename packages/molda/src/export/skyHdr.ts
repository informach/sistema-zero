/**
 * Céu → `.hdr` pronto para o Estúdio (asset `environment3d`): render na CPU
 * em 1024×512 e RGBE, dentro do teto do Estúdio (`studioMax3DChars`, o mesmo
 * do `.glb`). CPU síncrona para codecs; a interface usa o worker cancelável.
 */
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaSkyAsset } from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'
import { renderSky, SKY_EXPORT_SIZE, type SkyImage } from '../sky/render'
import { encodeRgbe } from './rgbe'

export const HDR_MIME = 'image/vnd.radiance'

export type SkyHdrResult =
  | { ok: true; bytes: Uint8Array; dataUrl: string; chars: number; width: number; height: number }
  | { ok: false; reason: 'too-big' }

export function exportSkyHdr(
  asset: MoldaSkyAsset,
  size: { width: number; height: number } = SKY_EXPORT_SIZE,
): SkyHdrResult {
  return skyImageToHdr(renderSky(asset.params, size.width, size.height))
}

/** Same encoder for synchronous integrations and the off-thread task. */
export function skyImageToHdr(image: SkyImage): SkyHdrResult {
  const bytes = encodeRgbe(image.rgb, image.width, image.height)
  const dataUrl = `data:${HDR_MIME};base64,${bytesToBase64(bytes)}`
  if (dataUrl.length > MOLDA_LIMITS.studioMax3DChars) return { ok: false, reason: 'too-big' }
  return {
    ok: true,
    bytes,
    dataUrl,
    chars: dataUrl.length,
    width: image.width,
    height: image.height,
  }
}
