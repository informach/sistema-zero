import type { PintaRegionCells } from '@sistemazero/core/creations'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaScene, PintaSceneCellsLayer } from '@sistemazero/core/studio/pinta-scene'
import { sceneArtFrame, sceneLayerState } from '@sistemazero/core/studio/pinta-scene-runtime'
import { cellTile } from '../tiles/cell'
import { cellMatrix } from '../tiles/chunks'
import { createTileCellReader, mapCellBounds } from '../tiles/mapCells'
import { MAP_IMAGE_LIMITS, MapImageBudgetError, mapImageSize } from '../tiles/mapImageBudget'

type DrawableScene = PintaScene | PintaRegionScene
type DrawableLayer = PintaSceneCellsLayer<number[] | PintaRegionCells>
type DrawableBounds = { cols: number; rows: number; origin?: { col: number; row: number } }

/** Compositor estático/animado compartilhado pela imagem de exportação e pelo teste no Pinta. */
export async function loadSceneImages(
  scene: Pick<PintaScene, 'tilesets' | 'art'>,
): Promise<Map<string, HTMLImageElement>> {
  const result = new Map<string, HTMLImageElement>()
  await Promise.all(
    [...scene.tilesets, ...(scene.art ?? [])].map(async (a) => {
      const image = new Image()
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Não foi possível abrir uma imagem do cenário.'))
        image.src = a.image
      })
      result.set(a.id, image)
    }),
  )
  return result
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: DrawableScene,
  images: ReadonlyMap<string, CanvasImageSource>,
  pass: 'back' | 'front',
  time = 0,
  camera = { x: 0, y: 0 },
): void {
  const size = scene.tileSize
  function animatedTile(
    tile: number,
    animations: PintaScene['tilesets'][number]['animations'],
  ): number {
    const frames = animations?.[tile]
    if (frames?.length) {
      let at = time % frames.reduce((n, frame) => n + frame.duration, 0)
      for (const frame of frames) {
        at -= frame.duration
        if (at < 0) return frame.tile
      }
    }
    return tile
  }
  function paint(layers: DrawableLayer[], bounds: DrawableBounds, view = camera): void {
    for (const l of layers) {
      const e = sceneLayerState(layers, l)
      if (!e.visible || !e.opacity) continue
      ctx.save()
      ctx.globalAlpha *= e.opacity
      ctx.translate(e.offsetX + view.x * (1 - e.parallaxX), e.offsetY + view.y * (1 - e.parallaxY))
      if (l.kind === 'tiles' && !l.collision && !!l.front === (pass === 'front')) {
        const ts = scene.tilesets.find((t) => t.id === l.tilesetId),
          image = images.get(l.tilesetId)
        if (ts && image) {
          const cell = (value: number, col: number, row: number) => {
            if (value < 0) return
            const tile = animatedTile(cellTile(value), ts.animations)
            ctx.save()
            ctx.translate((col + 0.5) * size, (row + 0.5) * size)
            ctx.transform(...cellMatrix(value), 0, 0)
            ctx.drawImage(
              image,
              (tile % ts.columns) * size,
              Math.floor(tile / ts.columns) * size,
              size,
              size,
              -size / 2,
              -size / 2,
              size,
              size,
            )
            ctx.restore()
          }
          if (Array.isArray(l.cells))
            l.cells.forEach((value, i) => {
              cell(value, i % bounds.cols, Math.floor(i / bounds.cols))
            })
          else {
            const rect = mapCellBounds(bounds)
            createTileCellReader(l.cells, rect).visitOccupied(rect, cell, 'row-major')
          }
        }
      }
      if (l.kind === 'objects')
        for (const o of l.objects) {
          ctx.save()
          ctx.translate(o.x, o.y)
          ctx.rotate(((o.rotation ?? 0) * Math.PI) / 180)
          ctx.translate(o.flipX ? o.width : 0, o.flipY ? o.height : 0)
          ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1)
          if (o.setId) {
            const set = scene.sets?.find((s) => s.id === o.setId)
            if (set) {
              ctx.scale(o.width / (set.cols * size), o.height / (set.rows * size))
              if ('origin' in set) ctx.translate(-set.origin.col * size, -set.origin.row * size)
              paint(set.layers, set, { x: 0, y: 0 })
            }
          } else if (o.art && pass === 'back') {
            const image = images.get(o.art.assetId),
              ts = scene.tilesets.find((t) => t.id === o.art?.assetId)
            if (image) {
              if (ts) {
                const tile = animatedTile(o.art.tile ?? 0, ts.animations)
                ctx.drawImage(
                  image,
                  (tile % ts.columns) * size,
                  Math.floor(tile / ts.columns) * size,
                  size,
                  size,
                  0,
                  0,
                  o.width,
                  o.height,
                )
              } else {
                const art = scene.art?.find((a) => a.id === o.art?.assetId)
                if (art) {
                  const frame = sceneArtFrame(art, o.art.animationId, time)
                  ctx.drawImage(
                    image,
                    frame.x,
                    frame.y,
                    frame.width,
                    frame.height,
                    0,
                    0,
                    o.width,
                    o.height,
                  )
                }
              }
            }
          }
          ctx.restore()
        }
      ctx.restore()
    }
  }
  paint(scene.layers, scene)
}

export async function scenePng(
  scene: DrawableScene,
  scale = 1,
  maxPx = Infinity,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const actual = Math.min(scale, maxPx / (Math.max(scene.cols, scene.rows) * scene.tileSize))
  if ('origin' in scene && !mapImageSize(scene, scene.tileSize, scale, maxPx))
    throw new MapImageBudgetError()
  if (scene.cols * scene.rows * (scene.tileSize * actual) ** 2 > MAP_IMAGE_LIMITS.pixels)
    throw new Error(
      'A imagem ficou grande demais. Use uma escala menor ou baixe o cenário como projeto.',
    )
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(scene.cols * scene.tileSize * actual))
  canvas.height = Math.max(1, Math.round(scene.rows * scene.tileSize * actual))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const images = await loadSceneImages(scene)
  ctx.imageSmoothingEnabled = false
  ctx.scale(actual, actual)
  if ('origin' in scene)
    ctx.translate(-scene.origin.col * scene.tileSize, -scene.origin.row * scene.tileSize)
  drawScene(ctx, scene, images, 'back')
  drawScene(ctx, scene, images, 'front')
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}
