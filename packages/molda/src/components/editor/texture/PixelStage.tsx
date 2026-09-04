/**
 * A folha de pixels: um canvas do tamanho da textura, ampliado sem suavizar,
 * sobre o xadrez da transparência. Só converte toque → texel (com o
 * deslocamento de vista) e avisa; quem pinta é o editor.
 */
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef } from 'react'
import { hexToRgb } from '../../../core/color'
import { COPY } from '../../../core/copy'
import type { MoldaTextureAsset } from '../../../core/model'
import { textureColors } from '../../../texture/ops'

export interface PixelStageProps {
  asset: MoldaTextureAsset
  /** Deslocamento de vista em texels (o "Deslocar meio"). */
  offset: [number, number]
  onDown: (x: number, y: number, pointerId: number) => void
  onMove: (x: number, y: number, pointerId: number) => void
  onUp: (pointerId: number) => void
}

export function PixelStage({ asset, offset, onDown, onMove, onUp }: PixelStageProps): JSX.Element {
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
    canvas.width = size
    canvas.height = size
    const colors = textureColors(asset)
    const palette = colors.map((hex) => (hex ? hexToRgb(hex) : [0, 0, 0]))
    const image = context.createImageData(size, size)
    const [ox, oy] = offset
    for (let py = 0; py < size; py += 1) {
      const ty = (py + oy) % size
      for (let px = 0; px < size; px += 1) {
        const tx = (px + ox) % size
        const index = asset.bitmap.data[ty * size + tx] ?? 0
        if (index === 0) continue
        const [r, g, b] = palette[index] ?? [0, 0, 0]
        const o = (py * size + px) * 4
        image.data[o] = r as number
        image.data[o + 1] = g as number
        image.data[o + 2] = b as number
        image.data[o + 3] = 255
      }
    }
    context.putImageData(image, 0, 0)
  }, [asset, offset, size])

  function texelOf(event: ReactPointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect()
    // Sem layout (testes), a folha mede 1 texel por pixel.
    const width = rect.width || size
    const height = rect.height || size
    let px = Math.floor(((event.clientX - rect.left) / width) * size)
    let py = Math.floor(((event.clientY - rect.top) / height) * size)
    if (!asset.seamless) {
      // Sem "sem emenda", fora da folha vale a borda: o traço não dá a volta.
      px = Math.max(0, Math.min(size - 1, px))
      py = Math.max(0, Math.min(size - 1, py))
    }
    const [ox, oy] = offset
    return [(((px + ox) % size) + size) % size, (((py + oy) % size) + size) % size]
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={COPY.editor.texture.stage}
      className="mld-pixelated mld-viewport block aspect-square w-full max-w-full cursor-crosshair"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Sem pointer capture (testes).
        }
        const [x, y] = texelOf(event)
        onDown(x, y, event.pointerId)
      }}
      onPointerMove={(event) => {
        const [x, y] = texelOf(event)
        onMove(x, y, event.pointerId)
      }}
      onPointerUp={(event) => onUp(event.pointerId)}
      onPointerCancel={(event) => onUp(event.pointerId)}
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
