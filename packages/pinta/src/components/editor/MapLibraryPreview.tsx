import { COPY } from '../../core/copy'
import type { PintaAsset, TilemapObject } from '../../core/project'
import type { AuthorMap } from '../../tiles/mapCellEdits'
import { mapCellBounds } from '../../tiles/mapCells'
import { MapObjectArtwork } from './MapObjectArtwork'

/** The same paper coordinates as the canvas; the ring remains in the translation. */
export function MapLibraryPreview({
  map,
  preview,
  tileSize,
  pad,
  cellPx,
}: {
  map: AuthorMap
  preview: { object: TilemapObject; source: PintaAsset; offsetX: number; offsetY: number }
  tileSize: number
  pad: number
  cellPx: number
}) {
  const origin = mapCellBounds(map)
  return (
    <svg
      data-pin-library-preview
      aria-label={COPY.scene.libraryPreview}
      role="img"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`${origin.col * tileSize} ${origin.row * tileSize} ${(map.cols + 2 * pad) * tileSize} ${(map.rows + 2 * pad) * tileSize}`}
    >
      <title>{COPY.scene.libraryPreview}</title>
      <g
        transform={`translate(${preview.offsetX + pad * tileSize} ${preview.offsetY + pad * tileSize})`}
        opacity={0.65}
      >
        <MapObjectArtwork object={preview.object} source={preview.source} />
        <rect
          x={preview.object.x}
          y={preview.object.y}
          width={preview.object.width}
          height={preview.object.height}
          fill="none"
          stroke="var(--color-pin-accent)"
          strokeWidth={(2 * tileSize) / cellPx}
        />
      </g>
    </svg>
  )
}
