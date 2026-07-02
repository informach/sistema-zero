/**
 * A superfície de desenho: converte pointer events em posições de pixel e
 * delega à máquina pura de ferramenta (`pixel/tools.ts`); o preview do gesto é
 * pintado DIRETO no canvas (sem setState por move — 60fps no touch), e o
 * commit vira UMA entrada de undo no editorStore.
 *
 * happy-dom não tem canvas 2D: `createScaledPainter` devolve null e o
 * componente simplesmente não pinta (a lógica de gesto continua testável).
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useRef } from 'react'
import { activeBitmapOf, previousFrameOf, withActiveBitmap } from '../../core/assetEdit'
import { TRANSPARENT_INDEX } from '../../core/palette'
import type { PintaBitmap } from '../../core/project'
import { createScaledPainter, paintPixelGrid, type ScaledPainter } from '../../pixel/render'
import {
  type ToolGesture,
  type ToolSettings,
  toolPointerDown,
  toolPointerMove,
  toolPointerUp,
} from '../../pixel/tools'
import { useEditor, useEditorStores, useSession } from './editorContext'

const ONION_ALPHA = 0.3

export function PixelCanvas(): JSX.Element {
  const { editor, session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const zoom = useSession((state) => state.zoom)
  const onion = useSession((state) => state.onion)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const painterRef = useRef<ScaledPainter | null>(null)
  const gestureRef = useRef<ToolGesture | null>(null)

  const frameRef = { animationId, frameIndex }
  const bitmap = activeBitmapOf(asset, frameRef)
  const under = onion ? previousFrameOf(asset, frameRef) : null

  function paint(current: PintaBitmap): void {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!painterRef.current) painterRef.current = createScaledPainter(canvas)
    const painter = painterRef.current
    if (!painter) return
    painter.paint(
      current,
      asset.kind === 'tilemap' || asset.kind === 'vector' ? 'arcade' : asset.paletteId,
      zoom,
      under ? { bitmap: under, alpha: ONION_ALPHA } : undefined,
    )
    paintPixelGrid(canvas, current, zoom)
  }

  // Repinta quando bitmap/zoom/onion mudam (fora de gesto; o gesto pinta direto).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `paint` lê os mesmos valores das deps
  useEffect(() => {
    if (bitmap && !gestureRef.current) paint(bitmap)
  }, [bitmap, zoom, onion, under])

  useEffect(
    () => () => {
      painterRef.current?.dispose()
      painterRef.current = null
    },
    [],
  )

  if (!bitmap) return <div className="flex-1" />

  function pixelPos(event: PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.floor((event.clientX - rect.left) / zoom),
      y: Math.floor((event.clientY - rect.top) / zoom),
    }
  }

  function settings(): ToolSettings {
    const s = session.getState()
    return {
      tool: s.tool,
      color: s.color,
      brushSize: s.brushSize,
      mirrorX: s.mirrorX,
      filled: s.filled,
    }
  }

  function commitBitmap(next: PintaBitmap): void {
    const state = editor.getState()
    state.commit(withActiveBitmap(state.asset, frameRef, next))
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary || !bitmap) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const result = toolPointerDown(bitmap, settings(), pixelPos(event))
    if (result.pickedColor !== undefined) {
      const s = session.getState()
      if (result.pickedColor === TRANSPARENT_INDEX) {
        s.setTool('eraser')
      } else {
        s.setColor(result.pickedColor)
        s.setTool('pencil')
      }
      return
    }
    if (result.commit) {
      commitBitmap(result.commit)
      return
    }
    if (result.gesture) {
      gestureRef.current = result.gesture
      paint(result.gesture.working)
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    const gesture = gestureRef.current
    if (!gesture) return
    const next = toolPointerMove(gesture, pixelPos(event))
    if (next !== gesture) {
      gestureRef.current = next
      paint(next.working)
    }
  }

  function endGesture(event: PointerEvent<HTMLCanvasElement>): void {
    const gesture = gestureRef.current
    if (!gesture) return
    gestureRef.current = null
    const committed = toolPointerUp(gesture, pixelPos(event))
    if (committed) {
      commitBitmap(committed)
    } else if (bitmap) {
      paint(bitmap)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
      <div className="pin-checkerboard rounded-lg border-2 border-pin-border shadow-inner">
        <canvas
          ref={canvasRef}
          className="pin-pixelated block"
          style={{ touchAction: 'none', imageRendering: 'pixelated' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          aria-label="Área de desenho"
          role="img"
        />
      </div>
    </div>
  )
}
