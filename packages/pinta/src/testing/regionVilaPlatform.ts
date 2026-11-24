import { isObjectLayer, isTileLayer, tileLayerTilesetId } from '../core/project'
import { setCells } from '../tiles/tilemapOps'
import { regionVila } from './regionVila'

/** A signed, walkable test area beside the authentic Vila and Cabana artwork. */
export function regionVilaPlatform() {
  const { map, cabana, assets } = regionVila()
  const layer = map.layers.find(
    (candidate) => isTileLayer(candidate) && tileLayerTilesetId(map, candidate) === 'vila-pecas',
  )
  const sheet = assets.find((asset) => asset.kind === 'tileset' && asset.id === 'vila-pecas')
  if (!layer || sheet?.kind !== 'tileset') throw Error('Camada ou folha de chão ausente')
  const areaPoints = (row: number) =>
    Array.from({ length: 7 }, (_, index) => ({ col: index - 3, row }))
  const withArea = setCells(
    setCells({ ...map, physics: 'precise' }, layer.id, areaPoints(-4), sheet.tiles.length),
    layer.id,
    areaPoints(-2),
    17,
  )
  return {
    map: {
      ...withArea,
      layers: withArea.layers.map((candidate) =>
        isObjectLayer(candidate)
          ? {
              ...candidate,
              objects: candidate.objects.map((object) =>
                object.role === 'start'
                  ? { ...object, x: 8, y: -45 }
                  : object.role === 'door'
                    ? { ...object, x: 80, y: -48 }
                    : object,
              ),
            }
          : candidate,
      ),
    },
    cabana,
    assets: assets.map((asset) =>
      asset === sheet
        ? {
            ...sheet,
            tiles: [...sheet.tiles, sheet.tiles[3]!],
            solid: [...(sheet.solid ?? sheet.tiles.map(() => false)), false],
            platform: [...sheet.tiles.map(() => false), true],
          }
        : asset,
    ),
  }
}
