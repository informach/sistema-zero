import type { PintaScene, PintaSceneLayer } from '@sistemazero/core/studio/pinta-scene'
import { sceneLayerState } from '@sistemazero/core/studio/pinta-scene-runtime'
import { cellTile } from '../tiles/cell'
import { cellMatrix } from '../tiles/chunks'

/** Compositor estático/animado compartilhado pela imagem de exportação e pelo teste no Pinta. */
export async function loadSceneImages(scene: PintaScene): Promise<Map<string, HTMLImageElement>> {
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
  scene: PintaScene,
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
  function paint(layers: PintaSceneLayer[], cols: number, view = camera): void {
    for (const l of layers) {
      const e = sceneLayerState(layers, l)
      if (!e.visible || !e.opacity) continue
      ctx.save()
      ctx.globalAlpha *= e.opacity
      ctx.translate(e.offsetX + view.x * (1 - e.parallaxX), e.offsetY + view.y * (1 - e.parallaxY))
      if (l.kind === 'tiles' && !l.collision && !!l.front === (pass === 'front')) {
        const ts = scene.tilesets.find((t) => t.id === l.tilesetId),
          image = images.get(l.tilesetId)
        if (ts && image)
          l.cells.forEach((value, i) => {
            if (value < 0) return
            const tile = animatedTile(cellTile(value), ts.animations)
            ctx.save()
            ctx.translate(((i % cols) + 0.5) * size, (Math.floor(i / cols) + 0.5) * size)
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
          })
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
              paint(set.layers, set.cols, { x: 0, y: 0 })
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
              } else ctx.drawImage(image, 0, 0, o.width, o.height)
            }
          }
          ctx.restore()
        }
      ctx.restore()
    }
  }
  paint(scene.layers, scene.cols)
}

export async function scenePng(
  scene: PintaScene,
  scale = 1,
  maxPx = Infinity,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  const actual = Math.min(scale, maxPx / (Math.max(scene.cols, scene.rows) * scene.tileSize))
  if (scene.cols * scene.rows * (scene.tileSize * actual) ** 2 > 16_777_216)
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
  drawScene(ctx, scene, images, 'back')
  drawScene(ctx, scene, images, 'front')
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}
