import { pintaValuesEqual } from '../src/core/assetEquality'
import { isTileLayer } from '../src/core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../src/core/regionDocument'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../src/tiles/cell'
import { mapAllocatedCellCount } from '../src/tiles/mapCells'
import { editRegionMapCells } from '../src/tiles/regionMap'
import { createMapLayerCellReader } from '../src/tiles/tilemapOps'
import { tryRemapTilemapCells } from '../src/tiles/tilesetOps'
import { fullMemoryMap, sparseMemoryMap } from './homologacao/memoryRegions'

/** Document maintenance uses the existing 4 MiB limit, not the logical world size. */
export function runRemapRegionsProbe() {
  const sparse = sparseMemoryMap(),
    id = sparse.layers[0]!.id
  const flagged = editRegionMapCells(sparse, id, [
    { col: -100, row: -100, cell: makeCell(0, CELL_FLIP_H) },
    { col: 9899, row: 9899, cell: makeCell(1, CELL_FLIP_D | CELL_FLIP_V) },
  ])
  if (!flagged.ok) throw Error(flagged.reason)
  const inserted = tryRemapTilemapCells(flagged.map, { insertedAt: 1 }, sparse.tilesetId),
    removed = tryRemapTilemapCells(flagged.map, { removedAt: 1 }, sparse.tilesetId)
  if (!inserted.ok || !removed.ok) throw Error('Remapeamento recusado')
  const layer = flagged.map.layers.find(isTileLayer)!,
    next = inserted.map.layers.find(isTileLayer)!
  const reader = createMapLayerCellReader(inserted.map, id)!
  const full = fullMemoryMap(),
    result = tryRemapTilemapCells(full, { insertedAt: 0 }, full.tilesetId)
  if (!result.ok) throw Error(result.reason)
  const last = result.map.layers.filter(isTileLayer).at(-1)!
  const wire = encodeRegionMapDocument(inserted.map),
    reopened = wire && decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))
  return {
    logicalCells: sparse.cols * sparse.rows,
    sparseBytes: mapAllocatedCellCount(inserted.map) * 2,
    values: [reader.at(-100, -100), reader.at(9899, 9899)],
    sharedFirstChunk: next.cells.chunks[0] === layer.cells.chunks[0],
    afterRemovalChunks: removed.map.layers.find(isTileLayer)!.cells.chunks.length,
    roundTrip: pintaValuesEqual(reopened, inserted.map),
    fullBytes: mapAllocatedCellCount(result.map) * 2,
    fullLastCell: last.cells.chunks.at(-1)!.cells.at(-1),
    originalLastCell: full.layers.filter(isTileLayer).at(-1)!.cells.chunks.at(-1)!.cells.at(-1),
  }
}
