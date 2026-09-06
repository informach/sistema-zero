/**
 * A folha de pixels: um canvas do tamanho da textura, ampliado sem suavizar,
 * sobre o xadrez da transparência. Só converte toque → texel (com o
 * deslocamento de vista) e avisa; quem pinta é o editor.
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { hexToRgb } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaTextureAsset } from '../../../core/model'
import { textureColors } from '../../../texture/ops'
import { IndexedPixelStage } from './IndexedPixelStage'

export interface PixelStageProps {
  asset: MoldaTextureAsset
  /** Deslocamento de vista em texels (o "Deslocar meio"). */
  offset: [number, number]
  onDown: (x: number, y: number, pointerId: number) => void
  onMove: (x: number, y: number, pointerId: number) => void
  onUp: (pointerId: number) => void
}

export function PixelStage({ asset, offset, onDown, onMove, onUp }: PixelStageProps): JSX.Element {
  return (
    <IndexedPixelStage
      skin={asset.bitmap}
      colors={textureColors(asset)}
      offset={offset}
      wrap={asset.seamless}
      clamp={!asset.seamless}
      ariaLabel={COPY.editor.texture.stage}
      className="mld-pixelated mld-viewport block aspect-square w-full max-w-full cursor-crosshair"
      onDown={(point, pointerId) => onDown(point.x, point.y, pointerId)}
      onMove={(point, pointerId) => {
        if (point) onMove(point.x, point.y, pointerId)
      }}
      onUp={onUp}
    />
  )
}

/** A folha repetida 3×3: onde a emenda aparece. */
export function TiledPreview({ asset }: { asset: MoldaTextureAsset }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = asset.bitmap.width
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let context: CanvasRenderingContext2D | null = null
    try {
      context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null
    } catch {
      context = null
    }
    if (!context || typeof context.createImageData !== 'function') return
    canvas.width = size * 3
    canvas.height = size * 3
    const colors = textureColors(asset)
    const palette = colors.map((hex) => (hex ? hexToRgb(hex) : [0, 0, 0]))
    const image = context.createImageData(size * 3, size * 3)
    for (let py = 0; py < size * 3; py += 1) {
      for (let px = 0; px < size * 3; px += 1) {
        const index = asset.bitmap.data[(py % size) * size + (px % size)] ?? 0
        if (index === 0) continue
        const [r, g, b] = palette[index] ?? [0, 0, 0]
        const o = (py * size * 3 + px) * 4
        image.data[o] = r as number
        image.data[o + 1] = g as number
        image.data[o + 2] = b as number
        image.data[o + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
  }, [asset, size])
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={COPY.editor.texture.tiled}
      className="mld-pixelated block aspect-square w-full"
    />
  )
}
