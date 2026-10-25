import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import type {
  PintaImageDerivation,
  PintaImageRecipe,
  PintaImageSelectionKind,
} from '@sistemazero/core/studio/pinta-image'
import type { ProjectAsset } from '#core'
import { assertPintaImageAssetBytes } from '../core/pintaImageAsset'
import type { StudioPintaLibraryAdapter } from '../studio/pinta-library'
import { createPintaImageSync } from './pintaImageSync'

const plain = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
  'base64',
)

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** The 1×1 PNG with a Pinta `iTXt` chunk right after IHDR (the layout `pinta.py` reads). */
function pngWithData(data: unknown, keyword = 'pinta', flags = [0, 1, 0, 0, 0]): Buffer {
  const body = Buffer.concat([
    Buffer.from(keyword, 'latin1'),
    Buffer.from(flags),
    deflateSync(Buffer.from(JSON.stringify(data), 'utf8')),
  ])
  const typed = Buffer.concat([Buffer.from('iTXt', 'latin1'), body])
  const chunk = Buffer.alloc(12 + body.length)
  chunk.writeUInt32BE(body.length, 0)
  typed.copy(chunk, 4)
  chunk.writeUInt32BE(crc32(typed), 8 + body.length)
  return Buffer.concat([plain.subarray(0, 33), chunk, plain.subarray(33)])
}

