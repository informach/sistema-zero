/**
 * Céu → `.hdr` pronto para o Estúdio (asset `environment3d`): render na CPU
 * em 1024×512 e RGBE, dentro do teto do Estúdio (`studioMax3DChars`, o mesmo
 * do `.glb`). Demora ~0,5 s: quem chama mostra o "Preparando o céu..." e roda
 * num `setTimeout`.
 */
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaSkyAsset } from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'
import { renderSky, SKY_EXPORT_SIZE } from '../sky/render'
import { encodeRgbe } from './rgbe'

export const HDR_MIME = 'image/vnd.radiance'

export type SkyHdrResult =
  | { ok: true; bytes: Uint8Array; dataUrl: string; chars: number; width: number; height: number }
  | { ok: false; reason: 'too-big' }

export function exportSkyHdr(
  asset: MoldaSkyAsset,
  size: { width: number; height: number } = SKY_EXPORT_SIZE,
): SkyHdrResult {
  const image = renderSky(asset.params, size.width, size.height)
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
