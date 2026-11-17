import { expect, it } from 'bun:test'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { vilaEFloresta } from '../../../scripts/homologacao/fixture'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { createMapObject } from '../../tiles/mapObjects'
import { galleryToPintaJson, importPintaJson } from '../projectJson'
import { exportPintaScene } from '../scene'
import { buildScenePackage } from '../scenePackage'
import { cellToGid, tiledMap, tiledMapXml, tiledTilesetXml } from './export'
import { gidCell, importTiledScene, tiledXmlToJson } from './import'
import { sceneToNative } from './native'

it('o pacote inclui o destino de uma porta que pertence a um conjunto vinculado', async () => {
  const { map, assets } = vilaEFloresta(),
    set = assets.find((a) => a.kind === 'map-set')!
  if (set.kind !== 'map-set') throw new Error('Conjunto ausente')
  set.map.layers.push({
    id: 'porta-no-conjunto',
    kind: 'objects',
    name: 'Porta',
    visible: true,
    objects: [
      createMapObject({
        role: 'door',
        shape: 'rect',
        width: 16,
        height: 16,
        properties: { destino: 'cabana' },
      }),
    ],
  })
  map.layers = map.layers.map((l) =>
    l.kind === 'objects' ? { ...l, objects: l.objects.filter((o) => o.role !== 'door') } : l,
  )
  const files = await buildScenePackage(map, assets, 'tiled', { imageOf: nativeImageOf })
  expect(Object.keys(JSON.parse(String(files['maps.json'])))).toEqual(['vila-e-floresta', 'cabana'])
})

it('os oito espelhos e giros sobrevivem aos gids sem perder a peça', () => {
  for (let flags = 0; flags < 8; flags++) {
    const cell = 17 | (flags << 12)
    expect(gidCell(cellToGid(cell, 201), 201)).toBe(cell)
  }
})
it('A Vila e a Floresta atravessa JSON, TMX/TSX, desenhos e novo cenário', async () => {
  const { map, assets } = vilaEFloresta(),
    scene = await exportPintaScene(
      map,
      (id) => assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
  const json = tiledMap(scene),
    sheets = json.tilesets as Record<string, unknown>[]
  const image = async (path: string) => {
    const match = path.match(/(tiles|art)-(\d+)\.png$/)
    if (!match) throw new Error(path)
    return (
      match[1] === 'tiles' ? scene.tilesets[Number(match[2])] : scene.art?.[Number(match[2])]
    )!.image
  }
  const resolver = {
    image,
    text: async (path: string) => tiledTilesetXml(sheets[Number(path.match(/tiles-(\d+)/)?.[1])]!),
  }
  const fromJson = await importTiledScene(json, resolver)
  const fromXml = await importTiledScene(tiledXmlToJson(tiledMapXml(json, true)), resolver)
  for (const result of [fromJson, fromXml]) {
    expect(result.warnings).toEqual([])
    expect(result.scene.layers.length).toBe(scene.layers.length)
    expect(result.scene.layers.filter((l) => l.kind === 'tiles').map((l) => l.cells)).toEqual(
      scene.layers.filter((l) => l.kind === 'tiles').map((l) => l.cells),
    )
    expect(result.scene.sets).toEqual(scene.sets)
    expect(result.scene.tilesets[0]?.terrains).toEqual(scene.tilesets[0]?.terrains)
    expect(result.scene.art?.map((a) => a.id)).toEqual(scene.art?.map((a) => a.id))
    const converted = await sceneToNative(result.scene, async (url) => {
      const im = await loadImage(url),
        c = createCanvas(im.width, im.height),
        ctx = c.getContext('2d')
      ctx.drawImage(im, 0, 0)
      return {
        width: c.width,
        height: c.height,
        data: ctx.getImageData(0, 0, c.width, c.height).data,
      }
    })
    const parsed = importPintaJson(galleryToPintaJson(converted.assets))
    expect(parsed.warnings).toEqual([])
    const map = parsed.assets.find((a) => a.kind === 'tilemap')
    if (map?.kind !== 'tilemap') throw new Error('Mapa perdido')
    const again = await exportPintaScene(
      map,
      (id) => parsed.assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
    expect(
      again.layers
        .filter((l) => l.kind === 'objects')
        .flatMap((l) => l.objects)
        .map((o) => [o.id, o.role, o.properties]),
    ).toEqual(
      scene.layers
        .filter((l) => l.kind === 'objects')
        .flatMap((l) => l.objects)
        .map((o) => [o.id, o.role, o.properties]),
    )
    expect(again.tilesets[1]?.animations).toEqual(scene.tilesets[1]?.animations)
  }
})
