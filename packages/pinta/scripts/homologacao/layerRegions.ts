import { isTileLayer, type RegionTilemapAsset } from '../../src/core/project'
import { sparseMemoryMap } from './memoryRegions'

export function explicitLayerMap(): RegionTilemapAsset {
  const map = sparseMemoryMap(),
    first = map.layers[0]
  if (!first || !isTileLayer(first)) throw Error('Camada ausente')
  return {
    ...map,
    layers: [
      {
        ...first,
        kind: 'tiles',
        front: false,
        opacity: 1,
        offsetX: 400000.25,
        offsetY: 0,
        parallaxX: 1,
        properties: {},
      },
    ],
  }
}
