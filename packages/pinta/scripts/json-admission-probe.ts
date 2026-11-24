import type { PintaMemoryAsset } from '../src/core/assetMemory'
import {
  createPixelBackgroundAsset,
  createPixelSpriteAsset,
  createTilesetAsset,
  type RegionTilemapAsset,
} from '../src/core/project'
import { encodeRegionGalleryBackup } from '../src/export/regionBackup'
import { RegionBackupSizeCache } from '../src/export/regionBackupSize'
import { createEditorStore } from '../src/state/editorStore'
import { CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../src/tiles/cell'
import { captureMapResourceVersion } from '../src/tiles/resourceVersions'
import { exactJsonBudgetFixture } from './homologacao/jsonBudget'
import { editFirstMemoryCell, fullMemoryMap, sparseMemoryMap } from './homologacao/memoryRegions'
import { escapedMetadataFixture, metadataBudgetFixture } from './homologacao/metadataBudget'

async function attempt(
  initial: PintaMemoryAsset,
  next: PintaMemoryAsset,
  after?: PintaMemoryAsset[],
) {
  let writes = 0,
    hostCalls = 0
  const store = createEditorStore<PintaMemoryAsset>({
    asset: initial,
    persist: async () => {
      writes++
    },
    acceptEdit: () => {
      hostCalls++
      return true
    },
  })
  const accepted = after
    ? store.getState().commitLinked(next, { before: [], after })
    : store.getState().commit(next)
  const result = {
    accepted,
    unchanged: store.getState().asset === initial,
    undo: store.getState().canUndo,
    dirty: store.getState().dirty,
    hostCalls,
  }
  await store.getState().flush()
  return { ...result, writes }
}

/** Internal real-store proof. Persistence is injected; public workshop/physical IO is separate. */
export async function runJsonAdmissionProbe(includeKernel = true) {
  const { source } = metadataBudgetFixture(),
    sheet = createTilesetAsset({ name: 'ground', tileSize: 16 })
  const json = await attempt(source, escapedMetadataFixture())
  const linked = await attempt(
    sheet,
    { ...sheet, name: 'outra' },
    Array.from({ length: 4 }, (_, i) => ({ ...source, id: `map-${i}` })),
  )
  const small = sparseMemoryMap(),
    background = createPixelBackgroundAsset({ name: 'ceu', width: 512, height: 512 })
  const buffers = await attempt(
    small,
    { ...small, name: 'outra' },
    Array.from({ length: 129 }, (_, i) => ({ ...background, id: `sky-${i}` })),
  )
  const exact = exactJsonBudgetFixture(),
    timestamp = await attempt(exact, exact)
  let positiveWrites = 0,
    restorable = false
  const positive = createEditorStore<PintaMemoryAsset>({
    asset: small,
    persist: async (asset, linked) => {
      positiveWrites++
      restorable = encodeRegionGalleryBackup([asset, ...linked]) !== null
    },
  })
  const good = positive.getState().commit({ ...small, name: 'outra' })
  positive.getState().undo()
  const undoToSource = positive.getState().asset === small
  positive.getState().redo()
  await positive.getState().flush()
  let kernel: { changedChunkEncodes: number; sizes: number[] } | null = null
  if (includeKernel) {
    const capture = captureMapResourceVersion(
      fullMemoryMap(),
      createPixelSpriteAsset({ name: 'arvore', frameSize: 16 }),
    )
    if (!capture.ok) throw Error(capture.reason)
    const cache = new RegionBackupSizeCache()
    if (!Number.isFinite(cache.byteLength([capture.map]))) throw Error('Base não mensurável')
    const next = editFirstMemoryCell(capture.map, 1),
      originalBtoa = globalThis.btoa
    let encodes = 0
    try {
      globalThis.btoa = (input) => {
        encodes++
        return originalBtoa(input)
      }
      cache.byteLength([next])
    } finally {
      globalThis.btoa = originalBtoa
    }
    const sizes: number[] = []
    for (let seed = 0; seed < 64; seed++) {
      const edited = editFirstMemoryCell(
        small,
        makeCell(seed % 2, seed % 3 === 0 ? CELL_FLIP_H : seed % 3 === 1 ? CELL_FLIP_V : 0),
      )
      const map: RegionTilemapAsset = {
        ...edited,
        name: `Vila 🎨 界 ${seed}`,
        layers: edited.layers.map((layer) => ({ ...layer, offsetX: (seed - 32) / 4 })),
      }
      const actual = encodeRegionGalleryBackup([map])
      if (!actual) throw Error('Oráculo não exportável')
      const measured = cache.byteLength([map]),
        expected = new TextEncoder().encode(actual.text).byteLength
      if (measured !== expected) throw Error('Medição divergente do arquivo')
      sizes.push(measured)
    }
    kernel = { changedChunkEncodes: encodes, sizes }
  }
  return {
    json,
    linked,
    buffers,
    timestamp,
    positive: { good, undoToSource, writes: positiveWrites, restorable },
    kernel,
    public8: false,
  }
}
