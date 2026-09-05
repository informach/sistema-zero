/**
 * O editor da TEXTURA: caixa de ferramentas à esquerda (lápis, borracha, balde,
 * conta-gotas, tamanho, sem emenda, deslocar meio), a folha de pixels no
 * centro com a prévia repetida 3×3 e a prévia 3D (cubo + bola) embaixo, e as
 * cores à direita. Um gesto de pintura = UM passo de desfazer. "Sem emenda"
 * faz o traço e o balde atravessarem a borda; "Deslocar meio" é só de vista.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import type { MoldaTextureAsset } from '../../../core/model'
import type { PaletteId } from '../../../core/palette'
import { triggerDownload } from '../../../export/download'
import { exportTexturePng, PNG_MIME, textureToRgba } from '../../../export/texturePng'
import type { BrushSize } from '../../../paint/skinPaint'
import type { EditorStore } from '../../../state/editorStore'
import {
  addTextureColor,
  floodFillTexture,
  lineTexelsWrap,
  paintTexture,
  removeTextureColor,
  sampleTexture,
} from '../../../texture/ops'
import { prefersReducedMotion } from '../../../viewport/reducedMotion'
import type { TexturePreviewLike } from '../../../viewport/TexturePreview'
import { createTexturePreview } from '../../../viewport/texturePreviewFactory'
import { Button, ToolButton } from '../../ui/Button'
import { isMoldaDialogOpen } from '../../ui/Dialog'
import {
  Download,
  Eraser,
  Grid3x3,
  type LucideIcon,
  Move,
  PaintBucket,
  Pencil,
  Pipette,
} from '../../ui/icons'
import { Panel } from '../../ui/Panel'
import { useToast } from '../../ui/Toast'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { EditorTopBar } from '../EditorTopBar'
import { ColorsPanel } from '../model/ColorsPanel'
import { PixelStage, TiledPreview } from './PixelStage'

export type TextureTool = 'pencil' | 'eraser' | 'fill' | 'picker'

const TOOL_ICONS: Record<TextureTool, LucideIcon> = {
  pencil: Pencil,
  eraser: Eraser,
  fill: PaintBucket,
  picker: Pipette,
}
const TOOL_SHORTCUTS: Record<TextureTool, string> = {
  pencil: 'P',
  eraser: 'E',
  fill: 'G',
  picker: 'I',
}
const TOOLS: TextureTool[] = ['pencil', 'eraser', 'fill', 'picker']
const SIZES: BrushSize[] = [1, 2, 3]

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function chip(active: boolean): string {
  return clsx(
    'min-h-11 rounded-lg border-2 px-1 text-xs font-bold transition',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
    active
      ? 'border-mld-accent bg-mld-accent text-mld-accent-fg'
      : 'border-mld-border bg-mld-surface text-mld-text hover:border-mld-accent',
  )
}

function useTexturePreviewCanvas(): {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  preview: TexturePreviewLike | null
  unsupported: boolean
} {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [preview, setPreview] = useState<TexturePreviewLike | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let instance: TexturePreviewLike
    try {
      instance = createTexturePreview(canvas, { reducedMotion: prefersReducedMotion() })
    } catch {
      setUnsupported(true)
      return
    }
    setPreview(instance)
    return () => {
      instance.dispose()
      setPreview(null)
    }
  }, [])
  return { canvasRef, preview, unsupported }
}

export function TextureEditor({
  editor,
  onBack,
}: {
  editor: EditorStore
  onBack: () => void
}): JSX.Element {
  const asset = useStore(editor, (state) => state.asset) as MoldaTextureAsset
  const { showToast } = useToast()
  const wide = useMediaQuery('(min-width: 768px)')
  const copy = COPY.editor.texture
  const [tool, setTool] = useState<TextureTool>('pencil')
  const [brush, setBrush] = useState<BrushSize>(1)
  const [color, setColor] = useState(1)
  const [shifted, setShifted] = useState(false)
  const stroke = useRef<{
    pointerId: number
    before: MoldaTextureAsset
    last: [number, number] | null
  } | null>(null)
  const { canvasRef, preview, unsupported } = useTexturePreviewCanvas()
  const size = asset.bitmap.width
  const offset: [number, number] = shifted ? [size / 2, size / 2] : [0, 0]

  const current = useCallback(() => editor.getState().asset as MoldaTextureAsset, [editor])
  const commit = useCallback(
    (next: MoldaTextureAsset) => {
      if (next !== editor.getState().asset) editor.getState().commit(next)
    },
    [editor],
  )

  useEffect(() => {
    if (!preview) return
    preview.setTexture(textureToRgba(asset), asset.bitmap.width)
  }, [preview, asset])

  // ── Gesto de pintura ──────────────────────────────────────────────────────

  function paintAt(x: number, y: number): void {
    const active = stroke.current
    if (!active) return
    const now = current()
    const value = tool === 'eraser' ? 0 : color
    const texels = active.last
      ? lineTexelsWrap(size, active.last[0], active.last[1], x, y, now.seamless)
      : [[x, y] as [number, number]]
    const next = paintTexture(now, texels, value, brush, now.seamless)
    active.last = [x, y]
    if (next !== now) editor.getState().replace(next)
  }

  function onDown(x: number, y: number, pointerId: number): void {
    const now = current()
    switch (tool) {
      case 'picker': {
        const index = sampleTexture(now, x, y)
        if (index > 0) setColor(index)
        return
      }
      case 'fill':
        commit(floodFillTexture(now, x, y, color, now.seamless))
        return
      default:
        stroke.current = { pointerId, before: now, last: null }
        paintAt(x, y)
    }
  }

  function onMove(x: number, y: number, pointerId: number): void {
    if (stroke.current?.pointerId !== pointerId) return
    if (stroke.current.last && stroke.current.last[0] === x && stroke.current.last[1] === y) return
    paintAt(x, y)
  }

  function onUp(pointerId: number): void {
    const active = stroke.current
    if (!active || active.pointerId !== pointerId) return
    stroke.current = null
    const after = current()
    if (after !== active.before) editor.getState().commitGesture(active.before, after)
  }

  function download(): void {
    const result = exportTexturePng(current())
    if (!result.ok) {
      showToast(copy.download.tooBig)
      return
    }
    const blob = new Blob([result.bytes as BlobPart], { type: PNG_MIME })
    showToast(
      triggerDownload(blob, `${current().name}.png`, PNG_MIME)
        ? copy.download.ready
        : copy.download.failed,
    )
  }

  // Atalhos (desfazer/refazer vivem na casca).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented || isMoldaDialogOpen() || isTypingTarget(event.target)) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      switch (event.key.toLowerCase()) {
        case 'p':
          setTool('pencil')
          break
        case 'e':
          setTool('eraser')
          break
        case 'g':
          setTool('fill')
          break
        case 'i':
          setTool('picker')
          break
        case '1':
        case '2':
        case '3':
          setBrush(Number(event.key) as BrushSize)
          break
        case 's':
          commit({ ...current(), seamless: !current().seamless })
          break
        case 'd':
          setShifted((value) => !value)
          break
        default:
          return
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [commit, current])

  const colors = (
    <ColorsPanel
      palette={asset}
      activeIndex={color}
      canPick
      onPick={setColor}
      onAddColor={(hex) => {
        const result = addTextureColor(current(), hex)
        if (!result) {
          showToast(COPY.editor.model.colorsFull)
          return
        }
        commit(result.asset)
        setColor(result.index)
      }}
      onRemoveColor={(index) => {
        const next = removeTextureColor(current(), index)
        if (!next) {
          showToast(COPY.editor.model.paint.removeColorBase)
          return
        }
        commit(next)
        if (color >= index) setColor(1)
        showToast(COPY.editor.model.paint.removedColor)
      }}
      onPalette={(id: PaletteId) => {
        const { customPalette: _customPalette, ...asset } = current()
        commit({ ...asset, paletteId: id })
      }}
      className="shrink-0"
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorTopBar
        editor={editor}
        onBack={onBack}
        actions={
          <Button
            variant="outline"
            onClick={download}
            aria-label={copy.download.png}
            title={copy.download.png}
            className="min-h-11 px-3 text-sm"
          >
            <Download aria-hidden="true" className="size-4" />
            <span className="hidden md:inline">{copy.download.png}</span>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside
          aria-label={COPY.editor.model.toolbox}
          className="flex w-28 shrink-0 flex-col gap-2 overflow-y-auto border-r-2 border-mld-border bg-mld-surface p-2"
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
              {COPY.editor.model.toolbox}
            </legend>
            <div className="grid grid-cols-2 gap-1">
              {TOOLS.map((item) => (
                <ToolButton
                  key={item}
                  icon={TOOL_ICONS[item]}
                  label={copy.tools[item]}
                  shortcut={TOOL_SHORTCUTS[item]}
                  active={tool === item}
                  onClick={() => setTool(item)}
                />
              ))}
              <ToolButton
                icon={Grid3x3}
                label={copy.seamless}
                shortcut="S"
                active={asset.seamless}
                onClick={() => commit({ ...current(), seamless: !current().seamless })}
              />
              <ToolButton
                icon={Move}
                label={copy.shiftHalf}
                shortcut="D"
                active={shifted}
                onClick={() => setShifted((value) => !value)}
              />
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="mld-display px-1 text-[0.65rem] uppercase tracking-wide text-mld-muted">
              {COPY.editor.model.paint.sizeLabel}
            </legend>
            <div className="grid grid-cols-3 gap-1">
              {SIZES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={brush === item}
                  aria-label={`${COPY.editor.model.paint.sizeLabel}: ${COPY.editor.model.paint.sizes[item]}`}
                  onClick={() => setBrush(item)}
                  className={chip(brush === item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="px-1 text-[0.7rem] text-mld-muted">{copy.transparentHint}</p>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-start">
            <div className="mld-checkerboard mld-panel mx-auto w-full max-w-[32rem] overflow-hidden lg:mx-0">
              <PixelStage
                asset={asset}
                offset={offset}
                onDown={onDown}
                onMove={onMove}
                onUp={onUp}
              />
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-56">
              <Panel title={copy.tiled} className="shrink-0" bodyClassName="mld-checkerboard p-0">
                <TiledPreview asset={asset} />
              </Panel>
              <Panel title={copy.preview3d} className="shrink-0" bodyClassName="p-0">
                <div className="relative aspect-square w-full overflow-hidden bg-mld-bg">
                  {unsupported ? (
                    <p className="p-3 text-center text-xs text-mld-text-soft">{copy.unsupported}</p>
                  ) : (
                    <canvas
                      ref={canvasRef}
                      aria-label={copy.preview3d}
                      className="mld-viewport block size-full"
                    />
                  )}
                </div>
              </Panel>
            </div>
          </div>
          {!wide ? <div className="flex flex-col gap-2 p-2">{colors}</div> : null}
        </div>
        {wide ? (
          <aside className="flex w-68 shrink-0 flex-col gap-2 overflow-y-auto border-l-2 border-mld-border bg-mld-bg p-2">
            {colors}
          </aside>
        ) : null}
      </div>
    </div>
  )
}
