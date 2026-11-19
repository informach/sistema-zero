import { expect, it } from 'bun:test'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { gzipSync, zlibSync } from 'fflate'
import { vilaEFloresta } from '../../../scripts/homologacao/fixture'
import { nativeImageOf } from '../../../scripts/homologacao/generate'
import { objectPhysicsScenario } from '../../../scripts/homologacao/physics'
import { createMapObject } from '../../tiles/mapObjects'
import { galleryToPintaJson, importPintaJson } from '../projectJson'
import { exportPintaScene } from '../scene'
import { buildScenePackage } from '../scenePackage'
import { cellToGid, tiledMap, tiledMapXml, tiledTilesetXml } from './export'
import { gidCell, importTiledScene, tiledXmlToJson } from './import'
import { sceneToNative } from './native'

it('Tiled usa objetos separados para imagem e contorno elíptico, sem perder a arte ao voltar', async () => {
  const { map, assets } = objectPhysicsScenario()
  const scene = await exportPintaScene(
    map,
    (id) => assets.find((a) => a.id === id) ?? null,
    nativeImageOf,
  )
  const layer = scene.layers.find((l) => l.kind === 'objects')
  if (layer?.kind !== 'objects') throw new Error('Objetos ausentes')
  const ellipse = layer.objects.find((o) => o.id === 'ellipse')!
  ellipse.art = { assetId: scene.tilesets[0]!.id, tile: 0 }
  const exported = tiledMap(scene)
  const all = (layers: Record<string, unknown>[]): Record<string, unknown>[] =>
    layers.flatMap((l) =>
      l.type === 'group'
        ? all(l.layers as Record<string, unknown>[])
        : ((l.objects as Record<string, unknown>[]) ?? []),
    )
  const objects = all(exported.layers as Record<string, unknown>[])
  expect(objects.filter((o) => o.gid && (o.ellipse || o.polygon || o.polyline || o.point))).toEqual(
    [],
  )
  const drawing = objects.find((o) => o.name === 'Elipse' && o.gid)
  const outline = objects.find((o) => o.name === 'Elipse' && o.ellipse)
  expect(drawing).toBeDefined()
  expect(outline).toBeDefined()
  expect(
    (drawing!.properties as { name: string }[]).some((p) => p.name === 'pinta:collision'),
  ).toBe(false)
  const imported = await importTiledScene(
    tiledXmlToJson(tiledMapXml(exported, true)),
    resolverOf(scene),
  )
  expect(imported.warnings).toEqual([])
  expect(imported.scene).toEqual(scene)
})

