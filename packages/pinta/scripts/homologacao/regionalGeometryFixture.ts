import { encodePintaRegionLayers } from '@sistemazero/core/creations'
import {
  type PintaRegionSceneWire,
  readPintaRegionScene,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { denseToRegionCells } from '../../src/tiles/regionCells'

export { createRegionSceneQueries } from '@sistemazero/core/studio/pinta-scene-query'
export { readRegionPhaserWorld } from '../../src/export/phaser/regionPlayer'

/** Independent dense geometry cases migrate through the same sparse cell codec as old files. */
export function regionalGeometryFixture(source: PintaScene): PintaRegionSceneWire {
  function convert(map: Pick<PintaScene, 'cols' | 'rows' | 'layers'>) {
    const bounds = { col: 0, row: 0, cols: map.cols, rows: map.rows }
    const grids = map.layers.flatMap((layer) => {
      if (layer.kind !== 'tiles') return []
      const cells = denseToRegionCells(Int16Array.from(layer.cells), bounds)
      if (!cells) throw Error('A geometria da fixture não pôde ser migrada.')
      return [cells]
    })
    const encoded = encodePintaRegionLayers(grids, bounds)
    if (!encoded) throw Error('A fixture regional não pôde ser codificada.')
    let index = 0
    return {
      ...map,
      origin: { col: 0, row: 0 },
      layers: map.layers.map((layer) =>
        layer.kind === 'tiles' ? { ...layer, cells: encoded[index++]! } : layer,
      ),
    }
  }
  const wire = {
    ...convert(source),
    version: 4 as const,
    physics: 'precise' as const,
    ...(source.sets ? { sets: source.sets.map((set) => ({ ...convert(set), id: set.id })) } : {}),
  }
  if (!readPintaRegionScene(JSON.stringify(wire)))
    throw Error('A fixture regional não passou pela admissão.')
  return wire as PintaRegionSceneWire
}

export { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
export { createRegionPhaserPlayer } from '../../src/export/phaser/regionPlayer'
