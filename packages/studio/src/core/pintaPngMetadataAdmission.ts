import { PintaImageWorldSchema } from '@sistemazero/core/studio/pinta-image'
import { PINTA_REGION_IMAGE_PNG_LIMITS } from '@sistemazero/core/studio/pinta-region-image-limits'
import { readPintaPngText } from '@sistemazero/core/studio/pinta-region-png-text'
import { readPintaScene } from '@sistemazero/core/studio/pinta-scene'

/** Detection is not admission. Generic PNG/APNG without a Pinta envelope keeps
 * its existing policy; authored metadata is read completely before trusting a version.
 */
function hasPintaText(bytes: Uint8Array): boolean {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 45 || !signature.every((value, i) => bytes[i] === value)) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const length = view.getUint32(offset)
    // A generic legacy image is not admitted as a regional PNG. Its existing
    // browser decode policy also applies to old files with trailing bytes.
    if (length > bytes.length - offset - 12) return false
    const start = offset + 8
    if (
      view.getUint32(offset + 4) === 0x69545874 &&
      length >= 6 &&
      [112, 105, 110, 116, 97, 0].every((value, i) => bytes[start + i] === value)
    )
      return true
    offset += length + 12
  }
  return false
}

/** Shared cumulative budget for legacy metadata and the admitted regional worlds.
 * A PNG5 without its marker cannot be silently relabeled as a legacy flat image.
 */
export function admitLegacyPintaPngMetadata(dataUrl: string, remainingBytes: number): number {
  const prefix = 'data:image/png;base64,'
  if (!dataUrl.startsWith(`${prefix}iVBORw0KGgo`)) return 0
  let consumed = 0
  const pending = [{ url: dataUrl, required: false }]
  for (let item = pending.pop(); item; item = pending.pop()) {
    const binary = atob(item.url.slice(prefix.length))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    if (!hasPintaText(bytes)) {
      if (item.required) throw new Error('Um dos lugares do cenário veio sem os seus dados.')
      continue
    }
    // This boundary reads metadata, never rasterizes pixels. Old spritesheets
    // predate the regional world's dimension/pixel budget and keep their size.
    // Encoded bytes, CRC, envelope, inflation and cumulative metadata remain bounded.
    const { text } = readPintaPngText(bytes, remainingBytes - consumed, {
      ...PINTA_REGION_IMAGE_PNG_LIMITS,
      dimension: 0x7fffffff,
      imagePixels: Number.MAX_SAFE_INTEGER,
      totalImagePixels: Number.MAX_SAFE_INTEGER,
    })
    consumed += new TextEncoder().encode(text).byteLength
    const metadata: unknown = JSON.parse(text)
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      !('format' in metadata) ||
      metadata.format !== 'pinta' ||
      !('version' in metadata) ||
      typeof metadata.version !== 'number' ||
      ![1, 2, 3, 4].includes(metadata.version)
    )
      throw new Error(
        'O PNG regional precisa da identificação completa do cenário. O original foi preservado.',
      )
    if ('scene' in metadata && !readPintaScene(metadata.scene))
      throw new Error(
        'Este PNG usa uma versão de cenário que não corresponde ao seu formato. O original foi preservado.',
      )
    if ('world' in metadata) {
      const world = PintaImageWorldSchema.parse(metadata.world)
      for (const map of world.maps) pending.push({ url: map.png, required: true })
    }
  }
  return consumed
}
