import { PINTA_STUDIO_LEGACY_LIMITS } from '@sistemazero/core/studio/pinta-limits'
import { Unzlib } from 'fflate'
import { decodeProjectAsset } from './assetBinary'
import { pintaPngDataRange } from './pintaPngChunk'

import { hasRegionalPintaReference } from './pintaRegionalReference'

/** The existing writer emits its format and version first. This is only a
 * rejection fence for its unmarked output; admission must parse the full iTXt. */
function authoredRegionalPng(value: unknown): boolean {
  const prefix = 'data:image/png;base64,'
  if (
    typeof value !== 'string' ||
    value.length > PINTA_STUDIO_LEGACY_LIMITS.imageChars ||
    !value.startsWith(`${prefix}iVBORw0KGgo`)
  )
    return false
  try {
    if (atob(value.slice(prefix.length, prefix.length + 56)).slice(37, 42) !== 'iTXtp') {
      return false
    }
    const { bytes } = decodeProjectAsset(value)
    const range = pintaPngDataRange(bytes)
    if (!range) return false
    let regional = false
    const compressed = bytes.subarray(range.start, Math.min(range.end, range.start + 1024))
    const stream = new Unzlib((chunk) => {
      const version = /^\s*\{\s*"format"\s*:\s*"pinta"\s*,\s*"version"\s*:\s*(\d+)\s*,/.exec(
        new TextDecoder().decode(chunk.subarray(0, 256)),
      )?.[1]
      if (version && Number(version) >= 5) regional = true
    })
    stream.push(compressed, compressed.length === range.end - range.start)
    return regional
  } catch {
    return false
  }
}

export function isUnusablePintaRegionalAsset(value: unknown): boolean {
  return (
    hasRegionalPintaReference(value) ||
    (!!value &&
      typeof value === 'object' &&
      'dataUrl' in value &&
      authoredRegionalPng(value.dataUrl))
  )
}
