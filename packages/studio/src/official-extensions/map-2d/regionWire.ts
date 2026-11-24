import {
  encodePintaHexRegionLayers,
  encodePintaRegionLayers,
  type PintaRegionWire,
} from '@sistemazero/core/creations'
import type {
  PintaProjectedScene,
  PintaProjectedSceneMap,
  PintaProjectedSceneWire,
} from '@sistemazero/core/studio/pinta-projected-scene'
import type {
  PintaRegionScene,
  PintaRegionSceneMap,
} from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaSceneCellsLayer } from '@sistemazero/core/studio/pinta-scene'

type WireMap = Omit<PintaRegionSceneMap, 'layers'> & {
  layers: PintaSceneCellsLayer<PintaRegionWire>[]
}
type WireScene =
  | (Omit<PintaRegionScene, 'layers' | 'sets' | 'physics'> &
      WireMap & {
        physics: 'legacy' | 'precise'
        sets?: WireMap[]
      })
  | PintaProjectedSceneWire

/** Structural subset of Pinta's admitted PNG world. A separately admitted Scene4 can
 * use the same private entry point. PNG display scale does not change Studio units.
 */
export interface AdmittedRegionWorld {
  readonly rootId: string
  readonly maps: ReadonlyMap<
    string,
    { readonly data: { readonly scene: PintaRegionScene | PintaProjectedScene } }
  >
}

export interface RegionWorldPayload {
  rootId: string
  rootAssetName: string
  scenes: WireScene[]
}

export function packRegionWorld(
  world: AdmittedRegionWorld,
  rootAssetName: string,
): RegionWorldPayload {
  if (!world.maps.has(world.rootId) || !rootAssetName)
    throw new Error('O mundo precisa de uma raiz e um nome de material.')
  const packMap = (map: PintaRegionSceneMap): WireMap => {
    const grids = encodePintaRegionLayers(
      map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : [])),
      { ...map.origin, cols: map.cols, rows: map.rows },
    )
    if (!grids) throw new Error('O cenário precisa de regiões já admitidas.')
    let index = 0
    return {
      id: map.id,
      origin: map.origin,
      cols: map.cols,
      rows: map.rows,
      layers: map.layers.map((layer) =>
        layer.kind === 'tiles' ? { ...layer, cells: grids[index++]! } : layer,
      ),
    }
  }
  const packProjected = (
    map: PintaProjectedSceneMap,
  ): NonNullable<PintaProjectedSceneWire['sets']>[number] => {
    const bounds = { ...map.origin, cols: map.cols, rows: map.rows }
    const cells = map.layers.flatMap((layer) => (layer.kind === 'tiles' ? [layer.cells] : []))
    const grids =
      map.projection.kind === 'hexagonal'
        ? encodePintaHexRegionLayers(
            cells.filter((grid) => grid.kind === 'hex-regions'),
            bounds,
          )
        : encodePintaRegionLayers(
            cells.filter((grid) => grid.kind === 'regions'),
            bounds,
          )
    if (!grids || grids.length !== cells.length)
      throw new Error('A projeção precisa de regiões já admitidas.')
    let index = 0
    return {
      ...map,
      layers: map.layers.map((layer) =>
        layer.kind === 'tiles' ? { ...layer, cells: grids[index++]! } : layer,
      ),
    }
  }
  const scenes = [...world.maps].map(
    ([
      id,
      {
        data: { scene },
      },
    ]) => {
      if (id !== scene.id || (scene.physics !== 'legacy' && scene.physics !== 'precise'))
        throw new Error('O cenário precisa de identidade válida e um modo de física explícito.')
      if (scene.version === 5) {
        const { sets, ...root } = scene
        return {
          ...root,
          ...packProjected(scene),
          ...(sets ? { sets: sets.map(packProjected) } : {}),
        }
      }
      const { sets, physics, ...root } = scene
      return { ...root, ...packMap(scene), physics, ...(sets ? { sets: sets.map(packMap) } : {}) }
    },
  )
  return { rootId: world.rootId, rootAssetName, scenes }
}
