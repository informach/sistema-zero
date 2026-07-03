/**
 * Barra vertical de ferramentas do motor pixel + tamanho do traço + espelho +
 * preencher formas + ações de bitmap inteiro (espelhar/girar).
 */
import type { JSX } from 'react'
import { activeBitmapOf, withActiveBitmap } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import { clearBitmap, flipHorizontal, flipVertical, rotate90 } from '../../pixel/ops'
import type { PintaSessionTool } from '../../state/sessionStore'
import { IconButton } from '../ui/Button'
import { useEditor, useEditorStores, useSession } from './editorContext'

const TOOLS: Array<{ id: PintaSessionTool; emoji: string; label: string }> = [
  { id: 'pencil', emoji: '✏️', label: COPY.tools.pencil },
  { id: 'eraser', emoji: '🧽', label: COPY.tools.eraser },
  { id: 'fill', emoji: '🪣', label: COPY.tools.fill },
  { id: 'recolor', emoji: '🔁', label: COPY.tools.recolor },
  { id: 'select', emoji: '🔲', label: COPY.tools.select },
  { id: 'line', emoji: '📏', label: COPY.tools.line },
  { id: 'rect', emoji: '⬜', label: COPY.tools.rect },
  { id: 'ellipse', emoji: '⚪', label: COPY.tools.ellipse },
  { id: 'picker', emoji: '💧', label: COPY.tools.picker },
]

const BRUSH_SIZES = [1, 2, 3] as const

export function ToolBar(): JSX.Element {
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

  return (
    <div
      role="toolbar"
      aria-label="Ferramentas"
      aria-orientation="vertical"
      className="flex flex-col items-center gap-1 overflow-y-auto rounded-3xl border-2 border-pin-border bg-pin-surface p-2"
    >
      {TOOLS.map((entry) => (
        <IconButton
          key={entry.id}
          active={tool === entry.id}
          aria-label={entry.label}
          aria-pressed={tool === entry.id}
          title={entry.label}
          onClick={() => session.getState().setTool(entry.id)}
        >
          <span aria-hidden="true">{entry.emoji}</span>
        </IconButton>
      ))}

      <hr className="my-1 w-8 border-pin-border" />

      <div className="flex flex-col items-center gap-1">
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
      </div>

      <hr className="my-1 w-8 border-pin-border" />

      <IconButton
        active={mirrorX}
        aria-label={COPY.tools.mirror}
        aria-pressed={mirrorX}
        title={COPY.tools.mirror}
        onClick={() => session.getState().toggleMirror()}
      >
        <span aria-hidden="true">🦋</span>
      </IconButton>
      <IconButton
        active={mirrorY}
        aria-label={COPY.tools.mirrorV}
        aria-pressed={mirrorY}
        title={COPY.tools.mirrorV}
        onClick={() => session.getState().toggleMirrorY()}
      >
        <span aria-hidden="true">🪞</span>
      </IconButton>
      <IconButton
        active={showGrid}
        aria-label={COPY.tools.grid}
        aria-pressed={showGrid}
        title={COPY.tools.grid}
        onClick={() => session.getState().toggleGrid()}
      >
        <span aria-hidden="true">▦</span>
      </IconButton>
      {showFilled ? (
        <IconButton
          active={filled}
          aria-label={COPY.tools.filled}
          aria-pressed={filled}
          title={COPY.tools.filled}
          onClick={() => session.getState().toggleFilled()}
        >
          <span aria-hidden="true">🎨</span>
        </IconButton>
      ) : null}

      <hr className="my-1 w-8 border-pin-border" />

      <IconButton
        aria-label={COPY.tools.flipH}
        title={COPY.tools.flipH}
        onClick={() => transformBitmap('flipH')}
      >
        <span aria-hidden="true">↔️</span>
      </IconButton>
      <IconButton
        aria-label={COPY.tools.flipV}
        title={COPY.tools.flipV}
        onClick={() => transformBitmap('flipV')}
      >
        <span aria-hidden="true">↕️</span>
      </IconButton>
      <IconButton
        aria-label={COPY.tools.rotate}
        title={COPY.tools.rotate}
        disabled={!canRotate}
        onClick={() => transformBitmap('rotate')}
      >
        <span aria-hidden="true">🔄</span>
      </IconButton>
      <IconButton aria-label={COPY.tools.clear} title={COPY.tools.clear} onClick={clearActive}>
        <span aria-hidden="true">🧹</span>
      </IconButton>
    </div>
  )
}
