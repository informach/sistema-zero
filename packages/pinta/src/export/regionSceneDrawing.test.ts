import { expect, test } from 'bun:test'
import { createCanvas } from '@napi-rs/canvas'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import { readPintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaScene } from '@sistemazero/core/studio/pinta-scene'
import { scene4Fixture } from '../../../core/tests/fixtures/pinta-region-scene'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import type { PintaMemoryAsset } from '../core/assetMemory'
import {
  isObjectLayer,
  isTileLayer,
  type RegionTilemapAsset,
  type TilemapAsset,
} from '../core/project'
import { prepareMapRegions } from '../tiles/regionMap'
import { exportPintaRegionScene } from './regionScene'
import { exportPintaScene } from './scene'
import { drawScene, scenePng } from './sceneDrawing'

function signed(map: TilemapAsset, offset: number): RegionTilemapAsset {
  const result = prepareMapRegions(map)
  if (!result.ok) throw Error(result.reason)
  return {
    ...result.map,
    origin: { col: offset, row: offset },
    layers: result.map.layers.map((layer) =>
      isTileLayer(layer)
        ? {
            ...layer,
            cells: {
              ...layer.cells,
              chunks: layer.cells.chunks.map((chunk) => ({
                ...chunk,
                col: chunk.col + offset / 32,
                row: chunk.row + offset / 32,
              })),
            },
          }
        : isObjectLayer(layer)
          ? {
              ...layer,
              objects: layer.objects.map((object) => ({
                ...object,
                x: object.x + offset * 16,
                y: object.y + offset * 16,
              })),
            }
          : layer,
    ),
  }
}

function images(scene: PintaScene) {
  const result = new Map<string, CanvasImageSource>()
  for (const art of [
    ...scene.tilesets.map((sheet) => ({
      id: sheet.id,
      width: sheet.columns * scene.tileSize,
      height: Math.ceil(sheet.count / sheet.columns) * scene.tileSize,
    })),
    ...(scene.art ?? []),
  ]) {
    const canvas = createCanvas(art.width, art.height),
      ctx = canvas.getContext('2d')
    for (let y = 0; y < art.height; y += 3)
      for (let x = 0; x < art.width; x += 3) {
        ctx.fillStyle = `rgba(${(x * 13 + y * 7) % 256},${(x * 3 + y * 17) % 256},${(x * 7 + y * 11) % 256},${(((x + y) % 4) + 1) / 4})`
        ctx.fillRect(x, y, 3, 3)
      }
    result.set(art.id, canvas as unknown as CanvasImageSource)
  }
  return result
}
function pixels(
  scene: PintaScene | PintaRegionScene,
  art: ReadonlyMap<string, CanvasImageSource>,
  pass: 'back' | 'front',
  time: number,
) {
  const canvas = createCanvas(128, 96),
    ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.scale(0.25, 0.25)
  if ('origin' in scene)
    ctx.translate(-scene.origin.col * scene.tileSize, -scene.origin.row * scene.tileSize)
  drawScene(ctx as unknown as CanvasRenderingContext2D, scene, art, pass, time, {
    x: 7.25,
    y: -2.5,
  })
  return Buffer.from(ctx.getImageData(0, 0, 128, 96).data)
}

test('scene 4 composition preserves dense pixels for all set reflections, rotation, animation, alpha and signed origins', async () => {
  let comparisons = 0,
    visible = 0
  for (const rotation of [0, 90, 180, 270])
    for (const flipX of [false, true])
      for (const flipY of [false, true]) {
        const { map, assets } = vilaEFloresta()
        const floor = map.layers.find(isTileLayer)
        if (!floor) throw Error('Chão ausente')
        for (let flags = 0; flags < 8; flags++) floor.cells[flags] = flags * 4096 + 2
        const group = map.layers.find((layer) => layer.kind === 'group')
        if (group) {
          group.opacity = 0.5
          group.offsetX = 0.25
          group.parallaxY = 0.5
        }
        const instance = map.layers
          .flatMap((layer) => (isObjectLayer(layer) ? layer.objects : []))
          .find((object) => object.setId)
        if (!instance) throw Error('Conjunto ausente')
        instance.rotation = rotation
        instance.flipX = flipX ? true : undefined
        instance.flipY = flipY ? true : undefined
        const dense = await exportPintaScene(
          map,
          (id) => assets.find((asset) => asset.id === id) ?? null,
          async () => 'png',
        )
        const art = images(dense)
        for (const offset of [0, -32]) {
          const regionalAssets: PintaMemoryAsset[] = assets.map((asset) =>
            asset.kind === 'tilemap'
              ? signed(asset, offset)
              : asset.kind === 'map-set'
                ? { ...asset, schema: 8, map: signed(asset.map, offset) }
                : asset,
          )
          const root = regionalAssets.find((asset) => asset.id === map.id)
          if (root?.kind !== 'tilemap' || !('origin' in root)) throw Error('Mapa regional ausente')
          const { scene } = await exportPintaRegionScene(
            root,
            (id) => regionalAssets.find((asset) => asset.id === id) ?? null,
            async () => 'png',
          )
          for (const time of [0, 125, 450])
            for (const pass of ['back', 'front'] as const) {
              const expected = pixels(dense, art, pass, time),
                actual = pixels(scene, art, pass, time)
              expect(actual, `${rotation}/${flipX}/${flipY}/${offset}/${time}/${pass}`).toEqual(
                expected,
              )
              if (actual.some((value) => value !== 0)) visible++
              comparisons++
            }
        }
      }
  expect(comparisons).toBe(192)
  expect(visible).toBe(192)
}, 20000)

test('sparse composition draws signed cells without materializing the 100-million-cell rectangle', () => {
  const scene = readPintaRegionScene(JSON.stringify(scene4Fixture()))
  if (!scene) throw Error('Cena ausente')
  const sheet = createCanvas(64, 16),
    brush = sheet.getContext('2d')
  brush.fillStyle = 'red'
  brush.fillRect(0, 0, 64, 16)
  const canvas = createCanvas(128, 16),
    ctx = canvas.getContext('2d')
  ctx.translate(1024, 1024)
  drawScene(
    ctx as unknown as CanvasRenderingContext2D,
    scene,
    new Map([['ground', sheet as unknown as CanvasImageSource]]),
    'back',
  )
  expect(ctx.getImageData(0, 0, 128, 16).data.some((value) => value !== 0)).toBe(true)
  expect(scene.cols * scene.rows).toBe(100000000)
  expect(
    scene.layers
      .filter((layer) => layer.kind === 'tiles')
      .every((layer) => layer.cells.chunks.length === 1),
  ).toBe(true)
})

test('regional scene PNG refuses unbounded or invalid resolution before requesting DOM or art images', async () => {
  const scene = readPintaRegionScene(JSON.stringify(scene4Fixture()))
  if (!scene) throw Error('Cena ausente')
  for (const scale of [1, 0, -1, NaN, Infinity])
    await expect(scenePng(scene, scale)).rejects.toThrow('imagem ficou grande')
  await expect(scenePng(scene, 1, 0)).rejects.toThrow('imagem ficou grande')
})