function derived(
  kind: PintaImageSelectionKind,
  bytes: Buffer,
  dependencies: string[] = [],
  id = `asset-${kind}`,
): ProjectAsset {
  const selection = (
    kind === 'frame'
      ? { kind, animationId: 'andar', frameIndex: 0 }
      : kind === 'tile'
        ? { kind, tileIndex: 0 }
        : { kind }
  ) as PintaImageRecipe['selection']
  return {
    id,
    name: id,
    kind: 'image',
    source: 'library',
    libId: 'personal:drawing',
    libOrigin: 'pinta',
    dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
    width: 1,
    height: 1,
    proPath: `assets/${id}.png`,
    pintaImage: {
      recipe: { version: 1, algorithm: 'pinta-image-1', drawingId: 'drawing', selection, scale: 2 },
      provenance: {
        sourceSha256: 'a'.repeat(64),
        dependencies: dependencies.map((drawingId) => ({ drawingId, sha256: 'c'.repeat(64) })),
      },
      output: {
        mime: 'image/png',
        width: 1,
        height: 1,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    },
  }
}

const mapData = { format: 'pinta', version: 1, kind: 'map', name: 'fase', layers: [] }

describe('pygame data kinds: the PNG keeps the Pinta chunk', () => {
  test('a sheet or map without its data chunk is refused; with it, accepted', () => {
    const withData = pngWithData(mapData)
    const ok = derived('map', withData, ['t1'])
    expect(() =>
      assertPintaImageAssetBytes(ok, withData, createHash('sha256').update(withData).digest('hex')),
    ).not.toThrow()
    for (const bytes of [
      plain,
      pngWithData(mapData, 'other'),
      pngWithData(mapData, 'pinta', [0, 0, 0, 0, 0]),
    ]) {
      const asset = derived('spritesheet', bytes)
      expect(() =>
        assertPintaImageAssetBytes(asset, bytes, createHash('sha256').update(bytes).digest('hex')),
      ).toThrow('perdeu os dados')
    }
    // The single-image kinds stay plain PNGs.
    const frame = derived('frame', plain)
    expect(() =>
      assertPintaImageAssetBytes(frame, plain, createHash('sha256').update(plain).digest('hex')),
    ).not.toThrow()
  })
})

describe('sync re-derives the data kinds, a map on ANY tileset change', () => {
  function adapter(
    current: (selection?: PintaImageSelectionKind) => PintaImageDerivation['provenance'],
  ) {
    const inspections: Array<PintaImageSelectionKind | undefined> = []
    const previews: PintaImageRecipe[] = []
    const value: StudioPintaLibraryAdapter = {
      list: async () => [],
      import: async () => {
        throw new Error('Synchronization never imports')
      },
      inspectImage: async (_drawingId, options) => {
        inspections.push(options?.selection)
        return current(options?.selection)
      },
      previewImage: async (recipe, _limits, options) => {
        previews.push(structuredClone(recipe))
        const bytes = pngWithData({ ...mapData, updated: true })
        const base = derived(recipe.selection.kind, bytes).pintaImage!
        return {
          dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
          derivation: {
            ...base,
            recipe,
            provenance: structuredClone(options!.expectedProvenance!),
          },
        }
      },
    }
    return { value, inspections, previews }
  }

  test('a changed layer tileset re-derives the map (inspected with selection "map")', async () => {
    const map = derived('map', pngWithData(mapData), ['t1', 't2'])
    const fake = adapter(() => ({
      sourceSha256: 'a'.repeat(64),
      dependencies: [
        { drawingId: 't1', sha256: 'c'.repeat(64) },
        { drawingId: 't2', sha256: 'd'.repeat(64) },
      ],
    }))
    const sync = createPintaImageSync(fake.value, new AbortController().signal)
    const next = await sync.reconcile(map, [map])
    expect(fake.inspections).toEqual(['map'])
    expect(fake.previews.map((recipe) => recipe.selection.kind)).toEqual(['map'])
    expect(next?.pintaImage?.provenance.dependencies[1]?.sha256).toBe('d'.repeat(64))
    expect(next?.proPath).toBe('assets/asset-map.png')
  })

  test('unchanged provenance keeps the material; one inspection per dependency rule', async () => {
    const provenance = (selection?: PintaImageSelectionKind) => ({
      sourceSha256: 'a'.repeat(64),
      dependencies:
        selection === 'map'
          ? [
              { drawingId: 't1', sha256: 'c'.repeat(64) },
              { drawingId: 't2', sha256: 'c'.repeat(64) },
            ]
          : selection === 'tilemap'
            ? [{ drawingId: 't1', sha256: 'c'.repeat(64) }]
            : [],
    })
    const fake = adapter(provenance)
    const sync = createPintaImageSync(fake.value, new AbortController().signal)
    const assets = [
      derived('map', pngWithData(mapData), ['t1', 't2']),
      derived('tilemap', plain, ['t1']),
      derived('spritesheet', pngWithData(mapData)),
      derived('frame', plain),
    ]
    for (const asset of assets) expect(await sync.reconcile(asset, assets)).toBeNull()
    // `map` and `tilemap` fingerprint different tilesets; `spritesheet` and `frame` share "none".
    expect(fake.inspections).toEqual(['map', 'tilemap', 'spritesheet'])
    expect(fake.previews).toEqual([])
  })
})

describe('one shared tileset copy: painting a piece updates every use', () => {
  test('a tileset-only change re-derives the tileset material AND the map that uses it', async () => {
    // Both materials point at the SAME Pinta tileset copy (the map lists it as a dependency).
    const tileset = derived('tileset', pngWithData({ ...mapData, kind: 'tileset' }))
    const map = derived('map', pngWithData(mapData), ['drawing-pecas'])
    let painted = false
    const inspections: Array<PintaImageSelectionKind | undefined> = []
    const previews: PintaImageRecipe[] = []
    const adapter: StudioPintaLibraryAdapter = {
      list: async () => [],
      import: async () => {
        throw new Error('Synchronization never imports')
      },
      inspectImage: async (_drawingId, options) => {
        inspections.push(options?.selection)
        // The piece painted in Pinta: the tileset's own fingerprint and the map's dependency.
        return options?.selection === 'map'
          ? {
              sourceSha256: 'a'.repeat(64),
              dependencies: [
                { drawingId: 'drawing-pecas', sha256: (painted ? 'd' : 'c').repeat(64) },
              ],
            }
          : { sourceSha256: (painted ? 'e' : 'a').repeat(64), dependencies: [] }
      },
      previewImage: async (recipe, _limits, options) => {
        previews.push(structuredClone(recipe))
        const bytes = pngWithData({ ...mapData, painted: true })
        const base = derived(recipe.selection.kind, bytes).pintaImage!
        return {
          dataUrl: `data:image/png;base64,${bytes.toString('base64')}`,
          derivation: {
            ...base,
            recipe,
            provenance: structuredClone(options!.expectedProvenance!),
          },
        }
      },
    }
    const assets = [tileset, map]
    // Nothing painted yet: both stay as they are.
    const quiet = createPintaImageSync(adapter, new AbortController().signal)
    for (const asset of assets) expect(await quiet.reconcile(asset, assets)).toBeNull()
    painted = true
    const sync = createPintaImageSync(adapter, new AbortController().signal)
    const nextTileset = await sync.reconcile(tileset, assets)
    const nextMap = await sync.reconcile(map, assets)
    expect(nextTileset?.pintaImage?.provenance.sourceSha256).toBe('e'.repeat(64))
    expect(nextMap?.pintaImage?.provenance.dependencies[0]?.sha256).toBe('d'.repeat(64))
    expect(previews.map((recipe) => recipe.selection.kind)).toEqual(['tileset', 'map'])
    expect(inspections).toEqual(['tileset', 'map', 'tileset', 'map'])
  })
})
