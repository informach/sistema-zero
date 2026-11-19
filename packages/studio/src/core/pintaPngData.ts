import {
  PINTA_IMAGE_WORLD_LIMITS,
  type PintaImageDerivation,
} from '@sistemazero/core/studio/pinta-image'
import { Unzlib } from 'fflate'
import { decodeProjectAsset } from './assetBinary'
import { pintaPngDataRange } from './pintaPngChunk'

const INVALID =
  'Os dados deste desenho não combinam com a versão guardada. Traga-o do Pinta novamente. O original foi preservado.'
class PintaDataBudgetError extends Error {}
function invalid(): never {
  throw new Error(INVALID)
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
type Header = Record<string, unknown> & {
  format: 'pinta'
  version: 1 | 2 | 3 | 4
  kind: 'map' | 'sprite' | 'tileset'
}

/** Bound decoded bytes across the root and its encoded children, as the Python reader does.
 * Streaming input is capped at 1 KiB per push. Never use unzlibSync's `out`, which truncates.
 * The decoder is loaded only at this byte boundary, outside the gallery's initial bundle.
 */
export async function assertPintaPngReaderContract(
  bytes: Uint8Array,
  metadata: PintaImageDerivation,
): Promise<void> {
  const budget = { remaining: PINTA_IMAGE_WORLD_LIMITS.metadataBytes }
  const read = async (input: Uint8Array): Promise<Header> => {
    const range = pintaPngDataRange(input)
    if (!range) invalid()
    const text = new TextDecoder('utf-8', { fatal: true }),
      parts: string[] = []
    let depth = 0,
      quoted = false,
      escaped = false,
      completed = false,
      sinceYield = 0
    try {
      const stream = new Unzlib((chunk, final) => {
        budget.remaining -= chunk.length
        sinceYield += chunk.length
        if (budget.remaining < 0)
          throw new PintaDataBudgetError(
            'Os dados deste desenho ficaram grandes demais. O original foi preservado.',
          )
        const decoded = text.decode(chunk, { stream: !final })
        // This is only a depth bound, not a second JSON parser. JSON.parse remains authoritative.
        for (let i = 0; i < decoded.length; i++) {
          const code = decoded.charCodeAt(i)
          if (quoted) {
            if (escaped) escaped = false
            else if (code === 92) escaped = true
            else if (code === 34) quoted = false
          } else if (code === 34) quoted = true
          else if (code === 123 || code === 91) {
            if (++depth > 64) invalid()
          } else if (code === 125 || code === 93) {
            if (--depth < 0) invalid()
          }
        }
        parts.push(decoded)
        completed = final
      })
      for (let pos = range.start; pos < range.end; pos += 1024) {
        const end = Math.min(pos + 1024, range.end)
        stream.push(input.subarray(pos, end), end === range.end)
        if (sinceYield >= 262144 && end < range.end) {
          sinceYield = 0
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
        }
      }
      if (!completed || depth !== 0 || quoted) invalid()
      const data: unknown = JSON.parse(parts.join(''))
      if (
        !record(data) ||
        data.format !== 'pinta' ||
        ![1, 2, 3, 4].includes(data.version as number) ||
        !['map', 'sprite', 'tileset'].includes(data.kind as string)
      )
        invalid()
      const header = data as Header
      if (header.version >= 3 && header.kind !== 'map') invalid()
      if (header.version === 4 && !record(header.scene)) invalid()
      if (header.scene !== undefined) {
        if (!record(header.scene) || ![1, 2, 3].includes(header.scene.version as number)) invalid()
        if (header.scene.version === 3 && header.version !== 4) invalid()
        const groups = [
          header.scene,
          ...(Array.isArray(header.scene.sets) ? header.scene.sets : []),
        ]
        for (const group of groups) {
          if (!record(group) || !Array.isArray(group.layers)) continue
          for (const layer of group.layers) {
            if (!record(layer) || layer.kind !== 'objects' || !Array.isArray(layer.objects))
              continue
            if (
              header.scene.version !== 3 &&
              layer.objects.some((object) => record(object) && Object.hasOwn(object, 'collision'))
            )
              invalid()
          }
        }
      }
      return header
    } catch (error) {
      if (error instanceof PintaDataBudgetError) throw error
      return invalid()
    }
  }
  const root = await read(bytes),
    selection = metadata.recipe.selection.kind
  const expected =
    selection === 'spritesheet' ? 'sprite' : selection === 'tileset' ? 'tileset' : 'map'
  if (root.kind !== expected) invalid()
  if (metadata.output.dataVersion !== undefined && metadata.output.dataVersion !== root.version)
    invalid()
  if (root.version === 4 && metadata.output.dataVersion !== 4) invalid()
  if (root.version === 3 && selection !== 'map-world') invalid()
  if (root.world === undefined) return
  if (
    root.version < 3 ||
    selection !== 'map-world' ||
    !record(root.world) ||
    root.world.version !== 1 ||
    !Array.isArray(root.world.maps) ||
    root.world.maps.length >= PINTA_IMAGE_WORLD_LIMITS.maps
  )
    invalid()
  let encoded = 0
  for (const item of root.world.maps) {
    if (
      !record(item) ||
      typeof item.png !== 'string' ||
      !item.png.startsWith('data:image/png;base64,')
    )
      invalid()
    encoded += item.png.length
    if (encoded > PINTA_IMAGE_WORLD_LIMITS.encodedChars) invalid()
    const child = await read(decodeProjectAsset(item.png).bytes)
    if (
      child.kind !== 'map' ||
      !([2, 4] as number[]).includes(child.version) ||
      child.world !== undefined
    )
      invalid()
    if (child.version === 4 && root.version !== 4) invalid()
  }
}
