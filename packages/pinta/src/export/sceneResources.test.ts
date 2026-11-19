import { expect, it } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import { PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import { sceneArtFrame } from '@sistemazero/core/studio/pinta-scene-runtime'
import { frameDurationsMs } from '../animation/timing'
import {
  createPixelSpriteAsset,
  createTilemapAsset,
  createTilesetAsset,
  isObjectLayer,
} from '../core/project'
import { addMapObject, createMapObject } from '../tiles/mapObjects'
import { freezeObjectResource } from '../tiles/resourceVersions'
import { addObjectLayer } from '../tiles/tilemapOps'
import { exportPintaScene } from './scene'
import { drawScene } from './sceneDrawing'
import { tiledMap, tiledMapXml, tiledSceneWarnings, tiledTilesetXml } from './tiled/export'
import { importTiledScene, tiledXmlToJson } from './tiled/import'
import { sceneToNative } from './tiled/native'

async function fixture(loop = true) {
  const sprite = createPixelSpriteAsset({ name: 'vento', frameSize: 16 })
  const first = sprite.animations[0]!
  sprite.animations.push({
    ...first,
    id: 'vento',
    name: 'vento',
    fps: 4,
    loop,
    easing: 'ease',
    frames: [first.frames[0]!, first.frames[0]!, first.frames[0]!],
  })
  const tileset = createTilesetAsset({ name: 'terra', tileSize: 16 })
  let map = addObjectLayer(
    createTilemapAsset({ name: 'vila', tilesetId: tileset.id, cols: 2, rows: 2 }),
    'Árvores',
  )
  const layer = map.layers.at(-1)!
  const object = createMapObject({
    shape: 'art',
    x: 0,
    y: 0,
    width: 16,
    height: 16,
    art: { assetId: sprite.id, animationId: 'vento' },
    properties: { premio: { type: 'asset', value: 'premio' } },
  })
  map = addMapObject(map, layer.id, object)
  const prize = { ...createPixelSpriteAsset({ name: 'premio', frameSize: 16 }), id: 'premio' }
  const assets = [sprite, tileset, prize]
  const find = (id: string) => assets.find((a) => a.id === id) ?? null
  const frozen = freezeObjectResource(map, layer.id, object.id, find, 100)
  if (!frozen.ok) throw new Error(frozen.reason)
  const scene = await exportPintaScene(frozen.map, find, async () => 'data:image/png;base64,AA==')
  return { scene, map: frozen.map, layerId: layer.id, sprite }
}

it('a cena guarda versões, recursos lógicos e todas as animações, sem promover cenas antigas', async () => {
  const { scene, sprite } = await fixture()
  expect(scene.version).toBe(2)
  expect(scene.art?.some((a) => a.id === 'premio')).toBe(true)
  expect(scene.resources?.[0]?.sourceId).toBe(sprite.id)
  const pinned = scene.art?.find((a) => a.id === scene.resources?.[0]?.id)
  expect(pinned?.sprite?.animations.map((a) => a.id)).toEqual([sprite.animations[0]!.id, 'vento'])
  expect(pinned?.sprite?.animations[1]?.frames.map((f) => f.duration)).toEqual(
    frameDurationsMs(3, 4, 'ease'),
  )
  expect(PintaSceneSchema.safeParse({ ...scene, version: 1 }).success).toBe(false)
  expect(
    PintaSceneSchema.safeParse({ ...scene, art: scene.art?.filter((a) => a !== pinned) }).success,
  ).toBe(false)
  expect(
    PintaSceneSchema.safeParse({
      ...scene,
      art: scene.art?.map((a) => (a === pinned ? { ...a, width: 15 } : a)),
    }).success,
  ).toBe(false)
})

it('o compositor desenha pixels de quadros diferentes e prende o último quando não repete', async () => {
  const { scene } = await fixture(false)
  const pinned = scene.art!.find((a) => a.id === scene.resources![0]!.id)!
  const sheet = createCanvas(pinned.width, pinned.height),
    brush = sheet.getContext('2d')
  const colors = ['#112233', '#ff0000', '#00ff00', '#0000ff']
  pinned
    .sprite!.animations.flatMap((a) => a.frames)
    .forEach((f, i) => {
      const rect = {
        x: (f.tile % pinned.sprite!.columns) * 16,
        y: Math.floor(f.tile / pinned.sprite!.columns) * 16,
      }
      brush.fillStyle = colors[i]!
      brush.fillRect(rect.x, rect.y, 16, 16)
    })
  const target = createCanvas(32, 32),
    ctx = target.getContext('2d')
  const images = new Map([[pinned.id, sheet as unknown as CanvasImageSource]])
  const samples = [0, 400, 1000, 10000].map((time) => {
    ctx.clearRect(0, 0, 32, 32)
    drawScene(ctx as unknown as CanvasRenderingContext2D, scene, images, 'back', time)
    return [...ctx.getImageData(8, 8, 1, 1).data]
  })
  expect(samples).toEqual([
    [255, 0, 0, 255],
    [0, 255, 0, 255],
    [0, 0, 255, 255],
    [0, 0, 255, 255],
  ])
  expect(sceneArtFrame(pinned, undefined, 1000)).toEqual({ x: 0, y: 0, width: 16, height: 16 })
  expect(tiledSceneWarnings(scene).join(' ')).toContain('último quadro')
})

it('JSON e TMX Tiled conservam animações específicas e versões no round-trip editável', async () => {
  const { scene } = await fixture()
  const tiled = tiledMap(scene)
  const sheets = tiled.tilesets as Record<string, unknown>[]
  const resolver = {
    image: async (path: string) => path,
    text: async (path: string) => tiledTilesetXml(sheets[Number(path.match(/tiles-(\d+)/)?.[1])]!),
  }
  for (const document of [tiled, tiledXmlToJson(tiledMapXml(tiled, true))]) {
    const imported = await importTiledScene(document, resolver)
    expect(imported.scene.version).toBe(2)
    expect(imported.scene.resources).toEqual(scene.resources)
    expect(imported.scene.art?.map((a) => a.sprite)).toEqual(scene.art?.map((a) => a.sprite))
    expect(imported.scene.layers).toEqual(scene.layers)
  }
  const unique = {
    ...scene,
    tilesets: scene.tilesets.map((a) => ({ ...a, image: a.id })),
    art: scene.art!.map((a) => ({ ...a, image: a.id })),
  }
  const converted = await sceneToNative(unique, async (id) => {
    const art = unique.art.find((a) => a.id === id)
    const width = art?.width ?? 16,
      height = art?.height ?? 16
    return { width, height, data: new Uint8ClampedArray(width * height * 4) }
  })
  const map = converted.assets.find((a) => a.kind === 'tilemap')
  if (map?.kind !== 'tilemap') throw new Error('Map expected')
  expect(map.resources?.[0]?.asset.kind).toBe('pixel-sprite')
  const objects = map.layers.find(isObjectLayer)!.objects
  expect(objects[0]!.art?.animationId).toBe('vento')
  expect(converted.assets.some((a) => a.id === scene.resources![0]!.id)).toBe(false)
})

it('Tiled não anima a cópia estática de um sprite usado também por uma instância animada', async () => {
  const { scene } = await fixture()
  const layer = scene.layers.find((l) => l.kind === 'objects')!
  if (layer.kind !== 'objects') throw new Error('Objects expected')
  const animated = layer.objects[0]!
  layer.objects.push({ ...animated, id: 'static', art: { assetId: animated.art!.assetId } })
  const document = tiledMap(scene)
  const sheets = document.tilesets as Array<{
    firstgid: number
    tilecount: number
    tiles: Array<{ animation?: unknown }>
  }>
  const objects = (document.layers as Array<{ objects?: Array<{ gid: number }> }>).flatMap(
    (l) => l.objects ?? [],
  )
  const sheetOf = (gid: number) =>
    sheets.find(
      (s) => (gid & 0x0fffffff) >= s.firstgid && (gid & 0x0fffffff) < s.firstgid + s.tilecount,
    )!
  expect(sheetOf(objects[0]!.gid).tiles.some((t) => t.animation)).toBe(true)
  expect(sheetOf(objects[1]!.gid).tiles.some((t) => t.animation)).toBe(false)
  const imported = await importTiledScene(document, {
    image: async (path) => path,
    text: async () => '',
  })
  expect(imported.scene.layers).toEqual(scene.layers)
})
