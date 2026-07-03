/**
 * A superfície de desenho: converte pointer events em posições de pixel e
 * delega à máquina pura de ferramenta (`pixel/tools.ts`); o preview do gesto é
 * pintado DIRETO no canvas (sem setState por move — 60fps no touch), e o
 * commit vira UMA entrada de undo no editorStore.
 *
 * A ferramenta SELEÇÃO (recorta/move um retângulo) NÃO passa pela máquina pura:
 * o estado do recorte vive em refs aqui e reusa `pixel/selection.ts` (extrair →
 * flutuar → carimbar). O buraco da extração só é COMMITADO no carimbo final —
 * enquanto flutua, o bitmap do store segue o original, então undo/redo/troca de
 * quadro apenas LARGAM a seleção (sem perda do que já estava salvo).
 *
 * happy-dom não tem canvas 2D: `createScaledPainter` devolve null e o
 * componente simplesmente não pinta (a lógica de gesto continua testável).
 */
import type { JSX, PointerEvent } from 'react'
import { useEffect, useRef } from 'react'
import { activeBitmapOf, previousFrameOf, withActiveBitmap } from '../../core/assetEdit'
import { TRANSPARENT_INDEX } from '../../core/palette'
import { safeSetPointerCapture } from '../../core/pointer'
import { type PintaBitmap, paletteIdOf } from '../../core/project'
import type { Vec2 } from '../../pixel/bitmap'
import {
  createScaledPainter,
  paintPixelGrid,
  paintSelectionOverlay,
  type ScaledPainter,
} from '../../pixel/render'
import {
  extractSelection,
  type FloatingSelection,
  normalizeRect,
  type SelectionRect,
  stampSelection,
} from '../../pixel/selection'
import {
  type ToolGesture,
  type ToolSettings,
  toolPointerDown,
  toolPointerMove,
  toolPointerUp,
} from '../../pixel/tools'
import { useEditor, useEditorStores, useSession } from './editorContext'

const ONION_ALPHA = 0.3

/** Estado local da ferramenta seleção (marquee em curso → retângulo → flutuante). */
type Selection =
  | { kind: 'marquee'; start: Vec2; rect: SelectionRect | null }
  | { kind: 'rect'; rect: SelectionRect }
  | { kind: 'floating'; floating: FloatingSelection; remaining: PintaBitmap }

function floatRect(f: FloatingSelection): SelectionRect {
  return { x: f.x, y: f.y, width: f.bitmap.width, height: f.bitmap.height }
}

function inside(rect: SelectionRect, p: Vec2): boolean {
  return p.x >= rect.x && p.x < rect.x + rect.width && p.y >= rect.y && p.y < rect.y + rect.height
}

