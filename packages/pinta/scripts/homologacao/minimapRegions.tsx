/** QA-only host of the actual component; does not enable native format 8 in PintaApp. */
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../playground/styles.css'
import { MapMinimapPanel } from '../../src/components/editor/MapMinimapPanel'
import {
  createTilemapAsset,
  createTilesetAsset,
  type RegionTilemapAsset,
} from '../../src/core/project'
import { editRegionMapCells, prepareMapRegions } from '../../src/tiles/regionMap'

const ground = createTilesetAsset({ name: 'Chão privado', tileSize: 16 }),
  decoration = createTilesetAsset({ name: 'Decoração', tileSize: 16 })
ground.tiles[0]!.data.fill(1)
decoration.tiles[0]!.data.fill(2)
const prepared = prepareMapRegions(
  createTilemapAsset({ name: 'Mundo de QA', tilesetId: ground.id, cols: 2, rows: 2 }),
)
if (!prepared.ok) throw Error(prepared.reason)
let map: RegionTilemapAsset = {
  ...prepared.map,
  origin: { col: -100, row: -100 },
  cols: 10000,
  rows: 10000,
  resources: [{ sourceId: ground.id, capturedAt: 1, asset: ground }],
  layers: [
    ...prepared.map.layers,
    {
      id: 'decor',
      name: 'Decoração',
      visible: true,
      tilesetId: decoration.id,
      cells: { kind: 'regions', version: 1, side: 32, chunks: [] },
    },
  ],
}
for (const [layerId, col, row] of [
  [map.layers[0]!.id, -50, -40],
  ['decor', 9000, 9000],
] as const) {
  const result = editRegionMapCells(map, layerId, [{ col, row, cell: 0 }])
  if (!result.ok) throw Error(result.reason)
  map = result.map
}
// An unrelated gallery revision must not replace the immutable private ground.
const decoy = {
    ...ground,
    tiles: ground.tiles.map((tile) => ({ ...tile, data: new Uint8Array(256).fill(3) })),
  },
  tilesets = [decoy, decoration],
  original = JSON.stringify(map)

function Lab() {
  const stageRef = useRef<HTMLDivElement>(null),
    [jump, setJump] = useState<[number, number] | null>(null)
  return (
    <main data-pinta-theme="light" className="bg-pin-bg text-pin-text" style={{ padding: 16 }}>
      <p>QA do minimapa por regiões — documento 8 interno</p>
      <div style={{ width: 300 }}>
        <MapMinimapPanel
          map={map}
          tilesets={tilesets}
          stageRef={stageRef}
          cellPx={16}
          onJump={(col, row) => {
            const stage = stageRef.current
            if (stage) {
              stage.scrollLeft = (col - map.origin.col) * 16 - stage.clientWidth / 2
              stage.scrollTop = (row - map.origin.row) * 16 - stage.clientHeight / 2
            }
            setJump([col, row])
          }}
        />
      </div>
      <div
        ref={stageRef}
        data-stage=""
        style={{ width: 320, height: 180, overflow: 'auto', maxWidth: '100%' }}
      >
        <div style={{ width: map.cols * 16, height: map.rows * 16 }} />
      </div>
      <output data-jump="">{JSON.stringify(jump)}</output>
      <output data-unchanged="">{String(JSON.stringify(map) === original)}</output>
    </main>
  )
}
const root = document.getElementById('root')
if (!root) throw Error('Host de QA ausente')
createRoot(root).render(<Lab />)
