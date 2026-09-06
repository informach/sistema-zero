import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import type { MoldaModelAsset } from '../../../core/model'
import { resolvePaletteColors } from '../../../core/sanitize'
import type { TexelHit } from '../../../model/pick'
import {
  clearOutsideFace,
  type FacePaintTarget,
  facePaintCanvas,
  facePaintFill,
  facePaintSegment,
  mirrorFaceTexel,
} from '../../../paint/facePaint'
import type { BrushSize } from '../../../paint/skinPaint'
import { finishStroke, rotateFaceSkin, sampleColor } from '../../../paint/stroke'
import type { EditorStore } from '../../../state/editorStore'
import { Button, ToolButton } from '../../ui/Button'
import { Dialog } from '../../ui/Dialog'
import { IndexedPixelStage } from '../texture/IndexedPixelStage'
import {
  bindModelCommand,
  commandForShortcut,
  modelCommand,
  PAINT_COMMAND,
} from './commandRegistry'

type ClosePaintTool = 'pencil' | 'eraser' | 'fillFace' | 'picker' | 'rotateSkin'

const TOOLS: readonly ClosePaintTool[] = ['pencil', 'eraser', 'fillFace', 'picker', 'rotateSkin']
const BRUSHES: readonly BrushSize[] = [1, 2, 3]

interface FaceStroke {
  pointerId: number
  before: MoldaModelAsset
  last: TexelHit | null
  lastMirror: TexelHit | null
}

export interface FacePaintDialogProps {
  editor: EditorStore
  target: FacePaintTarget | null
  color: number
  brushSize: BrushSize
  mirror: boolean
  onColor: (index: number) => void
  onBrushSize: (size: BrushSize) => void
  onToggleMirror: () => void
  onClose: () => void
}

