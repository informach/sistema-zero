/**
 * Faixa "Spritesheet" do rodapé (layout da imagem-modelo): UMA linha por
 * animação, com os quadros DELA na própria linha. Junta o que antes eram dois
 * painéis — a lista de animações e a tira de quadros — num só lugar, sem
 * perder nenhuma ação:
 *  - cabeçalho: contagem de animações + "Nova animação";
 *  - cada linha: selecionar/renomear/duplicar/apagar a animação;
 *  - quadros inline: clicar seleciona (animação + quadro); na animação
 *    selecionada aparecem as ações de quadro (novo/duplicar/mover/apagar) + o
 *    fantasma (onion). Toda mutação usa os MESMOS helpers puros de
 *    `animation/frames.ts`.
 *
 * Serve os dois estilos: thumbs pixel pintam num canvas (paleta resolvida),
 * vetoriais são SVG inline.
 */
import type { JSX, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addAnimation,
  addFrame,
  duplicateAnimation,
  duplicateFrame,
  moveFrame,
  removeAnimation,
  removeFrame,
  renameAnimation,
} from '../../animation/frames'
import { activeAnimationOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import {
  type AnimatedSpriteAsset,
  isAnimatedSpriteKind,
  type PintaBitmap,
  type PintaPixelFrame,
  resolveAssetPalette,
  type VectorFrame,
} from '../../core/project'
import { flattenCels } from '../../pixel/layers'
import { paintBitmap } from '../../pixel/render'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Ghost,
  type LucideIcon,
  Pencil,
  Plus,
  Trash2,
} from '../ui/icons'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'

