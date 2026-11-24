import { expect, test } from 'bun:test'
import {
  editFirstMemoryCell as edit,
  fullMemoryMap,
  sparseMemoryMap as sparse,
} from '../../scripts/homologacao/memoryRegions'
import { snapshotShared } from '../state/editorStore'
import { captureMapResourceVersion } from '../tiles/resourceVersions'
import { assetBytes, retainedAssetBytes } from './assetMemory'
import { createHistory } from './history'
import {
  createPixelSpriteAsset,
  isTileLayer,
  type RegionMapSetAsset,
  type RegionTilemapAsset,
} from './project'

function parts(map: RegionTilemapAsset) {
  return snapshotShared({ asset: map, linkedMaps: null })
}
function history(byteBudget?: number) {
  return createHistory<RegionTilemapAsset>({
    sizeOf: (map) => retainedAssetBytes(map, false),
    sharedOf: parts,
    byteBudget,
  })
}

test('sparse memory counts two real buffers rather than the hundred million logical cells', () => {
  const map = sparse(),
    shared = [...parts(map)]
  expect(Number.isFinite(assetBytes(map))).toBe(true)
  expect(assetBytes(map) - assetBytes(map, false)).toBe(4096)
  expect(assetBytes(map)).toBeLessThan(10000)
  expect(shared).toHaveLength(2)
  expect(shared.map((p) => p.bytes)).toEqual([2048, 2048])
  const layer = map.layers.find(isTileLayer)!
  expect(shared.map((p) => p.key)).toEqual(layer.cells.chunks.map((c) => c.cells))
  const changed = edit(map, 1),
    after = [...parts(changed)]
  expect(after[0]!.key).not.toBe(shared[0]!.key)
  expect(after[1]!.key).toBe(shared[1]!.key)
})

test('actual history trims and redoes by distinct chunk buffers under a small byte budget', () => {
  let current = sparse()
  const original = current,
    snapshots: RegionTilemapAsset[] = []
  const undo = history(assetBytes(current, false) * 5 + 2048 * 6)
  for (let i = 0; i < 10; i++) {
    snapshots.push(current)
    undo.record(current)
    current = edit(current, (i + 1) % 2)
  }
  const newest = current,
    restored: RegionTilemapAsset[] = []
  while (undo.canUndo()) {
    const previous = undo.undo(current)
    if (!previous) throw Error('Snapshot ausente')
    restored.push(previous)
    current = previous
  }
  expect(restored).toEqual(snapshots.slice(-5).reverse())
  expect(restored.at(-1)).not.toBe(original)
  let redone = 0
  while (undo.canRedo()) {
    const next = undo.redo(current)
    if (!next) throw Error('Snapshot ausente')
    current = next
    redone++
  }
  expect(redone).toBe(5)
  expect(current).toBe(newest)
})

test('fifty single-chunk gestures keep undo at the real 4 MiB document budget', () => {
  let current = fullMemoryMap()
  expect([...parts(current)]).toHaveLength(2048)
  expect(assetBytes(current) - assetBytes(current, false)).toBe(4194304)
  const original = current,
    undo = history()
  for (let i = 0; i < 50; i++) {
    undo.record(current)
    current = edit(current, (i + 1) % 2)
  }
  const newest = current
  let count = 0
  while (undo.canUndo()) {
    const previous = undo.undo(current)
    if (!previous) throw Error('Snapshot ausente')
    current = previous
    count++
  }
  expect(count).toBe(50)
  expect(current).toBe(original)
  for (let i = 0; i < 50; i++) {
    const next = undo.redo(current)
    if (!next) throw Error('Snapshot ausente')
    current = next
  }
  expect(current).toBe(newest)
})

test('map sets and linked snapshots expose the same private art and chunk buffer identities', () => {
  const source = sparse(),
    sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  const captured = captureMapResourceVersion(source, sprite, 0)
  if (!captured.ok) throw Error(captured.reason)
  const map = captured.map
  const set: RegionMapSetAsset = {
    id: 'set',
    name: 'Bosque',
    kind: 'map-set',
    schema: 8,
    createdAt: 0,
    updatedAt: 0,
    map,
  }
  expect(assetBytes(set)).toBe(assetBytes(map))
  expect(assetBytes(set, false)).toBe(assetBytes(map, false))
  const shared = [...snapshotShared({ asset: set, linkedMaps: [map] })]
  expect(shared).toHaveLength(6)
  expect(new Set(shared.map((p) => p.key)).size).toBe(3)
  const resource = shared.filter((p) => p.key === captured.version.asset)
  expect(resource).toHaveLength(2)
  expect(resource.every((p) => p.bytes === assetBytes(sprite))).toBe(true)
})
