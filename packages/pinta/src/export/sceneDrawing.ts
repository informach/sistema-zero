import type { PintaRegionCells } from '@sistemazero/core/creations'
import type { PintaRegionScene } from '@sistemazero/core/studio/pinta-region-scene'
import type { PintaScene, PintaSceneCellsLayer } from '@sistemazero/core/studio/pinta-scene'
import type { PintaRegionSceneQuery } from '@sistemazero/core/studio/pinta-scene-query'
import { sceneArtFrame, sceneLayerState } from '@sistemazero/core/studio/pinta-scene-runtime'
import { cellMatrix, cellTile } from '../tiles/cell'
import { createTileCellReader, mapCellBounds } from '../tiles/mapCellReader'
import { MAP_IMAGE_LIMITS, MapImageBudgetError, mapImageSize } from '../tiles/mapImageBudget'

type DrawableScene = PintaScene | PintaRegionScene
type DrawableLayer = PintaSceneCellsLayer<number[] | PintaRegionCells>
type DrawableBounds = { cols: number; rows: number; origin?: { col: number; row: number } }
type ViewBox = { x: number; y: number; width: number; height: number }
type SceneViewport = ViewBox & { regionCells: PintaRegionSceneQuery['regionCells'] }

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
  viewport?: SceneViewport,
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
  function paint(
    layers: DrawableLayer[],
    bounds: DrawableBounds,
    view = camera,
    visible: ViewBox | undefined = viewport,
  ): void {
    for (const l of layers) {
      const e = sceneLayerState(layers, l)
      if (!e.visible || !e.opacity) continue
      ctx.save()
      ctx.globalAlpha *= e.opacity
      const dx = e.offsetX + view.x * (1 - e.parallaxX),
        dy = e.offsetY + view.y * (1 - e.parallaxY)
      ctx.translate(dx, dy)
      const local = visible && { ...visible, x: visible.x - dx, y: visible.y - dy }
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
          else if (local && viewport) {
            const col = Math.floor(local.x / size),
              row = Math.floor(local.y / size)
            viewport.regionCells(l.cells).visitOccupied(
              {
                col,
                row,
                cols: Math.ceil((local.x + local.width) / size) - col,
                rows: Math.ceil((local.y + local.height) / size) - row,
              },
              cell,
              'row-major',
            )
          } else {
            const rect = mapCellBounds(bounds)
            createTileCellReader(l.cells, rect).visitOccupied(rect, cell, 'row-major')
          }
        }
      }
      if (l.kind === 'objects')
        for (const o of l.objects) {
          const objectView = local && inverseObjectView(local, o)
          if (
            !o.setId &&
            objectView &&
            (objectView.x >= o.width ||
              objectView.x + objectView.width <= 0 ||
              objectView.y >= o.height ||
              objectView.y + objectView.height <= 0)
          )
            continue
          ctx.save()
          ctx.translate(o.x, o.y)
          ctx.rotate(((o.rotation ?? 0) * Math.PI) / 180)
          ctx.translate(o.flipX ? o.width : 0, o.flipY ? o.height : 0)
          ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1)
          if (o.setId) {
            const set = scene.sets?.find((s) => s.id === o.setId)
            if (set && (!objectView || (o.width > 0 && o.height > 0))) {
              const sx = o.width / (set.cols * size),
                sy = o.height / (set.rows * size),
                ox = 'origin' in set ? set.origin.col * size : 0,
                oy = 'origin' in set ? set.origin.row * size : 0
              ctx.scale(sx, sy)
              if ('origin' in set) ctx.translate(-ox, -oy)
              const setView = objectView && {
                x: objectView.x / sx + ox,
                y: objectView.y / sy + oy,
                width: objectView.width / sx,
                height: objectView.height / sy,
              }
              paint(set.layers, set, { x: 0, y: 0 }, setView)
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

function inverseObjectView(
  view: ViewBox,
  object: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
    flipX?: boolean
    flipY?: boolean
  },
): ViewBox {
  const a = ((object.rotation ?? 0) * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a),
    x = view.x - object.x,
    y = view.y - object.y
  const points = [
    { x, y },
    { x: x + view.width, y },
    { x, y: y + view.height },
    { x: x + view.width, y: y + view.height },
  ].map((p) => {
    const px = p.x * c + p.y * s,
      py = -p.x * s + p.y * c
    return { x: object.flipX ? object.width - px : px, y: object.flipY ? object.height - py : py }
  })
  const left = Math.min(...points.map((p) => p.x)),
    top = Math.min(...points.map((p) => p.y))
  return {
    x: left,
    y: top,
    width: Math.max(...points.map((p) => p.x)) - left,
    height: Math.max(...points.map((p) => p.y)) - top,
  }
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
