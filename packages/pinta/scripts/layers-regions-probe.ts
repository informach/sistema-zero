import { pintaValuesEqual } from '../src/core/assetEquality'
import { createTilemapAsset, type TilemapAsset } from '../src/core/project'
import { decodeRegionMapDocument, encodeRegionMapDocument } from '../src/core/regionDocument'
import {
  addMapGroup,
  moveMapLayer,
  setMapLayerParent,
  toggleMapLayerCollision,
  updateMapLayer,
} from '../src/tiles/layerTree'
import {
  addLayer,
  addObjectLayer,
  removeLayer,
  setCell,
  toggleLayerFront,
  toggleLayerVisible,
} from '../src/tiles/tilemapOps'
import { explicitLayerMap } from './homologacao/layerRegions'

function legacy() {
  let map = createTilemapAsset({ name: 'vila', tilesetId: 'ground', cols: 4, rows: 4, now: 1 })
  map.id = 'map'
  map.layers[0]!.id = 'ground'
  const states: string[] = []
  function capture(current: TilemapAsset) {
    const ids = new Map(current.layers.map((layer, index) => [layer.id, `layer-${index}`]))
    states.push(
      JSON.stringify({
        ...current,
        layers: current.layers.map((layer) => ({
          ...layer,
          id: ids.get(layer.id),
          ...(layer.parentId ? { parentId: ids.get(layer.parentId) } : {}),
        })),
      }),
    )
  }
  capture(map)
  map = setCell(map, 'ground', 0, 0, 3)
  capture(map)
  map = addLayer(map, 'Água', 'water')
  capture(map)
  const water = map.layers.at(-1)!.id
  map = addMapGroup(map, 'Vila')
  capture(map)
  const group = map.layers.at(-1)!.id
  map = setMapLayerParent(map, water, group)
  capture(map)
  map = updateMapLayer(map, group, {
    opacity: 0.5,
    offsetX: -2.25,
    offsetY: 4.5,
    parallaxX: 0.5,
    properties: { note: 'ok' },
  })
  capture(map)
  map = updateMapLayer(map, group, { offsetX: 0, opacity: 1, properties: {} })
  capture(map)
  map = toggleLayerFront(map, water)
  capture(map)
  map = toggleMapLayerCollision(map, water)
  capture(map)
  map = toggleLayerVisible(map, 'ground')
  capture(map)
  map = moveMapLayer(map, group, -1)
  capture(map)
  map = addObjectLayer(map, 'Portas')
  capture(map)
  map = removeLayer(map, map.layers.at(-1)!.id)
  capture(map)
  return states
}

export function runLayerRegionsProbe() {
  const map = explicitLayerMap(),
    first = map.layers[0]!
  const renamed = updateMapLayer(map, first.id, { name: 'Bosque' })
  const invalid = updateMapLayer(map, first.id, { name: 'Outro', opacity: -1 })
  const added = addLayer(map, 'Frente', map.tilesetId),
    layer = added.layers.at(-1)!
  let full = added
  for (let count = full.layers.length; count < 32; count++) full = addLayer(full, 'Camada')
  const wire = encodeRegionMapDocument(full),
    reopened = wire && decodeRegionMapDocument(JSON.parse(JSON.stringify(wire)))
  return {
    legacy: legacy(),
    regions: {
      metadataPreserved: pintaValuesEqual(renamed.layers[0], { ...first, name: 'Bosque' }),
      noOpShared: updateMapLayer(map, first.id, { name: first.name }) === map,
      invalidRefused: invalid === map,
      cellStorageShared: renamed.layers[0]!.cells === first.cells,
      emptyLayer:
        added !== map && layer.cells?.kind === 'regions' && layer.cells.chunks.length === 0,
      explicitBinding: added !== map && layer.tilesetId === map.tilesetId,
      layers: full.layers.length,
      limitRefused: addLayer(full, 'Excesso') === full,
      roundTrip: reopened !== null && pintaValuesEqual(reopened, full),
    },
  }
}