function PixelFrameThumb({
  bitmap,
  colors,
}: {
  /** Já ACHATADO (camadas visíveis); null = quadro sem nada visível. */
  bitmap: PintaBitmap | null
  colors: readonly string[]
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas && bitmap) paintBitmap(canvas, bitmap, colors)
  }, [bitmap, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

/** Botãozinho de ícone das ações (mesmo alvo ≥44px dos rails). */
function RowAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  danger,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  danger?: boolean
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'pin-tool-active bg-pin-accent text-pin-accent-fg'
          : danger
            ? 'text-pin-text hover:bg-pin-danger/20'
            : 'text-pin-text hover:bg-pin-border/40'
      }`}
    >
      <Icon aria-hidden={true} className="size-4" />
    </button>
  )
}

export function SpriteSheetPanel({
  zoomSlot,
  className,
}: {
  zoomSlot?: ReactNode
  className?: string
}): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const onion = useSession((state) => state.onion)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const colors = useMemo(() => resolveAssetPalette(asset), [asset])

  if (!isAnimatedSpriteKind(asset)) return null
  const active = activeAnimationOf(asset, { animationId, frameIndex })
  const activeId = active?.id ?? asset.animations[0]?.id ?? null
  const selectedFrame = active ? Math.min(frameIndex, active.frames.length - 1) : 0

  /** Muta os QUADROS da animação `animId`. */
  function mutateFrames(
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

  function withSprite(action: (sprite: AnimatedSpriteAsset) => void): void {
    const current = editor.getState().asset
    if (isAnimatedSpriteKind(current)) action(current)
  }

  function addNewAnimation(): void {
    withSprite((sprite) => {
      const result = addAnimation(sprite)
      if (!result.animationId) {
        showToast(COPY.animation.animationLimit)
        return
      }
      editor.getState().commit(result.asset)
      session.getState().selectAnimation(result.animationId)
    })
  }

  return (
    <section
      aria-label={COPY.animation.spritesheet}
      className={`pin-panel flex min-h-0 flex-col gap-2 p-2 ${className ?? ''}`}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Mesmo título dos painéis irmãos (Camadas/Cores/Prévia). */}
          <span className="px-1 font-bold text-pin-text">{COPY.animation.spritesheet}</span>
          <span className="rounded-full bg-pin-accent/15 px-2 py-0.5 text-xs font-bold text-pin-muted">
            {COPY.animation.animationCount(asset.animations.length)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {zoomSlot}
          <Button variant="primary" onClick={addNewAnimation}>
            <Plus aria-hidden="true" className="size-4" />
            {COPY.animation.addAnimation}
          </Button>
        </div>
      </header>

      <div className="flex max-h-56 min-h-0 flex-col gap-1 overflow-y-auto">
        {asset.animations.map((animation) => {
          const selected = animation.id === activeId
          return (
            <div
              key={animation.id}
              className={`flex flex-wrap items-center gap-2 rounded-xl border-2 p-1.5 transition ${
                selected ? 'border-pin-accent bg-pin-accent/5' : 'border-pin-border'
              }`}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => session.getState().selectAnimation(animation.id)}
                title={animation.name}
                className="flex min-h-11 w-24 shrink-0 flex-col justify-center rounded-lg px-2 text-left transition hover:bg-pin-border/30"
              >
                <span className="truncate text-sm font-bold text-pin-text">{animation.name}</span>
                <span className="text-xs text-pin-muted">
                  {COPY.animation.frameCount(animation.frames.length)}
                </span>
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
                {animation.frames.map((frame, index) => {
                  const frameSelected = selected && index === selectedFrame
                  return (
                    <button
                      // biome-ignore lint/suspicious/noArrayIndexKey: quadros não têm id; a ordem É a identidade
                      key={index}
                      type="button"
                      aria-label={COPY.a11y.sheetFrame(animation.name, index + 1)}
                      aria-pressed={frameSelected}
                      onClick={() => {
                        const s = session.getState()
                        s.selectAnimation(animation.id)
                        s.selectFrame(index)
                      }}
                      className={`pin-checkerboard h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        frameSelected
                          ? 'border-pin-accent ring-2 ring-pin-accent'
                          : 'border-pin-border'
                      }`}
                    >
                      {asset.kind === 'pixel-sprite' ? (
                        <PixelFrameThumb
                          bitmap={flattenCels(frame as PintaPixelFrame, asset.layers)}
                          colors={colors}
                        />
                      ) : (
                        <VectorFrameSvg
                          width={asset.frameWidth}
                          height={asset.frameHeight}
                          shapes={frame as VectorFrame}
                          className="h-full w-full"
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {selected ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {/* Ações de QUADRO (sobre o quadro selecionado). */}
                  <RowAction
                    icon={Plus}
                    label={COPY.animation.addFrame}
                    onClick={() =>
                      mutateFrames((sprite) => ({
                        next: addFrame(sprite, animation.id, selectedFrame),
                        selectIndex: selectedFrame + 1,
                        limitToast: COPY.animation.frameLimit,
                      }))
                    }
                  />
                  <RowAction
                    icon={Copy}
                    label={COPY.animation.duplicateFrame}
                    onClick={() =>
                      mutateFrames((sprite) => ({
                        next: duplicateFrame(sprite, animation.id, selectedFrame),
                        selectIndex: selectedFrame + 1,
                        limitToast: COPY.animation.frameLimit,
                      }))
                    }
                  />
                  <RowAction
                    icon={ChevronLeft}
                    label={COPY.animation.moveFrameLeft}
                    disabled={selectedFrame === 0}
                    onClick={() =>
                      mutateFrames((sprite) => ({
                        next: moveFrame(sprite, animation.id, selectedFrame, -1),
                        selectIndex: selectedFrame - 1,
                      }))
                    }
                  />
                  <RowAction
                    icon={ChevronRight}
                    label={COPY.animation.moveFrameRight}
                    disabled={selectedFrame >= animation.frames.length - 1}
                    onClick={() =>
                      mutateFrames((sprite) => ({
                        next: moveFrame(sprite, animation.id, selectedFrame, 1),
                        selectIndex: selectedFrame + 1,
                      }))
                    }
                  />
                  <RowAction
                    icon={Trash2}
                    label={COPY.animation.removeFrame}
                    disabled={animation.frames.length <= 1}
                    danger
                    onClick={() =>
                      mutateFrames((sprite) => ({
                        next: removeFrame(sprite, animation.id, selectedFrame),
                        selectIndex: Math.max(selectedFrame - 1, 0),
                      }))
                    }
                  />
                  <RowAction
                    icon={Ghost}
                    label={COPY.animation.onion}
                    active={onion}
                    onClick={() => session.getState().toggleOnion()}
                  />
                  <span className="mx-0.5 h-6 w-px bg-pin-border" aria-hidden="true" />
                  {/* Ações da ANIMAÇÃO. */}
                  <RowAction
                    icon={Pencil}
                    label={`${COPY.animation.renameAnimation}: ${animation.name}`}
                    onClick={() => {
                      setRenaming(animation.id)
                      setRenameValue(animation.name)
                    }}
                  />
                  <RowAction
                    icon={Copy}
                    label={`${COPY.animation.duplicateAnimation}: ${animation.name}`}
                    onClick={() =>
                      withSprite((sprite) => {
                        const result = duplicateAnimation(sprite, animation.id)
                        if (!result.animationId) {
                          showToast(COPY.animation.animationLimit)
                          return
                        }
                        editor.getState().commit(result.asset)
                        session.getState().selectAnimation(result.animationId)
                      })
                    }
                  />
                  <RowAction
                    icon={Trash2}
                    label={`${COPY.animation.removeAnimation}: ${animation.name}`}
                    disabled={asset.animations.length <= 1}
                    danger
                    onClick={() =>
                      withSprite((sprite) => {
                        const next = removeAnimation(sprite, animation.id)
                        if (next === sprite) return
                        editor.getState().commit(next)
                        const first = next.animations[0]
                        if (first) session.getState().selectAnimation(first.id)
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title={COPY.animation.renameAnimation}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!renaming) return
            withSprite((sprite) => {
              const next = renameAnimation(sprite, renaming, renameValue)
              if (next !== sprite) editor.getState().commit(next)
            })
            setRenaming(null)
          }}
        >
          <input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={COPY.animation.renameAnimation}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {COPY.gallery.rename}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  )
}
