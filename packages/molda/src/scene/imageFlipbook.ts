import type { ScenePixelRegion } from './composite'
import type { SceneImage, SceneImageFlipbook, Vec2 } from './document'
import { sceneImageTexel } from './imageCoordinates'
import * as v from './validation'

export const SCENE_FLIPBOOK_LIMITS = { cells: 256, sequence: 256, minFps: 0.1, maxFps: 60 } as const

export function readSceneImageFlipbook(
  raw: unknown,
  image: Pick<SceneImage, 'width' | 'height'>,
): SceneImageFlipbook {
  const row = v.record(raw, 'flipbook', ['frameWidth', 'frameHeight', 'frames', 'fps', 'loop'])
  const frameWidth = v.number(row.frameWidth, 'frameWidth', 1, image.width, true)
  const frameHeight = v.number(row.frameHeight, 'frameHeight', 1, image.height, true)
  v.requireScene(
    image.width % frameWidth === 0 && image.height % frameHeight === 0,
    'frames',
    'Os quadros precisam preencher a imagem sem sobras. Nenhum pixel será cortado.',
  )
  const count = (image.width / frameWidth) * (image.height / frameHeight)
  v.requireScene(
    count <= SCENE_FLIPBOOK_LIMITS.cells,
    'frames',
    'Use uma folha com até 256 quadros.',
  )
  const frames = v
    .list(row.frames, 'frames', SCENE_FLIPBOOK_LIMITS.sequence)
    .map((n) => v.number(n, 'frame', 0, count - 1, true))
  v.requireScene(frames.length > 0, 'frames', 'Escolha pelo menos um quadro para a sequência.')
  return {
    frameWidth,
    frameHeight,
    frames,
    fps: v.number(row.fps, 'fps', SCENE_FLIPBOOK_LIMITS.minFps, SCENE_FLIPBOOK_LIMITS.maxFps),
    loop: v.boolean(row.loop, 'loop'),
  }
}

/** A sequence step is not a sheet cell: repetitions deliberately hold the same drawing. */
export function sampleSceneFlipbook(flipbook: SceneImageFlipbook, seconds: number, startStep = 0) {
  v.number(seconds, 'time', 0)
  v.number(startStep, 'step', 0, flipbook.frames.length - 1, true)
  const duration = flipbook.frames.length / flipbook.fps
  const finished = !flipbook.loop && seconds >= (flipbook.frames.length - startStep) / flipbook.fps
  const ticks = seconds * flipbook.fps
  const step = finished
    ? flipbook.frames.length - 1
    : ((Math.floor(Number.isFinite(ticks) ? ticks : (seconds % duration) * flipbook.fps) %
        flipbook.frames.length) +
        startStep) %
      flipbook.frames.length
  return { step, frame: flipbook.frames[step]!, finished }
}

/** Grid numbering follows the visible sheet; pixel rows themselves remain canonical bottom-up. */
export function sceneFlipbookRegion(
  image: Pick<SceneImage, 'width' | 'height' | 'flipbook'>,
  frame: number,
): ScenePixelRegion {
  const flipbook = image.flipbook
  v.requireScene(flipbook, 'flipbook', 'Esta imagem não tem quadros configurados.')
  const columns = image.width / flipbook.frameWidth
  v.number(frame, 'frame', 0, columns * (image.height / flipbook.frameHeight) - 1, true)
  const x0 = (frame % columns) * flipbook.frameWidth
  const y0 = image.height - (Math.floor(frame / columns) + 1) * flipbook.frameHeight
  return { x0, y0, x1: x0 + flipbook.frameWidth - 1, y1: y0 + flipbook.frameHeight - 1 }
}

export function sceneFlipbookTexel(image: SceneImage, uv: Vec2, frame: number) {
  if (!image.flipbook) return sceneImageTexel(image, uv)
  const region = sceneFlipbookRegion(image, frame)
  const point = sceneImageTexel(
    { width: image.flipbook.frameWidth, height: image.flipbook.frameHeight },
    uv,
  )
  return point ? ([point[0] + region.x0, point[1] + region.y0] as [number, number]) : null
}
