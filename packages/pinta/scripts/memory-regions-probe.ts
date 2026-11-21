import { assetBytes } from '../src/core/assetMemory'
import { createHistory } from '../src/core/history'
import type { RegionTilemapAsset } from '../src/core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../src/core/regionDocument'
import { snapshotShared } from '../src/state/editorStore'
import { editFirstMemoryCell, fullMemoryMap, sparseMemoryMap } from './homologacao/memoryRegions'

const parts = (map: RegionTilemapAsset) => snapshotShared({ asset: map, linkedMaps: null })
function cycle(base: RegionTilemapAsset, gestures: number, budget?: number) {
  const history = createHistory<RegionTilemapAsset>({
    // These fixtures have no extra metadata: this equals the editor's retained estimate.
    sizeOf: (map) => assetBytes(map, false),
    sharedOf: parts,
    byteBudget: budget,
  })
  let current = base
  for (let i = 0; i < gestures; i++) {
    history.record(current)
    current = editFirstMemoryCell(current, (i + 1) % 2)
  }
  const newest = current
  let undone = 0,
    redone = 0
  while (history.canUndo()) {
    const previous = history.undo(current)
    if (!previous) throw Error('Snapshot ausente')
    current = previous
    undone++
  }
  const returnedToBase = current === base
  while (history.canRedo()) {
    const next = history.redo(current)
    if (!next) throw Error('Snapshot ausente')
    current = next
    redone++
  }
  return { undone, redone, returnedToBase, returnedToNewest: current === newest }
}

/** Browser kernel proof, deliberately separate from public editor/physical IO support. */
export function runMemoryRegionsProbe() {
  const sparse = sparseMemoryMap(),
    full = fullMemoryMap()
  const wire = encodeRegionMapDocument(sparse)
  const reopened = wire && decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))
  return {
    sparse: {
      finite: Number.isFinite(assetBytes(sparse)),
      parts: [...parts(sparse)].length,
      payloadBytes: assetBytes(sparse) - assetBytes(sparse, false),
      logicalCells: sparse.cols * sparse.rows,
      roundTrip:
        reopened !== null &&
        JSON.stringify(encodeRegionMapDocument(reopened)) === JSON.stringify(wire),
      history: cycle(sparse, 10, assetBytes(sparse, false) * 5 + 2048 * 6),
    },
    full: {
      finite: Number.isFinite(assetBytes(full)),
      parts: [...parts(full)].length,
      payloadBytes: assetBytes(full) - assetBytes(full, false),
      history: cycle(full, 50),
    },
  }
}