it('cena 3 conserva contornos, conjuntos e opção física em JSON e TMX/TSX reais', async () => {
  const { map, assets } = objectPhysicsScenario()
  const scene = await exportPintaScene(
    map,
    (id) => assets.find((a) => a.id === id) ?? null,
    nativeImageOf,
  )
  const exported = tiledMap(scene),
    resolver = resolverOf(scene)
  for (const document of [exported, tiledXmlToJson(tiledMapXml(exported, true))]) {
    const imported = await importTiledScene(document, resolver)
    expect(imported.warnings).toEqual([])
    expect(imported.scene).toEqual(scene)
    const native = await sceneToNative(imported.scene, async (url) => {
      const image = await loadImage(url),
        canvas = createCanvas(image.width, image.height),
        context = canvas.getContext('2d')
      context.drawImage(image, 0, 0)
      return {
        width: image.width,
        height: image.height,
        data: context.getImageData(0, 0, image.width, image.height).data,
      }
    })
    const reopened = importPintaJson(galleryToPintaJson(native.assets))
    const result = reopened.assets.find((a) => a.id === map.id)
    if (result?.kind !== 'tilemap') throw new Error('Mapa perdido')
    expect(result.physics).toBe('precise')
    const again = await exportPintaScene(
      result,
      (id) => reopened.assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
    expect(again).toEqual(scene)
  }
})

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
    // A cena INTEIRA volta igual: geometria, opacidade, deslocamento, parallax, grupos e arte.
    expect(result.scene).toEqual(scene)
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

/** A cena de referência e um leitor de arquivos que devolve as folhas e imagens dela. */
async function referencia() {
  const { map, assets } = vilaEFloresta(),
    scene = await exportPintaScene(
      map,
      (id) => assets.find((a) => a.id === id) ?? null,
      nativeImageOf,
    )
  return { scene, resolver: resolverOf(scene) }
}
function resolverOf(scene: PintaScene) {
  const sheets = tiledMap(scene).tilesets as Record<string, unknown>[]
  return {
    image: async (path: string) => {
      const match = path.match(/(tiles|art)-(\d+)\.png$/)
      if (!match) throw new Error(path)
      return (
        match[1] === 'tiles' ? scene.tilesets[Number(match[2])] : scene.art?.[Number(match[2])]
      )!.image
    },
    text: async (path: string) => tiledTilesetXml(sheets[Number(path.match(/tiles-(\d+)/)?.[1])]!),
  }
}
type Encoding = 'csv' | 'base64' | 'zlib' | 'gzip'
function encoded(gids: number[], encoding: Encoding): string {
  if (encoding === 'csv') return gids.join(',')
  const bytes = new Uint8Array(gids.length * 4),
    view = new DataView(bytes.buffer)
  gids.forEach((gid, i) => {
    view.setUint32(i * 4, gid, true)
  })
  const packed =
    encoding === 'zlib' ? zlibSync(bytes) : encoding === 'gzip' ? gzipSync(bytes) : bytes
  return Buffer.from(packed).toString('base64')
}
/** O mesmo mapa JSON com os dados das camadas na codificação pedida (como o Tiled grava). */
function jsonWith(map: Record<string, unknown>, encoding: Encoding): Record<string, unknown> {
  const layer = (l: Record<string, unknown>): Record<string, unknown> =>
    Array.isArray(l.layers)
      ? { ...l, layers: (l.layers as Record<string, unknown>[]).map(layer) }
      : Array.isArray(l.data)
        ? {
            ...l,
            data: encoded(l.data as number[], encoding),
            encoding: encoding === 'csv' ? 'csv' : 'base64',
            ...(encoding === 'zlib' || encoding === 'gzip' ? { compression: encoding } : {}),
          }
        : l
  return { ...map, layers: (map.layers as Record<string, unknown>[]).map(layer) }
}
/** O mesmo TMX com `<data>` na codificação pedida. */
function xmlWith(xml: string, encoding: Encoding): string {
  return xml.replace(/<data encoding="csv">([^<]*)<\/data>/g, (_all, csv: string) => {
    const gids = csv.split(',').map(Number)
    return encoding === 'csv'
      ? `<data encoding="csv">\n${csv}\n</data>`
      : `<data encoding="base64"${encoding === 'base64' ? '' : ` compression="${encoding}"`}>\n  ${encoded(gids, encoding)}\n</data>`
  })
}

for (const encoding of ['csv', 'base64', 'zlib', 'gzip'] as const)
  it(`a cena inteira volta igual com as camadas em ${encoding}, em JSON e em TMX`, async () => {
    const { scene, resolver } = await referencia(),
      json = tiledMap(scene)
    const fromJson = await importTiledScene(jsonWith(json, encoding), resolver)
    expect(fromJson.warnings).toEqual([])
    expect(fromJson.scene).toEqual(scene)
    for (const external of [true, false]) {
      const xml = xmlWith(tiledMapXml(json, external), encoding)
      expect(xml).toContain(encoding === 'csv' ? 'encoding="csv"' : 'encoding="base64"')
      const fromXml = await importTiledScene(tiledXmlToJson(xml), resolver)
      expect(fromXml.warnings).toEqual([])
      expect(fromXml.scene).toEqual(scene)
    }
  })

it('grupos dentro de grupos voltam com pais, opacidade, deslocamento e parallax', async () => {
  const { scene: base } = await referencia()
  const [first, second, ...rest] = base.layers.filter((l) => !l.parentId && l.kind !== 'group')
  if (!first || !second) throw new Error('A referência precisa de duas camadas soltas.')
  const scene: PintaScene = {
    ...base,
    layers: [
      { id: 'fora', kind: 'group', name: 'Fora', visible: true, opacity: 0.75, offsetX: 3 },
      {
        id: 'dentro',
        kind: 'group',
        name: 'Dentro',
        visible: false,
        parentId: 'fora',
        offsetY: -5,
        parallaxX: 0.5,
        parallaxY: 2,
        locked: true,
        properties: { clima: 'chuva' },
      },
      { ...first, parentId: 'dentro', opacity: 0.25, offsetX: 1.5, parallaxY: 0.25 },
      { ...second, parentId: 'fora' },
      ...rest,
      ...base.layers.filter((l) => l.parentId || l.kind === 'group'),
    ],
  }
  const json = tiledMap(scene),
    resolver = resolverOf(scene)
  const tree = (
    json.layers as { name: string; layers?: { name: string; layers?: unknown[] }[] }[]
  )[0]
  expect(tree?.name).toBe('Fora')
  expect(tree?.layers?.map((l) => l.name)).toEqual(['Dentro', second.name])
  expect(tree?.layers?.[0]?.layers?.length).toBe(1)
  for (const result of [
    await importTiledScene(JSON.parse(JSON.stringify(json)), resolver),
    await importTiledScene(tiledXmlToJson(tiledMapXml(json, true)), resolver),
    await importTiledScene(tiledXmlToJson(tiledMapXml(json, false)), resolver),
  ]) {
    expect(result.warnings).toEqual([])
    expect(result.scene).toEqual(scene)
  }
})

it('uma propriedade de várias linhas e com sinais do XML atravessa o TMX sem mudar', async () => {
  const { scene: base } = await referencia()
  const fala = 'Olá!\nSegunda linha\tcom tabulação\r\n"aspas" \'simples\' <b> & fim'
  const scene: PintaScene = {
    ...base,
    layers: base.layers.map((l) =>
      l.kind === 'objects'
        ? {
            ...l,
            properties: { ...l.properties, recado: fala },
            objects: l.objects.map((o, i) =>
              i === 0 ? { ...o, name: 'a "b" <c>', properties: { ...o.properties, fala } } : o,
            ),
          }
        : l,
    ),
  }
  const xml = tiledMapXml(tiledMap(scene), true)
  expect(xml).toContain('&#10;Segunda linha&#9;com tabulação&#13;&#10;&quot;aspas&quot;')
  const result = await importTiledScene(tiledXmlToJson(xml), resolverOf(scene))
  expect(result.warnings).toEqual([])
  expect(result.scene).toEqual(scene)
})
