/**
 * A bancada do modelo: MONTAR e PINTAR. Caixa de ferramentas à esquerda (muda
 * com o modo), palco no centro, coluna da direita (Peças → Cores →
 * Propriedades; em tela estreita vira um disclosure abaixo do palco). Toda
 * mudança passa pelas operações puras de `model/partOps.ts` e `paint/stroke.ts`
 * e entra no editor por `commit` (um passo de desfazer) ou, durante um gesto,
 * por `replace` + `commitGesture` no soltar.
 *
 * A miniatura do modelo é uma foto do palco: refeita com atraso depois de cada
 * mudança nas peças e guardada no asset (`setThumb`, sem histórico).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { COPY } from '../../../core/copy'
import { MOLDA_LIMITS, type TexelsPerUnit } from '../../../core/limits'
import type { MoldaModelAsset, MoldaTextureAsset, ShapeId, Vec3 } from '../../../core/model'
import type { PaletteId } from '../../../core/palette'
import { triggerDownload } from '../../../export/download'
import { exportModelGlb, GLB_MIME } from '../../../export/modelGlb'
import { modelTriangleCount } from '../../../model/geometry'
import {
  addExtraColor,
  addPart,
  addPartAtSurface,
  duplicatePart,
  findPart,
  movePartBy,
  removeExtraColor,
  removePart,
  setMirrorX,
  setPartBox,
  setPartSize,
  setSnap,
  setTexelsPerUnit,
  updatePart,
} from '../../../model/partOps'
import type { BrushSize } from '../../../paint/skinPaint'
import type { PaintTool } from '../../../paint/stroke'
import type { EditorStore } from '../../../state/editorStore'
import {
  createSessionStore,
  type EditorMode,
  type TransformTool,
} from '../../../state/sessionStore'
import { type ApplyMode, applyTextureToPart } from '../../../texture/ops'
import { prefersReducedMotion } from '../../../viewport/reducedMotion'
import type { AtlasInfo, DragPatch, ViewName } from '../../../viewport/types'
import { useViewport } from '../../../viewport/useViewport'
import { Button } from '../../ui/Button'
import { Download } from '../../ui/icons'
import { useToast } from '../../ui/Toast'
import { useMediaQuery } from '../../ui/useMediaQuery'
import { EditorTopBar } from '../EditorTopBar'
import { ApplyTextureDialog } from './ApplyTextureDialog'
import { ColorsPanel } from './ColorsPanel'
import { useModelEditorShortcuts, useModelThumbnail } from './modelEditorHooks'
import { PaintToolbox } from './PaintToolbox'
import { PartsPanel } from './PartsPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { Toolbox } from './Toolbox'
import { ViewportPane } from './ViewportPane'

function applyPatch(model: MoldaModelAsset, patch: DragPatch): MoldaModelAsset {
  let next = model
  if (patch.from && patch.to) next = setPartBox(next, patch.id, patch.from, patch.to)
  if (patch.rotation) next = updatePart(next, patch.id, { rotation: patch.rotation })
  return next
}

function ModeTabs({
  mode,
  onMode,
}: {
  mode: EditorMode
  onMode: (mode: EditorMode) => void
}): JSX.Element {
  const modes: EditorMode[] = ['build', 'paint']
  return (
    <div className="flex rounded-full border-2 border-mld-border bg-mld-bg p-0.5">
      {modes.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={mode === item}
          onClick={() => onMode(item)}
          className={clsx(
            'min-h-11 rounded-full px-4 text-sm font-bold transition',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
            mode === item
              ? 'bg-mld-accent text-mld-accent-fg'
              : 'text-mld-text hover:bg-mld-border/40',
          )}
        >
          {COPY.editor.model.mode[item]}
        </button>
      ))}
    </div>
  )
}

export function ModelEditor({
  editor,
  onBack,
}: {
  editor: EditorStore
  onBack: () => void
}): JSX.Element {
  const { showToast } = useToast()
  const [session] = useState(() => createSessionStore())
  const asset = useStore(editor, (state) => state.asset) as MoldaModelAsset
  const mode = useStore(session, (state) => state.mode)
  const tool = useStore(session, (state) => state.tool)
  const selectedId = useStore(session, (state) => state.selectedId)
  const gridVisible = useStore(session, (state) => state.gridVisible)
  const paintTool = useStore(session, (state) => state.paintTool)
  const paintColor = useStore(session, (state) => state.paintColor)
  const brushSize = useStore(session, (state) => state.brushSize)
  const mirrorPaint = useStore(session, (state) => state.mirrorPaint)
  const placingShape = useStore(session, (state) => state.placingShape)
  const wide = useMediaQuery('(min-width: 768px)')
  const gestureBefore = useRef<MoldaModelAsset | null>(null)
  const [atlas, setAtlas] = useState<AtlasInfo | null>(null)
  const atlasFullWarned = useRef(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const model = useCallback(
    (): MoldaModelAsset => editor.getState().asset as MoldaModelAsset,
    [editor],
  )
  const commit = useCallback(
    (next: MoldaModelAsset) => {
      if (next !== editor.getState().asset) editor.getState().commit(next)
    },
    [editor],
  )
  const placeAtSurface = useCallback(
    (shape: ShapeId, point: Vec3, normal: Vec3, nearId: string | null) => {
      const result = addPartAtSurface(model(), shape, point, normal, { nearId })
      session.getState().setPlacingShape(null)
      if (!result) {
        showToast(COPY.editor.model.partsFull)
        return
      }
      commit(result.model)
      session.getState().select(result.partId)
    },
    [commit, model, session, showToast],
  )

  const { canvasRef, viewport, unsupported } = useViewport(
    {
      onSelect: (id) => session.getState().select(id),
      onPlace: placeAtSurface,
      onDragStart: () => {
        gestureBefore.current = model()
      },
      onDragMove: (patch) => {
        const current = model()
        const next = applyPatch(current, patch)
        if (next !== current) editor.getState().replace(next)
      },
      onDragEnd: (patch) => {
        const before = gestureBefore.current
        gestureBefore.current = null
        let after = model()
        if (patch) after = applyPatch(after, patch)
        if (before && after !== before) editor.getState().commitGesture(before, after)
      },
      onPaintStart: () => {
        gestureBefore.current = model()
      },
      onPaintEnd: (after) => {
        const before = gestureBefore.current ?? model()
        gestureBefore.current = null
        if (after !== before) editor.getState().commitGesture(before, after)
      },
      onPickColor: (index) => session.getState().setPaintColor(index),
      onAtlas: (info) => {
        setAtlas(info)
        if (info.full && !atlasFullWarned.current) {
          atlasFullWarned.current = true
          showToast(COPY.editor.model.paint.atlasFull)
        }
        if (!info.full) atlasFullWarned.current = false
      },
    },
    { reducedMotion: prefersReducedMotion() },
  )

  // Palco ← estado.
  useEffect(() => {
    viewport?.setModel(asset)
  }, [viewport, asset])
  useEffect(() => {
    viewport?.setSelected(selectedId)
  }, [viewport, selectedId])
  useEffect(() => {
    viewport?.setMode(mode)
  }, [viewport, mode])
  useEffect(() => {
    viewport?.setTool(tool)
  }, [viewport, tool])
  useEffect(() => {
    viewport?.setPlacementShape(placingShape)
  }, [viewport, placingShape])
  useEffect(() => {
    viewport?.setPaint({ tool: paintTool, color: paintColor, size: brushSize, mirror: mirrorPaint })
  }, [viewport, paintTool, paintColor, brushSize, mirrorPaint])
  useEffect(() => {
    viewport?.setSnap(asset.snap)
  }, [viewport, asset.snap])
  useEffect(() => {
    viewport?.setGridVisible(gridVisible)
  }, [viewport, gridVisible])

  // Seleção que sumiu (apagada, desfeita) volta a "nada".
  useEffect(() => {
    if (selectedId && !findPart(asset, selectedId)) session.getState().select(null)
  }, [asset, selectedId, session])

  useModelThumbnail(editor, viewport, gestureBefore)

  // ── Ações ─────────────────────────────────────────────────────────────────

  const add = useCallback(
    (shape: ShapeId) => {
      const result = addPart(model(), shape, { nearId: session.getState().selectedId })
      if (!result) {
        showToast(COPY.editor.model.partsFull)
        return
      }
      commit(result.model)
      session.getState().select(result.partId)
    },
    [commit, model, session, showToast],
  )

  const startPlacement = useCallback(
    (shape: ShapeId) => {
      if (model().parts.length >= MOLDA_LIMITS.maxParts) {
        showToast(COPY.editor.model.partsFull)
        return
      }
      session.getState().setPlacingShape(shape)
      showToast(COPY.editor.model.placeHint)
    },
    [model, session, showToast],
  )

  const duplicate = useCallback(() => {
    const id = session.getState().selectedId
    if (!id) return
    const result = duplicatePart(model(), id)
    if (!result) {
      showToast(COPY.editor.model.partsFull)
      return
    }
    commit(result.model)
    session.getState().select(result.partId)
  }, [commit, model, session, showToast])

  const remove = useCallback(() => {
    const id = session.getState().selectedId
    if (!id) return
    commit(removePart(model(), id))
    session.getState().select(null)
  }, [commit, model, session])

  const toggleMirror = useCallback(() => {
    const current = model()
    commit(setMirrorX(current, !current.mirrorX))
  }, [commit, model])

  const toggleSnap = useCallback(() => {
    const current = model()
    commit(setSnap(current, current.snap === 1 ? 0.5 : 1))
  }, [commit, model])

  const openApplyTexture = useCallback(() => {
    if (!session.getState().selectedId) {
      showToast(COPY.editor.model.paint.apply.selectPart)
      return
    }
    setApplyOpen(true)
  }, [session, showToast])

  const applyTexture = useCallback(
    (texture: MoldaTextureAsset, mode: ApplyMode) => {
      const id = session.getState().selectedId
      setApplyOpen(false)
      if (!id) return
      commit(applyTextureToPart(model(), id, texture, mode))
      showToast(COPY.editor.model.paint.apply.applied)
    },
    [commit, model, session, showToast],
  )

  const download = useCallback(() => {
    const result = exportModelGlb(model())
    if (!result.ok) {
      const copy = COPY.editor.model
      showToast(
        result.reason === 'empty'
          ? copy.download.empty
          : result.reason === 'atlas-full'
            ? copy.paint.atlasFull
            : copy.download.tooBig,
      )
      return
    }
    const blob = new Blob([result.bytes as BlobPart], { type: GLB_MIME })
    if (triggerDownload(blob, `${model().name}.glb`, GLB_MIME)) {
      showToast(COPY.editor.model.download.ready)
    } else {
      showToast(COPY.editor.model.download.failed)
    }
  }, [model, showToast])

  useModelEditorShortcuts({ session, add, duplicate, remove, toggleMirror })

  const selectedPart = selectedId ? (findPart(asset, selectedId) ?? null) : null
  const statusBase = COPY.editor.model.status(
    asset.parts.length,
    MOLDA_LIMITS.maxParts,
    modelTriangleCount(asset),
  )
  const status =
    atlas && atlas.size > 0
      ? `${statusBase} · ${COPY.editor.model.statusAtlas(atlas.size)}`
      : statusBase
  const onView = useCallback((view: ViewName) => viewport?.setView(view), [viewport])

  const panels = useMemo(
    () => (
      <>
        <PartsPanel
          model={asset}
          selectedId={selectedId}
          onSelect={(id) => session.getState().select(id)}
          className="max-h-64 shrink-0"
        />
        <ColorsPanel
          palette={asset}
          activeIndex={mode === 'paint' ? paintColor : (selectedPart?.color ?? null)}
          canPick={mode === 'paint' || selectedPart !== null}
          onPick={(index) => {
            if (mode === 'paint') {
              session.getState().setPaintColor(index)
              return
            }
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { color: index }))
          }}
          onAddColor={(hex) => {
            const result = addExtraColor(model(), hex)
            if (!result) {
              showToast(COPY.editor.model.colorsFull)
              return
            }
            let next = result.model
            if (mode === 'paint') session.getState().setPaintColor(result.index)
            else if (selectedPart) next = updatePart(next, selectedPart.id, { color: result.index })
            commit(next)
          }}
          onRemoveColor={(index) => {
            const next = removeExtraColor(model(), index)
            if (!next) {
              showToast(COPY.editor.model.paint.removeColorBase)
              return
            }
            commit(next)
            if (session.getState().paintColor >= index) session.getState().setPaintColor(1)
            showToast(COPY.editor.model.paint.removedColor)
          }}
          onPalette={(id: PaletteId) => {
            const { customPalette: _customPalette, ...current } = model()
            commit({ ...current, paletteId: id })
          }}
          className="shrink-0"
        />
        <PropertiesPanel
          model={asset}
          part={selectedPart}
          onRename={(name) => {
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { name }))
          }}
          onMoveTo={(from: Vec3) => {
            if (!selectedPart) return
            const delta: Vec3 = [
              from[0] - selectedPart.from[0],
              from[1] - selectedPart.from[1],
              from[2] - selectedPart.from[2],
            ]
            commit(movePartBy(model(), selectedPart.id, delta))
          }}
          onResize={(size: Vec3) => {
            if (selectedPart) commit(setPartSize(model(), selectedPart.id, size))
          }}
          onRotate={(rotation: Vec3) => {
            if (selectedPart) commit(updatePart(model(), selectedPart.id, { rotation }))
          }}
          className="shrink-0"
        />
      </>
    ),
    [asset, selectedId, selectedPart, session, commit, model, showToast, mode, paintColor],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <EditorTopBar
        editor={editor}
        onBack={onBack}
        center={
          <ModeTabs
            mode={mode}
            onMode={(next) => {
              session.getState().setMode(next)
              if (next === 'paint') session.getState().setPlacingShape(null)
            }}
          />
        }
        actions={
          <Button
            variant="outline"
            onClick={download}
            aria-label={COPY.editor.model.download.glb}
            title={COPY.editor.model.download.glb}
            className="min-h-11 px-3 text-sm"
          >
            <Download aria-hidden="true" className="size-4" />
            <span className="hidden md:inline">{COPY.editor.model.download.glb}</span>
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        {mode === 'paint' ? (
          <PaintToolbox
            tool={paintTool}
            onTool={(next: PaintTool) => session.getState().setPaintTool(next)}
            size={brushSize}
            onSize={(next: BrushSize) => session.getState().setBrushSize(next)}
            mirror={mirrorPaint}
            onToggleMirror={() => session.getState().toggleMirrorPaint()}
            texelsPerUnit={asset.texelsPerUnit}
            onTexels={(value: TexelsPerUnit) => commit(setTexelsPerUnit(model(), value))}
            onApplyTexture={openApplyTexture}
          />
        ) : (
          <Toolbox
            tool={tool}
            onTool={(next: TransformTool) => {
              session.getState().setPlacingShape(null)
              session.getState().setTool(next)
            }}
            onAdd={startPlacement}
            placingShape={placingShape}
            onDuplicate={duplicate}
            onRemove={remove}
            hasSelection={selectedPart !== null}
            partsFull={asset.parts.length >= MOLDA_LIMITS.maxParts}
            mirrorX={asset.mirrorX}
            onToggleMirror={toggleMirror}
            snapHalf={asset.snap === 0.5}
            onToggleSnap={toggleSnap}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ViewportPane
            canvasRef={canvasRef}
            unsupported={unsupported}
            onView={onView}
            gridVisible={gridVisible}
            onToggleGrid={() => session.getState().toggleGrid()}
            status={status}
          />
          {!wide ? (
            <details className="max-h-72 shrink-0 overflow-y-auto border-t-2 border-mld-border bg-mld-surface">
              <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-bold text-mld-text">
                {COPY.editor.model.panelsToggle}
              </summary>
              <div className="flex flex-col gap-2 p-2">{panels}</div>
            </details>
          ) : null}
        </div>
        {wide ? (
          <aside className="flex w-68 shrink-0 flex-col gap-2 overflow-y-auto border-l-2 border-mld-border bg-mld-bg p-2">
            {panels}
          </aside>
        ) : null}
      </div>
      <ApplyTextureDialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApply={applyTexture}
      />
    </div>
  )
}
