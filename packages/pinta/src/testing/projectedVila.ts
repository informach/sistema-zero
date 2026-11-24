import { makePintaHexCell, PINTA_HEX_EMPTY_CELL } from '@sistemazero/core/creations'
import { isTileLayer } from '../core/project'
import type { ProjectedTilemapAsset } from '../core/projectedDocument'
import { regionVila } from './regionVila'

/** Two playable projections sharing the actual Vila and Cabana art. */
export function projectedVila() {
  const { map, cabana, assets } = regionVila()
  const diamond: ProjectedTilemapAsset = {
    ...map,
    schema: 9,
    growth: 'expandable',
    physics: 'precise',
    projection: { kind: 'isometric', tileWidth: 32, tileHeight: 16 },
  }
  const hex: ProjectedTilemapAsset = {
    ...cabana,
    schema: 9,
    growth: 'expandable',
    physics: 'precise',
    projection: {
      kind: 'hexagonal',
      tileWidth: 32,
      tileHeight: 32,
      hexSideLength: 16,
      staggerAxis: 'y',
      staggerIndex: 'odd',
    },
    layers: cabana.layers.map((layer) =>
      isTileLayer(layer)
        ? {
            ...layer,
            cells: {
              kind: 'hex-regions',
              version: 1,
              side: 32,
              chunks: layer.cells.chunks.map((chunk) => ({
                ...chunk,
                cells: Uint32Array.from(chunk.cells, (value) => {
                  if (value < 0) return PINTA_HEX_EMPTY_CELL
                  const cell = makePintaHexCell(
                    value,
                    value === 3 ? { rotation: 60, flipY: true } : {},
                  )
                  if (cell === null)
                    throw Error('A Cabana de teste exige índices sem giros quadrados.')
                  return cell
                }),
              })),
            },
          }
        : layer,
    ),
  }
  return {
    map: diamond,
    cabana: hex,
    assets: [...assets.filter((asset) => asset.id !== cabana.id), hex],
  }
}
