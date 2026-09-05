/**
 * Textura → `.png` (asset `image` do Estúdio): índice 0 → alfa 0 (a regra do
 * Pinta), dentro do teto de imagem do Estúdio (`studioMaxImageChars`).
 */
import { hexToRgb } from '../core/color'
import { MOLDA_LIMITS } from '../core/limits'
import type { MoldaTextureAsset } from '../core/model'
import { bytesToBase64 } from '../core/skinCodec'
import { textureColors } from '../texture/ops'
import { encodePng } from './png'

export const PNG_MIME = 'image/png'

/** RGBA sRGB da folha (índice 0 = transparente). */
export function textureToRgba(asset: MoldaTextureAsset): Uint8Array {
  const { bitmap } = asset
  const colors = textureColors(asset)
  const palette = colors.map((hex) => (hex ? hexToRgb(hex) : [0, 0, 0]))
  const rgba = new Uint8Array(bitmap.width * bitmap.height * 4)
  for (let i = 0; i < bitmap.data.length; i += 1) {
    const index = bitmap.data[i] ?? 0
    if (index === 0) continue
    const [r, g, b] = palette[index] ?? [0, 0, 0]
    rgba[i * 4] = r as number
    rgba[i * 4 + 1] = g as number
    rgba[i * 4 + 2] = b as number
    rgba[i * 4 + 3] = 255
  }
  return rgba
}

export type TexturePngResult =
  | { ok: true; bytes: Uint8Array; dataUrl: string; chars: number; width: number; height: number }
  | { ok: false; reason: 'too-big' }

export function exportTexturePng(asset: MoldaTextureAsset): TexturePngResult {
  const { width, height } = asset.bitmap
  const bytes = encodePng(textureToRgba(asset), width, height)
  const dataUrl = `data:${PNG_MIME};base64,${bytesToBase64(bytes)}`
  if (dataUrl.length > MOLDA_LIMITS.studioMaxImageChars) return { ok: false, reason: 'too-big' }
  return { ok: true, bytes, dataUrl, chars: dataUrl.length, width, height }
}
