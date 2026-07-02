/**
 * Filmstrip dos quadros da animação selecionada (embaixo do canvas, layout
 * MakeCode): miniaturas clicáveis + novo/duplicar/apagar/mover + o toggle 👻
 * do onion skin. Mutação = helpers puros de frames.ts → commit no editorStore.
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { addFrame, duplicateFrame, moveFrame, removeFrame } from '../../animation/frames'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import type { PaletteId } from '../../core/palette'
import type { PintaBitmap } from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import { IconButton } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'

function FrameThumb({
  bitmap,
  paletteId,
  selected,
  label,
  onSelect,
}: {
  bitmap: PintaBitmap
  paletteId: PaletteId
  selected: boolean
  label: string
  onSelect: () => void
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) paintBitmap(canvas, bitmap, paletteId)
  }, [bitmap, paletteId])
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`pin-checkerboard h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
        selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="pin-pixelated h-full w-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
    </button>
  )
}

export function FrameStrip(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const onion = useSession((state) => state.onion)

  if (asset.kind !== 'pixel-sprite') return null
  const animation = activeAnimationOf(asset, { animationId, frameIndex })
  if (!animation) return null
  const selectedIndex = Math.min(frameIndex, animation.frames.length - 1)

  function mutate(
    op: (sprite: Extract<typeof asset, { kind: 'pixel-sprite' }>) => {
      next: typeof asset
      selectIndex?: number
      limitToast?: string
    },
  ): void {
    const current = editor.getState().asset
    if (current.kind !== 'pixel-sprite') return
    const { next, selectIndex, limitToast } = op(current)
    if (next === current) {
      if (limitToast) showToast(limitToast)
      return
    }
    editor.getState().commit(next)
    if (selectIndex !== undefined) session.getState().selectFrame(selectIndex)
  }

  return (
    <div className="flex items-center gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-2">
      <span className="px-1 text-sm font-bold text-pin-muted">{COPY.animation.frames}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
        {animation.frames.map((frame, index) => (
          <FrameThumb
            // biome-ignore lint/suspicious/noArrayIndexKey: quadros não têm id; a ordem É a identidade
            key={index}
            bitmap={frame}
            paletteId={asset.paletteId}
            selected={index === selectedIndex}
            label={`Quadro ${index + 1}`}
            onSelect={() => session.getState().selectFrame(index)}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <IconButton
          aria-label={COPY.animation.addFrame}
          title={COPY.animation.addFrame}
          onClick={() =>
            mutate((sprite) => ({
              next: addFrame(sprite, animation.id, selectedIndex),
              selectIndex: selectedIndex + 1,
              limitToast: COPY.animation.frameLimit,
            }))
          }
        >
          <span aria-hidden="true">＋</span>
        </IconButton>
        <IconButton
          aria-label={COPY.animation.duplicateFrame}
          title={COPY.animation.duplicateFrame}
          onClick={() =>
            mutate((sprite) => ({
              next: duplicateFrame(sprite, animation.id, selectedIndex),
              selectIndex: selectedIndex + 1,
              limitToast: COPY.animation.frameLimit,
            }))
          }
        >
          <span aria-hidden="true">🧬</span>
        </IconButton>
        <IconButton
          aria-label={COPY.animation.moveFrameLeft}
          title={COPY.animation.moveFrameLeft}
          disabled={selectedIndex === 0}
          onClick={() =>
            mutate((sprite) => ({
              next: moveFrame(sprite, animation.id, selectedIndex, -1),
              selectIndex: selectedIndex - 1,
            }))
          }
        >
          <span aria-hidden="true">⬅️</span>
        </IconButton>
        <IconButton
          aria-label={COPY.animation.moveFrameRight}
          title={COPY.animation.moveFrameRight}
          disabled={selectedIndex >= animation.frames.length - 1}
          onClick={() =>
            mutate((sprite) => ({
              next: moveFrame(sprite, animation.id, selectedIndex, 1),
              selectIndex: selectedIndex + 1,
            }))
          }
        >
          <span aria-hidden="true">➡️</span>
        </IconButton>
        <IconButton
          aria-label={COPY.animation.removeFrame}
          title={COPY.animation.removeFrame}
          disabled={animation.frames.length <= 1}
          onClick={() =>
            mutate((sprite) => ({
              next: removeFrame(sprite, animation.id, selectedIndex),
              selectIndex: Math.max(selectedIndex - 1, 0),
            }))
          }
        >
          <span aria-hidden="true">🗑️</span>
        </IconButton>
        <IconButton
          active={onion}
          aria-label={COPY.animation.onion}
          aria-pressed={onion}
          title={COPY.animation.onion}
          onClick={() => session.getState().toggleOnion()}
        >
          <span aria-hidden="true">👻</span>
        </IconButton>
      </div>
    </div>
  )
}
