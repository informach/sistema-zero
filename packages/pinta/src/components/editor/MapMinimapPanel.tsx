import { type JSX, useEffect, useRef } from 'react'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  isTileLayer,
  PINTA_MAP_FORMAT_LIMITS,
  type TilemapAsset,
} from '../../core/project'
import { paintMinimap, tilemapMinimapColors } from '../../tiles/minimap'
import { Panel } from '../ui/Panel'
export function MapMinimapPanel({
  map,
  tilesets,
  onJump,
}: {
  map: TilemapAsset
  tilesets: readonly AnyTilesetAsset[]
  onJump: (col: number, row: number) => void
}): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null),
    count = map.cols * map.rows * map.layers.filter(isTileLayer).length
  useEffect(() => {
    if (ref.current)
      paintMinimap(ref.current, map.cols, map.rows, tilemapMinimapColors(map, tilesets))
  }, [map, tilesets])
  return (
    <Panel title={COPY.scene.oMapaInteiro}>
      <button
        type="button"
        aria-label={COPY.scene.navegarPeloMinimapa}
        className="pin-checkerboard w-full overflow-hidden rounded-xl border-2 border-pin-border"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          onJump(
            ((e.clientX - r.left) / r.width) * map.cols,
            ((e.clientY - r.top) / r.height) * map.rows,
          )
        }}
      >
        <canvas ref={ref} className="pin-pixelated block max-h-36 w-full object-contain" />
      </button>
      <p className="mt-2 text-xs text-pin-muted">
        {COPY.scene.dimensions(map.cols, map.rows, map.layers.length)}
        <br />
        {COPY.scene.budget(count, PINTA_MAP_FORMAT_LIMITS.maxCells)}
      </p>
    </Panel>
  )
}