export function FacePaintDialog({
  editor,
  target,
  color,
  brushSize,
  mirror,
  onColor,
  onBrushSize,
  onToggleMirror,
  onClose,
}: FacePaintDialogProps): JSX.Element {
  const asset = useStore(editor, (state) => state.asset) as MoldaModelAsset
  const [tool, setTool] = useState<ClosePaintTool>('pencil')
  const stroke = useRef<FaceStroke | null>(null)
  const canvas = target ? facePaintCanvas(asset, target) : null
  const colors = resolvePaletteColors(asset)

  useEffect(() => {
    if (!target || !canvas) return
    function onKeyDown(event: KeyboardEvent): void {
      if (event.defaultPrevented) return
      const element = event.target instanceof HTMLElement ? event.target : null
      if (element && ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return
      const command = commandForShortcut('face-paint', event)
      if (command === 'paint.pencil') setTool('pencil')
      else if (command === 'paint.eraser') setTool('eraser')
      else if (command === 'paint.fill-face') setTool('fillFace')
      else if (command === 'paint.picker') setTool('picker')
      else if (command === 'paint.rotate') setTool('rotateSkin')
      else if (command === 'paint.mirror') onToggleMirror()
      else if (command === 'paint.brush-1') onBrushSize(1)
      else if (command === 'paint.brush-2') onBrushSize(2)
      else if (command === 'paint.brush-3') onBrushSize(3)
      else return
      event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [canvas, onBrushSize, onToggleMirror, target])

  const hitOf = (x: number, y: number): TexelHit | null =>
    target ? { partId: target.partId, face: target.face, x, y } : null

  function maskFor(model: MoldaModelAsset, hit: TexelHit): Uint8Array | undefined {
    return facePaintCanvas(model, { partId: hit.partId, face: hit.face, flipX: false })?.mask
  }

  function paintAt(
    current: MoldaModelAsset,
    from: TexelHit | null,
    hit: TexelHit,
  ): {
    model: MoldaModelAsset
    mirrorHit: TexelHit | null
  } {
    const paintColor = tool === 'eraser' ? 0 : color
    let next = facePaintSegment(current, from, hit, paintColor, brushSize, maskFor(current, hit))
    const mirrorHit = mirror ? mirrorFaceTexel(current, hit) : null
    if (mirrorHit) {
      const previousMirror = stroke.current?.lastMirror ?? null
      next = facePaintSegment(
        next,
        previousMirror,
        mirrorHit,
        paintColor,
        brushSize,
        maskFor(next, mirrorHit),
      )
    }
    return { model: next, mirrorHit }
  }

  function finishGesture(): void {
    const gesture = stroke.current
    stroke.current = null
    if (!gesture) return
    const current = editor.getState().asset as MoldaModelAsset
    const after = finishStroke(current)
    if (after !== current) editor.getState().replace(after)
    if (after !== gesture.before) editor.getState().commitGesture(gesture.before, after)
  }

  function commitOne(next: MoldaModelAsset): void {
    const before = editor.getState().asset as MoldaModelAsset
    const after = finishStroke(next)
    if (after !== before) editor.getState().commit(after)
  }

  function rotateAt(hit: TexelHit): void {
    const before = editor.getState().asset as MoldaModelAsset
    const sourceTurns = target?.flipX ? 3 : 1
    let next = before
    for (let turn = 0; turn < sourceTurns; turn += 1) {
      next = rotateFaceSkin(next, hit.partId, hit.face)
    }
    next = clearOutsideFace(next, hit, maskFor(next, hit))
    const mirrorHit = mirror ? mirrorFaceTexel(before, hit) : null
    if (mirrorHit && (mirrorHit.partId !== hit.partId || mirrorHit.face !== hit.face)) {
      for (let turn = 0; turn < 4 - sourceTurns; turn += 1) {
        next = rotateFaceSkin(next, mirrorHit.partId, mirrorHit.face)
      }
      next = clearOutsideFace(next, mirrorHit, maskFor(next, mirrorHit))
    }
    commitOne(next)
  }

  return (
    <Dialog
      open={target !== null && canvas !== null}
      onClose={() => {
        finishGesture()
        onClose()
      }}
      title={COPY.editor.model.paint.faceEditor.title}
      wide
    >
      {target && canvas ? (
        <div className="flex flex-col gap-3">
          <div
            role="toolbar"
            className="flex flex-wrap gap-2"
            aria-label={COPY.editor.model.toolbox}
          >
            {TOOLS.map((item) =>
              (() => {
                const command = bindModelCommand(PAINT_COMMAND[item], {
                  enabled: true,
                  active: tool === item,
                  run: () => setTool(item),
                })
                return (
                  <ToolButton
                    key={item}
                    icon={command.icon}
                    label={command.label}
                    shortcut={command.shortcut?.display}
                    active={command.active}
                    onClick={command.run}
                  />
                )
              })(),
            )}
            <ToolButton
              icon={modelCommand('paint.mirror').icon}
              label={modelCommand('paint.mirror').label}
              shortcut={modelCommand('paint.mirror').shortcut?.display}
              active={mirror}
              onClick={onToggleMirror}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <div className="mld-panel mx-auto w-full max-w-[32rem] overflow-hidden bg-mld-bg">
              <IndexedPixelStage
                skin={{ width: canvas.width, height: canvas.height, data: canvas.data }}
                colors={colors}
                zeroColor={colors[canvas.baseColor] ?? '#000000'}
                mask={canvas.mask}
                flipX={target.flipX}
                ariaLabel={COPY.editor.model.paint.faceEditor.stage}
                className="mld-pixelated block aspect-square w-full cursor-crosshair touch-none"
                onDown={(point, pointerId) => {
                  const hit = hitOf(point.x, point.y)
                  if (!hit) return
                  const current = editor.getState().asset as MoldaModelAsset
                  if (tool === 'picker') {
                    onColor(sampleColor(current, hit))
                    return
                  }
                  if (tool === 'fillFace') {
                    let next = facePaintFill(current, hit, color, maskFor(current, hit))
                    const mirrorHit = mirror ? mirrorFaceTexel(current, hit) : null
                    if (mirrorHit) {
                      next = facePaintFill(next, mirrorHit, color, maskFor(next, mirrorHit))
                    }
                    commitOne(next)
                    return
                  }
                  if (tool === 'rotateSkin') {
                    rotateAt(hit)
                    return
                  }
                  stroke.current = { pointerId, before: current, last: null, lastMirror: null }
                  const painted = paintAt(current, null, hit)
                  stroke.current.last = hit
                  stroke.current.lastMirror = painted.mirrorHit
                  if (painted.model !== current) editor.getState().replace(painted.model)
                }}
                onMove={(point, pointerId) => {
                  const gesture = stroke.current
                  if (!gesture || gesture.pointerId !== pointerId) return
                  if (!point) {
                    gesture.last = null
                    gesture.lastMirror = null
                    return
                  }
                  const hit = hitOf(point.x, point.y)
                  if (!hit) return
                  const current = editor.getState().asset as MoldaModelAsset
                  const painted = paintAt(current, gesture.last, hit)
                  gesture.last = hit
                  gesture.lastMirror = painted.mirrorHit
                  if (painted.model !== current) editor.getState().replace(painted.model)
                }}
                onUp={(pointerId) => {
                  if (stroke.current?.pointerId === pointerId) finishGesture()
                }}
              />
            </div>
            <div className="flex flex-col gap-3">
              <fieldset>
                <legend className="mb-1 text-xs font-bold text-mld-muted">
                  {COPY.editor.model.paint.sizeLabel}
                </legend>
                <div className="grid grid-cols-3 gap-1">
                  {BRUSHES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={brushSize === size}
                      aria-label={`${COPY.editor.model.paint.sizeLabel}: ${COPY.editor.model.paint.sizes[size]}`}
                      onClick={() => onBrushSize(size)}
                      className={clsx(
                        'min-h-11 rounded-lg border-2 text-sm font-bold',
                        brushSize === size
                          ? 'border-mld-accent bg-mld-accent text-mld-accent-fg'
                          : 'border-mld-border bg-mld-surface text-mld-text',
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1 text-xs font-bold text-mld-muted">
                  {COPY.editor.model.paint.activeColor}
                </legend>
                <div className="grid grid-cols-3 gap-1">
                  {colors.flatMap((hex, index) =>
                    index > 0 && hex
                      ? [
                          <button
                            key={COPY.a11y.colorSwatch(index, hex)}
                            type="button"
                            aria-label={COPY.a11y.colorSwatch(index, hex)}
                            aria-pressed={color === index}
                            onClick={() => onColor(index)}
                            className={clsx(
                              'aspect-square min-h-11 min-w-11 rounded-md border-2',
                              color === index ? 'border-mld-text' : 'border-mld-border',
                            )}
                            style={{ backgroundColor: hex }}
                          />,
                        ]
                      : [],
                  )}
                </div>
              </fieldset>
            </div>
          </div>
          <p className="text-xs text-mld-muted">{COPY.editor.model.paint.faceEditor.outside}</p>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                finishGesture()
                onClose()
              }}
            >
              {COPY.editor.model.paint.faceEditor.done}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
