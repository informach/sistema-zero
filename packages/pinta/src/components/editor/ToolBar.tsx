/**
 * Barra vertical de ferramentas do motor pixel + tamanho do traço + espelho +
 * preencher formas + ações de bitmap inteiro (espelhar/girar).
 */
import type { JSX } from 'react'
import { activeBitmapOf, withActiveBitmap } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { clearBitmap, flipHorizontal, flipVertical, rotate90 } from '../../pixel/ops'
import type { PintaSessionTool } from '../../state/sessionStore'
import { IconButton, ToolButton } from '../ui/Button'
import {
  BrushCleaning,
  Circle,
  Eraser,
  FlipHorizontal,
  FlipHorizontal2,
  FlipVertical,
  FlipVertical2,
  Grid3x3,
  type LucideIcon,
  PaintBucket,
  PaintRoller,
  Pencil,
  Pipette,
  Replace,
  RotateCw,
  Slash,
  Square,
  SquareDashed,
} from '../ui/icons'
import { useEditor, useEditorStores, useSession } from './editorContext'

const TOOLS: Array<{ id: PintaSessionTool; icon: LucideIcon; label: string }> = [
  { id: 'pencil', icon: Pencil, label: COPY.tools.pencil },
  { id: 'eraser', icon: Eraser, label: COPY.tools.eraser },
  { id: 'fill', icon: PaintBucket, label: COPY.tools.fill },
  { id: 'recolor', icon: Replace, label: COPY.tools.recolor },
  { id: 'select', icon: SquareDashed, label: COPY.tools.select },
  { id: 'line', icon: Slash, label: COPY.tools.line },
  { id: 'rect', icon: Square, label: COPY.tools.rect },
  { id: 'ellipse', icon: Circle, label: COPY.tools.ellipse },
  { id: 'picker', icon: Pipette, label: COPY.tools.picker },
]

const BRUSH_SIZES = [1, 2, 3] as const

export function ToolBar({
  orientation = 'vertical',
}: {
  orientation?: 'vertical' | 'horizontal'
}): JSX.Element {
  const vertical = orientation === 'vertical'
  const { editor, session } = useEditorStores()
  const tool = useSession((state) => state.tool)
  const brushSize = useSession((state) => state.brushSize)
  const mirrorX = useSession((state) => state.mirrorX)
  const mirrorY = useSession((state) => state.mirrorY)
  const showGrid = useSession((state) => state.showGrid)
  const filled = useSession((state) => state.filled)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const asset = useEditor((state) => state.asset)

  const showFilled = tool === 'rect' || tool === 'ellipse'

  function transformBitmap(op: 'flipH' | 'flipV' | 'rotate'): void {
    const ref = { animationId, frameIndex }
    const state = editor.getState()
    const bitmap = activeBitmapOf(state.asset, ref)
    if (!bitmap) return
    // Girar um quadro NÃO quadrado mudaria as dimensões e quebraria o sprite —
    // o botão fica desabilitado nesse caso (ver `canRotate` abaixo).
    const next =
      op === 'flipH'
        ? flipHorizontal(bitmap)
        : op === 'flipV'
          ? flipVertical(bitmap)
          : rotate90(bitmap)
    state.commit(withActiveBitmap(state.asset, ref, next))
  }

  function clearActive(): void {
    const ref = { animationId, frameIndex }
    const state = editor.getState()
    const bitmap = activeBitmapOf(state.asset, ref)
    if (!bitmap) return
    const next = clearBitmap(bitmap)
    // Já está vazio: não gasta uma entrada de undo.
    if (next.data.every((v, i) => v === bitmap.data[i])) return
    state.commit(withActiveBitmap(state.asset, ref, next))
  }

  const activeBitmap = activeBitmapOf(asset, { animationId, frameIndex })
  const canRotate =
    activeBitmap !== null &&
    (asset.kind !== 'pixel-sprite' || activeBitmap.width === activeBitmap.height)

  const divider = vertical ? (
    <hr className="col-span-3 my-1 w-8 border-pin-border" />
  ) : (
    <span aria-hidden="true" className="mx-1 h-8 w-0.5 shrink-0 rounded bg-pin-border" />
  )

  return (
    <div
      role="toolbar"
      aria-label="Ferramentas"
      aria-orientation={orientation}
      className={
        // Vertical = GRADE de 3 colunas (padrão MakeCode/Piskel): as 9 ferramentas
        // viram um 3×3 e os 3 tamanhos de pincel uma linha só — tudo visível de uma
        // vez, ocupando bem menos altura (sem scroll).
        vertical
          ? 'pin-panel grid shrink-0 grid-cols-3 content-start justify-items-center gap-1 overflow-y-auto p-2'
          : 'pin-panel flex shrink-0 items-center gap-1 overflow-x-auto p-2'
      }
    >
      {TOOLS.map((entry) => (
        <ToolButton
          key={entry.id}
          icon={entry.icon}
          label={entry.label}
          active={tool === entry.id}
          onClick={() => session.getState().setTool(entry.id)}
        />
      ))}

      {divider}

      {BRUSH_SIZES.map((size) => (
        <IconButton
          key={size}
          active={brushSize === size}
          aria-label={`${COPY.tools.brushSize}: ${size}`}
          aria-pressed={brushSize === size}
          title={`${COPY.tools.brushSize}: ${size}`}
          onClick={() => session.getState().setBrushSize(size)}
        >
          <span
            aria-hidden="true"
            className="rounded-full bg-current"
            style={{ width: size * 4 + 2, height: size * 4 + 2 }}
          />
        </IconButton>
      ))}

      {divider}

      <ToolButton
        icon={FlipHorizontal}
        label={COPY.tools.mirror}
        active={mirrorX}
        onClick={() => session.getState().toggleMirror()}
      />
      <ToolButton
        icon={FlipVertical}
        label={COPY.tools.mirrorV}
        active={mirrorY}
        onClick={() => session.getState().toggleMirrorY()}
      />
      <ToolButton
        icon={Grid3x3}
        label={COPY.tools.grid}
        active={showGrid}
        onClick={() => session.getState().toggleGrid()}
      />
      {showFilled ? (
        <ToolButton
          icon={PaintRoller}
          label={COPY.tools.filled}
          active={filled}
          onClick={() => session.getState().toggleFilled()}
        />
      ) : null}

      {divider}

      <ToolButton
        icon={FlipHorizontal2}
        label={COPY.tools.flipH}
        onClick={() => transformBitmap('flipH')}
      />
      <ToolButton
        icon={FlipVertical2}
        label={COPY.tools.flipV}
        onClick={() => transformBitmap('flipV')}
      />
      <ToolButton
        icon={RotateCw}
        label={COPY.tools.rotate}
        disabled={!canRotate}
        onClick={() => transformBitmap('rotate')}
      />
      <ToolButton icon={BrushCleaning} label={COPY.tools.clear} onClick={clearActive} />
    </div>
  )
}
