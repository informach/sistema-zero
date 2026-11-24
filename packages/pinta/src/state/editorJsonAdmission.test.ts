import { expect, test } from 'bun:test'
import { exactJsonBudgetFixture } from '../../scripts/homologacao/jsonBudget'
import { sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import {
  escapedMetadataFixture,
  metadataBudgetFixture,
} from '../../scripts/homologacao/metadataBudget'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { createPixelBackgroundAsset, createTilesetAsset } from '../core/project'
import { encodeRegionGalleryBackup } from '../export/regionBackup'
import { createEditorStore } from './editorStore'

test('metadata-valid but oversized JSON is refused before host, history and autosave', async () => {
  const { source } = metadataBudgetFixture(),
    over = escapedMetadataFixture()
  expect(encodeRegionGalleryBackup([over])).toBeNull()
  let writes = 0,
    hostCalls = 0
  const store = createEditorStore<PintaMemoryAsset>({
    asset: source,
    persist: async () => {
      writes++
    },
    acceptEdit: () => {
      hostCalls++
      return true
    },
  })
  try {
    expect(store.getState().commit(over)).toBe(false)
    expect(store.getState().replaceIfCurrent(source, over)).toBeNull()
    store.getState().replace(over)
    store.getState().commitGesture(over)
    expect(store.getState().asset).toBe(source)
    expect(store.getState().dirty).toBe(false)
    expect(store.getState().canUndo).toBe(false)
    expect(hostCalls).toBe(0)
  } finally {
    await store.getState().flush()
  }
  expect(writes).toBe(0)
  expect(() =>
    createEditorStore<PintaMemoryAsset>({ asset: over, persist: async () => {} }),
  ).toThrow(RangeError)
})

test('linked documents share the actual JSON file budget and refuse the complete batch', async () => {
  const { source } = metadataBudgetFixture(),
    sheet = createTilesetAsset({ name: 'ground', tileSize: 16 })
  const maps = Array.from({ length: 4 }, (_, i) => ({ ...source, id: `linked-${i}` }))
  let writes = 0,
    hostCalls = 0
  const store = createEditorStore<PintaMemoryAsset>({
    asset: sheet,
    persist: async () => {
      writes++
    },
    acceptEdit: () => {
      hostCalls++
      return true
    },
  })
  try {
    expect(
      store.getState().commitLinked({ ...sheet, name: 'outra' }, { before: [], after: maps }),
    ).toBe(false)
    expect(store.getState().asset).toBe(sheet)
    expect(store.getState().linkedAssets).toBeNull()
    expect(store.getState().canUndo).toBe(false)
    expect(hostCalls).toBe(0)
  } finally {
    await store.getState().flush()
  }
  expect(writes).toBe(0)
})

test('regional linked edits also admit aggregate decoded buffers before recording history', async () => {
  const map = sparseMemoryMap(),
    background = createPixelBackgroundAsset({ name: 'ceu', width: 512, height: 512 })
  const backgrounds = Array.from({ length: 129 }, (_, i) => ({ ...background, id: `sky-${i}` }))
  let writes = 0
  const store = createEditorStore<PintaMemoryAsset>({
    asset: map,
    persist: async () => {
      writes++
    },
  })
  try {
    expect(
      store.getState().commitLinked({ ...map, name: 'outra' }, { before: [], after: backgrounds }),
    ).toBe(false)
    expect(store.getState().asset).toBe(map)
    expect(store.getState().canUndo).toBe(false)
  } finally {
    await store.getState().flush()
  }
  expect(writes).toBe(0)
})

test('JSON admission includes the final timestamp before calling the host', async () => {
  const source = exactJsonBudgetFixture()
  let writes = 0,
    hostCalls = 0
  const store = createEditorStore<PintaMemoryAsset>({
    asset: source,
    persist: async () => {
      writes++
    },
    acceptEdit: () => {
      hostCalls++
      return true
    },
  })
  expect(source.updatedAt).toBe(0)
  try {
    expect(store.getState().commit(source)).toBe(false)
    expect(store.getState().asset).toBe(source)
    expect(store.getState().canUndo).toBe(false)
    expect(hostCalls).toBe(0)
  } finally {
    await store.getState().flush()
  }
  expect(writes).toBe(0)
})

test('legacy-only edits preserve their existing policy without the format-8 work budget', async () => {
  const sheet = createTilesetAsset({ name: 'ground', tileSize: 16 }),
    background = createPixelBackgroundAsset({ name: 'ceu', width: 512, height: 512 })
  const backgrounds = Array.from({ length: 129 }, (_, i) => ({ ...background, id: `sky-${i}` }))
  let writes = 0
  const store = createEditorStore({
    asset: sheet,
    persist: async () => {
      writes++
    },
  })
  expect(
    store.getState().commitLinked({ ...sheet, name: 'outra' }, { before: [], after: backgrounds }),
  ).toBe(true)
  expect(await store.getState().flush()).toEqual({ ok: true })
  expect(writes).toBe(1)
})

test('a valid regional linked transaction preserves one undo/redo and writes a restorable batch', async () => {
  const sheet = createTilesetAsset({ name: 'ground', tileSize: 16 }),
    source = sparseMemoryMap()
  const maps = [source, { ...source, id: 'other-map' }]
  let written = 0
  const store = createEditorStore<PintaMemoryAsset>({
    asset: sheet,
    persist: async (asset, linked) => {
      expect(encodeRegionGalleryBackup([asset, ...linked])).not.toBeNull()
      written++
    },
  })
  expect(
    store.getState().commitLinked({ ...sheet, name: 'outra' }, { before: [], after: maps }),
  ).toBe(true)
  const changed = store.getState().asset
  store.getState().undo()
  expect(store.getState().asset).toBe(sheet)
  expect(store.getState().canUndo).toBe(false)
  store.getState().redo()
  expect(store.getState().asset).toBe(changed)
  expect(store.getState().linkedAssets).toEqual(maps)
  expect(store.getState().canRedo).toBe(false)
  expect(await store.getState().flush()).toEqual({ ok: true })
  expect(written).toBe(1)
})
