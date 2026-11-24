import { mapFeaturesInUse } from '../src/components/editor/mapTools/mapLevels'
import { pintaValuesEqual } from '../src/core/assetEquality'
import { resizeAsset, resizeTargetOf } from '../src/core/assetResize'
import { createTilemapAsset, type TilemapAsset } from '../src/core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../src/core/regionDocument'
import { CELL_FLIP_H, makeCell } from '../src/tiles/cell'
import { growTilemap } from '../src/tiles/tilemapOps'
import { resizeRegionWorld } from './homologacao/resizeRegions'

export function runResizeRegionsProbe() {
  const legacy: string[] = []
  for (let n = 0; n < 64; n++) {
    const original = createTilemapAsset({
      name: 'Legado',
      tilesetId: 'ground',
      cols: 4,
      rows: 4,
      now: 0,
    })
    const map: TilemapAsset = {
      ...original,
      id: 'map',
      layers: [
        {
          id: 'floor',
          name: 'Fundo',
          visible: true,
          cells: Int16Array.from({ length: 16 }, (_, i) =>
            i % 3 === 0 ? -1 : makeCell(i % 4, i % 2 ? CELL_FLIP_H : 0),
          ),
        },
        {
          kind: 'objects',
          id: 'objects',
          name: 'Objetos',
          visible: true,
          objects: [
            {
              id: 'door',
              name: 'Porta',
              type: '',
              x: 4.5,
              y: 8.25,
              width: 16,
              height: 16,
              properties: { destino: 'floresta' },
            },
          ],
        },
      ],
    }
    legacy.push(
      JSON.stringify({
        target: resizeTargetOf(map),
        resized: resizeAsset(map, (n % 8) + 1, (n % 6) + 1, n % 2 ? 'center' : 'top-left', {
          tileSize: 16,
        }),
        grown: growTilemap(map, (['left', 'right', 'top', 'bottom'] as const)[n % 4]!, 16),
        features: mapFeaturesInUse(map, []),
      }),
    )
  }
  const base = resizeRegionWorld(),
    grown = growTilemap(base, 'left', 16),
    large = resizeAsset(base, 10000, 10000, 'top-left'),
    cropped = resizeAsset(base, 2, 2, 'center', { tileSize: 16 })
  let transform = false
  try {
    transform = mapFeaturesInUse(base, []).transform === true
  } catch {
    /* Historical dense-only implementation. */
  }
  const wire = cropped && encodeRegionMapDocument(cropped)
  return {
    legacy,
    regions: {
      target: resizeTargetOf(base)?.max,
      growShared: grown.layers === base.layers,
      growOrigin: grown.origin,
      largeCols: large?.cols,
      largeShared: large?.layers === base.layers,
      cropOrigin: cropped?.origin,
      objectsShared: cropped?.layers.at(-1) === base.layers.at(-1),
      roundTrip:
        !!wire &&
        pintaValuesEqual(decodeRegionMapDocument(JSON.parse(JSON.stringify(wire))), cropped),
      transform,
    },
  }
}
