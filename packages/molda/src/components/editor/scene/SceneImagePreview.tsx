import { useEffect, useRef } from 'react'
import { COPY } from '../../../core/copy'
import type { SceneRgba } from '../../../scene/composite'
import type { SceneImage } from '../../../scene/document'
import { sceneFlipbookRegion } from '../../../scene/imageFlipbook'
import { prepareSceneImageRaster, type SceneRasterSource } from '../../../scene/imageRaster'
import { SceneRasterWindow } from '../../../scene/SceneRasterWindow'

/** The composited authorial rows are shown bottom-up to match the UV panel and flipY=false GPU map. */
export function SceneImagePreview({
  image,
  palette,
  base,
  maxHeight = 256,
  frame,
}: {
  image: SceneImage
  palette: readonly SceneRgba[]
  base: SceneRgba
  maxHeight?: number
  /** Omit to show the full authorial sheet. */
  frame?: number
}) {
  const cropped = frame !== undefined && image.flipbook
  const width = cropped ? image.flipbook!.frameWidth : image.width
  const height = cropped ? image.flipbook!.frameHeight : image.height
  const canvas = useRef<HTMLCanvasElement>(null)
  const previous = useRef<SceneRasterSource | undefined>(undefined)
  const window = useRef<SceneRasterWindow | null>(null)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const source = { image, paletteKey: JSON.stringify(palette), base }
    const patch = prepareSceneImageRaster(source, palette, previous.current)
    window.current ??= new SceneRasterWindow()
    const dirty = window.current.update(patch, cropped ? sceneFlipbookRegion(image, frame!) : null)
    previous.current = source
    if (!dirty) return
    const pixels = window.current.raster!.pixels
    const region = dirty === 'all' ? { x0: 0, y0: 0, x1: width - 1, y1: height - 1 } : dirty
    const patchWidth = region.x1 - region.x0 + 1,
      patchHeight = region.y1 - region.y0 + 1
    const data = ctx.createImageData(patchWidth, patchHeight)
    for (let row = 0; row < patchHeight; row++) {
      const from = ((region.y0 + row) * width + region.x0) * 4
      data.data.set(
        pixels.subarray(from, from + patchWidth * 4),
        (patchHeight - 1 - row) * patchWidth * 4,
      )
    }
    ctx.putImageData(data, region.x0, height - region.y1 - 1)
  }, [image, palette, base, width, height, cropped, frame])
  return (
    <canvas
      ref={canvas}
      width={width}
      height={height}
      role="img"
      aria-label={COPY.scene.imagePreview}
      className="mld-pixelated block h-auto w-full rounded-lg outline outline-1 outline-mld-border"
      style={{ maxWidth: (maxHeight * width) / height }}
    />
  )
}