export function PixelCanvas(): JSX.Element {
  const { editor, session } = useEditorStores()
  const asset = useEditor((state) => state.asset)
  const tool = useSession((state) => state.tool)
  const zoom = useSession((state) => state.zoom)
  const onion = useSession((state) => state.onion)
  const showGrid = useSession((state) => state.showGrid)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const paletteId = paletteIdOf(asset)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const painterRef = useRef<ScaledPainter | null>(null)
  const gestureRef = useRef<ToolGesture | null>(null)
  // Dono do gesto: um segundo dedo/palma não injeta pontos no traço do primeiro.
  const gesturePointerRef = useRef<number | null>(null)

  // Estado da seleção + dono do arrasto do recorte flutuante.
  const selRef = useRef<Selection | null>(null)
  const selPointerRef = useRef<number | null>(null)
  const movingRef = useRef<{ offset: Vec2 } | null>(null)
  // Distingue "o bitmap mudou porque EU commitei" de "mudou por fora"
  // (undo/redo) — no segundo caso a seleção pendente é largada.
  const selfCommitRef = useRef(false)
  const lastBitmapRef = useRef<PintaBitmap | null>(null)

  const frameRef = { animationId, frameIndex }
  const bitmap = activeBitmapOf(asset, frameRef)
  const under = onion ? previousFrameOf(asset, frameRef) : null

  // Trocar de quadro/animação NO MEIO de um gesto (multi-touch) descarta o
  // gesto — sem isso o pointerup commitaria o bitmap antigo POR CIMA do quadro
  // recém-selecionado. A seleção flutuante também é largada (nunca commitou o
  // buraco, então o quadro antigo fica intacto).
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro ativo)
  useEffect(() => {
    gestureRef.current = null
    gesturePointerRef.current = null
    selRef.current = null
    movingRef.current = null
  }, [animationId, frameIndex])

  function paint(current: PintaBitmap): void {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!painterRef.current) painterRef.current = createScaledPainter(canvas)
    const painter = painterRef.current
    if (!painter) return
    painter.paint(
      current,
      paletteId,
      zoom,
      under ? { bitmap: under, alpha: ONION_ALPHA } : undefined,
    )
    paintPixelGrid(canvas, current, zoom, showGrid)
  }

  /** Pinta o bitmap (compondo o recorte flutuante) + o contorno da seleção. */
  function renderCanvas(): void {
    const sel = selRef.current
    if (sel?.kind === 'floating') {
      paint(stampSelection(sel.remaining, sel.floating))
      paintSelectionOverlay(canvasRef.current, floatRect(sel.floating), zoom)
      return
    }
    if (!bitmap) return
    paint(bitmap)
    if (sel?.kind === 'rect') paintSelectionOverlay(canvasRef.current, sel.rect, zoom)
    else if (sel?.kind === 'marquee' && sel.rect) {
      paintSelectionOverlay(canvasRef.current, sel.rect, zoom)
    }
  }

  // Repinta quando bitmap/zoom/onion mudam (fora de gesto; o gesto pinta direto).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `renderCanvas` lê os mesmos valores das deps
  useEffect(() => {
    if (!bitmap) return
    if (selfCommitRef.current) {
      selfCommitRef.current = false
    } else if (lastBitmapRef.current && lastBitmapRef.current !== bitmap && selRef.current) {
      // Conteúdo mudou por fora (undo/redo): a seleção pendente perde o chão.
      selRef.current = null
      movingRef.current = null
    }
    lastBitmapRef.current = bitmap
    if (!gestureRef.current) renderCanvas()
  }, [bitmap, zoom, onion, under, showGrid, paletteId])

  // Sair da ferramenta seleção CARIMBA o recorte pendente (some sem sumir).
  // biome-ignore lint/correctness/useExhaustiveDependencies: stampPending lê refs; o gatilho é `tool`
  useEffect(() => {
    if (tool !== 'select') stampPending()
  }, [tool])

  useEffect(
    () => () => {
      painterRef.current?.dispose()
      painterRef.current = null
    },
    [],
  )

  if (!bitmap) return <div className="flex-1" />

  function pixelPos(event: PointerEvent<HTMLCanvasElement>): Vec2 {
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
      // 'pan'/'select' não são do motor pixel — nunca chegam aqui (o handler
      // trata a seleção antes), mas o fallback mantém o tipo honesto.
      tool: s.tool === 'pan' || s.tool === 'select' ? 'pencil' : s.tool,
      color: s.color,
      brushSize: s.brushSize,
      mirrorX: s.mirrorX,
      mirrorY: s.mirrorY,
      filled: s.filled,
    }
  }

  function commitBitmap(next: PintaBitmap): void {
    // Ref VIVO da sessão (não o do render): o commit cai no quadro certo mesmo
    // se a seleção mudou durante o gesto.
    selfCommitRef.current = true
    const state = editor.getState()
    const s = session.getState()
    state.commit(
      withActiveBitmap(state.asset, { animationId: s.animationId, frameIndex: s.frameIndex }, next),
    )
  }

  /** Carimba o recorte flutuante (se houver) e zera a seleção. */
  function stampPending(): void {
    const sel = selRef.current
    selRef.current = null
    movingRef.current = null
    if (sel?.kind === 'floating') commitBitmap(stampSelection(sel.remaining, sel.floating))
  }

  function selectPointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (!event.isPrimary || !bitmap) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    selPointerRef.current = event.pointerId
    const p = pixelPos(event)
    const sel = selRef.current
    if (sel?.kind === 'floating' && inside(floatRect(sel.floating), p)) {
      movingRef.current = { offset: { x: p.x - sel.floating.x, y: p.y - sel.floating.y } }
      return
    }
    if (sel?.kind === 'rect' && inside(sel.rect, p)) {
      // Pegar o retângulo: extrai o recorte (buraco transparente) e passa a mover.
      const { remaining, floating } = extractSelection(bitmap, sel.rect)
      selRef.current = { kind: 'floating', floating, remaining }
      movingRef.current = { offset: { x: p.x - floating.x, y: p.y - floating.y } }
      renderCanvas()
      return
    }
    // Novo marquee: carimba o recorte anterior antes de começar do zero.
    stampPending()
    selRef.current = { kind: 'marquee', start: p, rect: normalizeRect(bitmap, p, p) }
    renderCanvas()
  }

  function selectPointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current || !bitmap) return
    const p = pixelPos(event)
    const sel = selRef.current
    const moving = movingRef.current
    if (sel?.kind === 'floating' && moving) {
      sel.floating.x = p.x - moving.offset.x
      sel.floating.y = p.y - moving.offset.y
      renderCanvas()
      return
    }
    if (sel?.kind === 'marquee') {
      sel.rect = normalizeRect(bitmap, sel.start, p)
      renderCanvas()
    }
  }

  function selectPointerUp(event: PointerEvent<HTMLCanvasElement>): void {
    if (event.pointerId !== selPointerRef.current) return
    selPointerRef.current = null
    if (movingRef.current) {
      movingRef.current = null
      return
    }
    const sel = selRef.current
    if (sel?.kind === 'marquee') {
      selRef.current = sel.rect ? { kind: 'rect', rect: sel.rect } : null
      renderCanvas()
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectPointerDown(event)
      return
    }
    if (!event.isPrimary || !bitmap || gestureRef.current) return
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    gesturePointerRef.current = event.pointerId
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
    if (tool === 'select') {
      selectPointerMove(event)
      return
    }
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesturePointerRef.current) return
    const next = toolPointerMove(gesture, pixelPos(event))
    if (next !== gesture) {
      gestureRef.current = next
      paint(next.working)
    }
  }

  function endGesture(event: PointerEvent<HTMLCanvasElement>): void {
    if (tool === 'select') {
      selectPointerUp(event)
      return
    }
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesturePointerRef.current) return
    gestureRef.current = null
    gesturePointerRef.current = null
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
