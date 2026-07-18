/**
 * Filmstrip dos quadros da animação selecionada (embaixo do canvas, layout
 * MakeCode): miniaturas clicáveis + novo/duplicar/apagar/mover + o toggle 👻
 * do onion skin. Mutação = helpers puros de frames.ts → commit no editorStore.
 * Serve os DOIS estilos: thumbs pixel pintam num canvas; thumbs vetoriais são
 * SVG inline.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { addFrame, duplicateFrame, moveFrame, removeFrame } from '../../animation/frames'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import {
  type AnimatedSpriteAsset,
  isAnimatedSpriteKind,
  type PintaBitmap,
  resolveAssetPalette,
  type VectorFrame,
} from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { ToolButton } from '../ui/Button'
import { ChevronLeft, ChevronRight, Copy, Ghost, Plus, Trash2 } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'

function ThumbButton({
  selected,
  label,
  onSelect,
  children,
}: {
  selected: boolean
  label: string
  onSelect: () => void
  children: JSX.Element
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`pin-checkerboard h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
        selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
      }`}
    >
      {children}
    </button>
  )
}

function PixelFrameThumb({
  bitmap,
  colors,
}: {
  bitmap: PintaBitmap
  colors: readonly string[]
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) paintBitmap(canvas, bitmap, colors)
  }, [bitmap, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export function FrameStrip({ className }: { className?: string }): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const onion = useSession((state) => state.onion)
  // Paleta efetiva (base + extras) memoizada por asset — estável entre
  // re-renders de sessão (selecionar quadro não repinta os thumbs à toa).
  const colors = useMemo(() => resolveAssetPalette(asset), [asset])

  if (!isAnimatedSpriteKind(asset)) return null
  const animation = activeAnimationOf(asset, { animationId, frameIndex })
  if (!animation) return null
  const selectedIndex = Math.min(frameIndex, animation.frames.length - 1)

  function mutate(
    op: (sprite: AnimatedSpriteAsset) => {
      next: AnimatedSpriteAsset
      selectIndex?: number
      limitToast?: string
    },
  ): void {
    const current = editor.getState().asset
    if (!isAnimatedSpriteKind(current)) return
    const { next, selectIndex, limitToast } = op(current)
    if (next === current) {
      if (limitToast) showToast(limitToast)
      return
    }
    editor.getState().commit(next)
    if (selectIndex !== undefined) session.getState().selectFrame(selectIndex)
  }

  return (
    <div className={clsx('pin-panel flex items-center gap-2 p-2', className)}>
      <span className="px-1 text-sm font-bold text-pin-muted">{COPY.animation.frames}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
        {animation.frames.map((frame, index) => (
          <ThumbButton
            // biome-ignore lint/suspicious/noArrayIndexKey: quadros não têm id; a ordem É a identidade
            key={index}
            selected={index === selectedIndex}
            label={COPY.a11y.frameLabel(index + 1)}
            onSelect={() => session.getState().selectFrame(index)}
          >
            {asset.kind === 'pixel-sprite' ? (
              <PixelFrameThumb bitmap={frame as PintaBitmap} colors={colors} />
            ) : (
              <VectorFrameSvg
                width={asset.frameWidth}
                height={asset.frameHeight}
                shapes={frame as VectorFrame}
                className="h-full w-full"
              />
            )}
          </ThumbButton>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <ToolButton
          icon={Plus}
          label={COPY.animation.addFrame}
          onClick={() =>
            mutate((sprite) => ({
              next: addFrame(sprite, animation.id, selectedIndex),
              selectIndex: selectedIndex + 1,
              limitToast: COPY.animation.frameLimit,
            }))
          }
        />
        <ToolButton
          icon={Copy}
          label={COPY.animation.duplicateFrame}
          onClick={() =>
            mutate((sprite) => ({
              next: duplicateFrame(sprite, animation.id, selectedIndex),
              selectIndex: selectedIndex + 1,
              limitToast: COPY.animation.frameLimit,
            }))
          }
        />
        <ToolButton
          icon={ChevronLeft}
          label={COPY.animation.moveFrameLeft}
          disabled={selectedIndex === 0}
          onClick={() =>
            mutate((sprite) => ({
              next: moveFrame(sprite, animation.id, selectedIndex, -1),
              selectIndex: selectedIndex - 1,
            }))
          }
        />
        <ToolButton
          icon={ChevronRight}
          label={COPY.animation.moveFrameRight}
          disabled={selectedIndex >= animation.frames.length - 1}
          onClick={() =>
            mutate((sprite) => ({
              next: moveFrame(sprite, animation.id, selectedIndex, 1),
              selectIndex: selectedIndex + 1,
            }))
          }
        />
        <ToolButton
          icon={Trash2}
          label={COPY.animation.removeFrame}
          disabled={animation.frames.length <= 1}
          onClick={() =>
            mutate((sprite) => ({
              next: removeFrame(sprite, animation.id, selectedIndex),
              selectIndex: Math.max(selectedIndex - 1, 0),
            }))
          }
        />
        <ToolButton
          icon={Ghost}
          label={COPY.animation.onion}
          active={onion}
          onClick={() => session.getState().toggleOnion()}
        />
      </div>
    </div>
  )
}
