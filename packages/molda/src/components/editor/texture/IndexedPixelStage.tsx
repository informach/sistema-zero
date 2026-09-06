/** Canvas ampliável para qualquer bitmap indexado do Molda. */
import type { JSX, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef } from 'react'
import { hexToRgb } from '../../../core/color'
import type { MoldaSkin } from '../../../core/model'

export interface IndexedPixelPoint {
  x: number
  y: number
}

export interface IndexedPixelStageProps {
  skin: MoldaSkin
  colors: readonly (string | null)[]
  /** Cor mostrada para o índice 0; `null` mantém transparente. */
  zeroColor?: string | null
  /** 1 = pintável; 0 = fora da forma. */
  mask?: Uint8Array
  outsideColor?: string
  offset?: readonly [number, number]
  wrap?: boolean
  /** Mantém o ponteiro capturado no texel da borda. */
  clamp?: boolean
  flipX?: boolean
  ariaLabel: string
  className?: string
  onDown: (point: IndexedPixelPoint, pointerId: number) => void
  /** `null` avisa que o ponteiro saiu da área pintável e quebra o próximo segmento. */
  onMove: (point: IndexedPixelPoint | null, pointerId: number) => void
  onUp: (pointerId: number) => void
}

function modulo(value: number, size: number): number {
  return ((value % size) + size) % size
}

export function mapIndexedPixelPoint(input: {
  displayX: number
  displayY: number
  width: number
  height: number
  offset: readonly [number, number]
  wrap: boolean
  clamp: boolean
  flipX: boolean
  mask?: Uint8Array
}): IndexedPixelPoint | null {
  let displayX = input.displayX
  let displayY = input.displayY
  if (input.wrap) {
    displayX = modulo(displayX, input.width)
    displayY = modulo(displayY, input.height)
  } else if (input.clamp) {
    displayX = Math.min(Math.max(displayX, 0), input.width - 1)
    displayY = Math.min(Math.max(displayY, 0), input.height - 1)
  } else if (displayX < 0 || displayY < 0 || displayX >= input.width || displayY >= input.height) {
    return null
  }
  const sourceX = input.flipX ? input.width - 1 - displayX : displayX
  const point = {
    x: modulo(sourceX + input.offset[0], input.width),
    y: modulo(displayY + input.offset[1], input.height),
  }
  return input.mask && !input.mask[point.y * input.width + point.x] ? null : point
}

export function IndexedPixelStage({
  skin,
  colors,
  zeroColor = null,
  mask,
  outsideColor = '#94a3b8',
  offset = [0, 0],
  wrap = false,
  clamp = false,
  flipX = false,
  ariaLabel,
  className,
  onDown,
  onMove,
  onUp,
}: IndexedPixelStageProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width, height } = skin

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
    canvas.width = width
    canvas.height = height
    const palette = colors.map((hex) => (hex ? hexToRgb(hex) : null))
    const zero = zeroColor ? hexToRgb(zeroColor) : null
    const outside = hexToRgb(outsideColor)
    const image = context.createImageData(width, height)
    for (let displayY = 0; displayY < height; displayY += 1) {
      for (let displayX = 0; displayX < width; displayX += 1) {
        const point = mapIndexedPixelPoint({
          displayX,
          displayY,
          width,
          height,
          offset,
          wrap: false,
          clamp: false,
          flipX,
        })
        if (!point) continue
        const sourceIndex = point.y * width + point.x
        const colorIndex = skin.data[sourceIndex] ?? 0
        const rgb =
          mask && !mask[sourceIndex] ? outside : colorIndex === 0 ? zero : palette[colorIndex]
        if (!rgb) continue
        const output = (displayY * width + displayX) * 4
        image.data[output] = rgb[0]
        image.data[output + 1] = rgb[1]
        image.data[output + 2] = rgb[2]
        image.data[output + 3] = mask && !mask[sourceIndex] ? 110 : 255
      }
    }
    context.putImageData(image, 0, 0)
  }, [skin, colors, zeroColor, mask, outsideColor, offset, flipX, width, height])

  function pointOf(event: ReactPointerEvent<HTMLCanvasElement>): IndexedPixelPoint | null {
    const rect = event.currentTarget.getBoundingClientRect()
    const renderedWidth = rect.width || width
    const renderedHeight = rect.height || height
    return mapIndexedPixelPoint({
      displayX: Math.floor(((event.clientX - rect.left) / renderedWidth) * width),
      displayY: Math.floor(((event.clientY - rect.top) / renderedHeight) * height),
      width,
      height,
      offset,
      wrap,
      clamp,
      flipX,
      ...(mask ? { mask } : {}),
    })
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        const point = pointOf(event)
        if (!point) return
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // Sem pointer capture (testes).
        }
        onDown(point, event.pointerId)
      }}
      onPointerMove={(event) => onMove(pointOf(event), event.pointerId)}
      onPointerUp={(event) => onUp(event.pointerId)}
      onPointerCancel={(event) => onUp(event.pointerId)}
    />
  )
}
