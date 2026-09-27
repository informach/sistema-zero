/**
 * Ponte entre o estado React do editor e o palco imperativo.
 *
 * Mantém num só lugar os gestos transacionais, a seleção transitória da malha
 * e a sincronização de estado para o WebGL. O `ModelEditor` continua dono das
 * ações de produto; este controller cuida apenas do protocolo do palco.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { createGestureCoordinator, type GestureToken } from '../../../core/gesture'
import type { MoldaModelAsset, ShapeId } from '../../../core/model'
import { moveMeshVertices } from '../../../model/meshOps'
import {
  type MeshPick,
  mergeMeshSelection,
  pruneMeshSelection,
  selectionVertices,
} from '../../../model/meshSelection'
import { findPart, setPartBox, setPartBoxes, updatePart } from '../../../model/partOps'
import type { BrushSize } from '../../../paint/skinPaint'
import type { PaintTool } from '../../../paint/stroke'
import type { EditorStore } from '../../../state/editorStore'
import type {
  EditorMode,
  MeshSelectMode,
  SessionStore,
  TransformTool,
} from '../../../state/sessionStore'
import { prefersReducedMotion } from '../../../viewport/reducedMotion'
import type {
  AtlasInfo,
  DragPatch,
  ViewportCallbacks,
  ViewportSnapState,
} from '../../../viewport/types'
import { useViewport } from '../../../viewport/useViewport'

interface ViewportState {
  asset: MoldaModelAsset
  selectedId: string | null
  extraIds: readonly string[]
  mode: EditorMode
  tool: TransformTool
  placingShape: ShapeId | null
  paintTool: PaintTool
  paintColor: number
  brushSize: BrushSize
  mirrorPaint: boolean
  gridVisible: boolean
  edgesVisible: boolean
  isolateSelection: boolean
  meshEditId: string | null
  meshSelectMode: MeshSelectMode
  meshVertices: readonly string[]
  meshSelection: readonly MeshPick[]
  snapState: ViewportSnapState
}

interface UseModelViewportControllerOptions {
  editor: EditorStore
  session: SessionStore
  state: ViewportState
  model(): MoldaModelAsset
  gestureBefore: { current: MoldaModelAsset | null }
  closeColorGesture(): void
  endNudge(): void
  placeAtSurface: ViewportCallbacks['onPlace']
  openFace: ViewportCallbacks['onOpenFace']
  warnMeshIssues(before: MoldaModelAsset, after: MoldaModelAsset, partId: string | null): void
  showToast(message: string): void
  chooseSnapSource: ViewportCallbacks['onSnapSource']
  chooseSnapTarget: ViewportCallbacks['onSnapTarget']
}

function applyPatch(model: MoldaModelAsset, patch: DragPatch): MoldaModelAsset {
  let next = model
  if (patch.parts) next = setPartBoxes(next, patch.parts)
  if (patch.from && patch.to) next = setPartBox(next, patch.id, patch.from, patch.to)
  if (patch.rotation) next = updatePart(next, patch.id, { rotation: patch.rotation })
  return next
}

export function useModelViewportController({
  editor,
  session,
  state,
  model,
  gestureBefore,
  closeColorGesture,
  endNudge,
  placeAtSurface,
  openFace,
  warnMeshIssues,
  showToast,
  chooseSnapSource,
  chooseSnapTarget,
}: UseModelViewportControllerOptions) {
  const [atlas, setAtlas] = useState<AtlasInfo | null>(null)
  const atlasFullWarned = useRef(false)
  const meshDragBlocked = useRef(false)
  const token = useRef<GestureToken<MoldaModelAsset> | null>(null)
  const gestures = useMemo(
    () =>
      createGestureCoordinator({
        current: model,
        revision: () => editor.getState().contentRevision,
        preview: (next: MoldaModelAsset) => editor.getState().replace(next),
        cancel: (before) => editor.getState().cancelGesture(before),
        commit: (before, after) => editor.getState().commitGesture(before, after),
      }),
    [editor, model],
  )
  const beginGesture = () => {
    closeColorGesture()
    endNudge()
    token.current = gestures.begin()
    gestureBefore.current = token.current.before
  }
  const endGesture = (after: MoldaModelAsset) => {
    const current = token.current
    token.current = null
    gestureBefore.current = null
    return current ? gestures.commit(current, after) : false
  }
  const cancelDocumentGesture = useCallback(() => {
    const current = token.current
    token.current = null
    gestureBefore.current = null
    meshDragBlocked.current = false
    if (current) gestures.cancel(current)
  }, [gestures, gestureBefore])
  const {
    asset,
    selectedId,
    extraIds,
    mode,
    tool,
    placingShape,
    paintTool,
    paintColor,
    brushSize,
    mirrorPaint,
    gridVisible,
    edgesVisible,
    isolateSelection,
    meshEditId,
    meshSelectMode,
    meshVertices,
    meshSelection,
    snapState,
  } = state

  const viewportResult = useViewport(
    {
      onSelect: (id, additive) => {
        const current = session.getState()
        if (current.mode === 'paint') {
          current.select(id)
          return
        }
        current.pick(id, additive || current.partsAdditive)
      },
      onPlace: placeAtSurface,
      onDragStart: beginGesture,
      onDragMove: (patch) => {
        const current = model()
        const next = applyPatch(current, patch)
        if (next !== current && token.current) gestures.preview(token.current, next)
      },
      onDragEnd: (patch) => {
        let after = model()
        if (patch) after = applyPatch(after, patch)
        if (!endGesture(after)) viewportResult.viewport?.setModel(model())
      },
      onPaintStart: beginGesture,
      onPaintEnd: (after) => {
        // The imperative paint buffer may have outlived a palette edit/undo.
        if (!endGesture(after)) viewportResult.viewport?.setModel(model())
      },
      onPickColor: (index) => session.getState().setPaintColor(index),
      onOpenFace: openFace,
      onMeshPick: (pick, additive) => {
        const current = session.getState()
        const part = current.meshEditId ? findPart(model(), current.meshEditId) : undefined
        if (!part?.mesh || (pick && pick.kind !== current.meshSelectMode)) return
        current.setMeshSelection(
          mergeMeshSelection(current.meshSelection, pick, additive || current.meshAdditive),
        )
      },
      onMeshDragStart: beginGesture,
      onMeshDragMove: (delta) => {
        const before = gestureBefore.current
        const current = session.getState()
        if (!before || !current.meshEditId) return
        const mesh = findPart(before, current.meshEditId)?.mesh
        if (!mesh) return
        const next = moveMeshVertices(
          before,
          current.meshEditId,
          selectionVertices(mesh, current.meshSelection),
          delta,
          before.snap,
        )
        const wanted = delta.some(
          (value) => Math.abs(Math.round(value / before.snap) * before.snap) > 0,
        )
        if (next === before && wanted) meshDragBlocked.current = true
        if (next !== model() && token.current) gestures.preview(token.current, next)
      },
      onMeshDragEnd: () => {
        const before = gestureBefore.current
        const after = model()
        const blocked = meshDragBlocked.current
        meshDragBlocked.current = false
        const accepted = endGesture(after)
        if (!accepted) viewportResult.viewport?.setModel(model())
        if (accepted && before && after !== before) {
          warnMeshIssues(before, after, session.getState().meshEditId)
        } else if (accepted && before && blocked) {
          showToast(COPY.editor.model.mesh.cannotMove)
        }
      },
      onGestureCancel: () => {
        cancelDocumentGesture()
        viewportResult.viewport?.setModel(model())
      },
      onAtlas: (info) => {
        setAtlas(info)
        if (info.full && !atlasFullWarned.current) {
          atlasFullWarned.current = true
          showToast(COPY.editor.model.paint.atlasFull)
        }
        if (!info.full) atlasFullWarned.current = false
      },
      onSnapSource: chooseSnapSource,
      onSnapTarget: chooseSnapTarget,
    },
    { reducedMotion: prefersReducedMotion() },
  )

  const { viewport } = viewportResult

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || !token.current) return
      event.preventDefault()
      viewport?.cancelGesture()
      cancelDocumentGesture()
      viewport?.setModel(model())
    }
    const owner = viewportResult.canvasRef.current?.ownerDocument
    owner?.addEventListener('keydown', cancel, { capture: true })
    return () => owner?.removeEventListener('keydown', cancel, { capture: true })
  }, [viewport, viewportResult.canvasRef, cancelDocumentGesture, model])

  useEffect(() => viewport?.setModel(asset), [viewport, asset])
  useEffect(() => viewport?.setSelected(selectedId), [viewport, selectedId])
  useEffect(() => viewport?.setMode(mode), [viewport, mode])
  useEffect(() => viewport?.setTool(tool), [viewport, tool])
  useEffect(() => viewport?.setPlacementShape(placingShape), [viewport, placingShape])
  useEffect(
    () =>
      viewport?.setPaint({
        tool: paintTool,
        color: paintColor,
        size: brushSize,
        mirror: mirrorPaint,
      }),
    [viewport, paintTool, paintColor, brushSize, mirrorPaint],
  )
  useEffect(() => viewport?.setSnap(asset.snap), [viewport, asset.snap])
  useEffect(() => viewport?.setGridVisible(gridVisible), [viewport, gridVisible])
  useEffect(() => viewport?.setEdgesVisible(edgesVisible), [viewport, edgesVisible])
  useEffect(() => viewport?.setExtraSelected(extraIds), [viewport, extraIds])
  useEffect(() => {
    viewport?.setIsolation(isolateSelection && selectedId ? [selectedId, ...extraIds] : null)
  }, [viewport, isolateSelection, selectedId, extraIds])
  useEffect(() => viewport?.setSnapState(snapState), [viewport, snapState])

  useEffect(() => {
    if (selectedId && !findPart(asset, selectedId)) session.getState().select(null)
    const alive = extraIds.filter((id) => findPart(asset, id))
    if (alive.length !== extraIds.length) session.getState().setExtraIds(alive)
    if (
      session.getState().isolateSelection &&
      !asset.parts.some(
        (part) => !part.hidden && (part.id === selectedId || extraIds.includes(part.id)),
      )
    ) {
      session.getState().toggleIsolation()
    }
  }, [asset, selectedId, extraIds, session])

  useEffect(() => {
    viewport?.setMeshEdit(
      meshEditId
        ? {
            partId: meshEditId,
            mode: meshSelectMode,
            vertices: meshVertices,
            selection: meshSelection,
          }
        : null,
    )
  }, [viewport, meshEditId, meshSelectMode, meshVertices, meshSelection])

  useEffect(() => {
    const current = session.getState()
    if (!current.meshEditId) return
    const part = findPart(asset, current.meshEditId)
    if (!part?.mesh || part.locked || part.hidden) {
      current.exitMeshEdit()
      return
    }
    const pruned = pruneMeshSelection(part.mesh, current.meshSelection)
    if (pruned.length !== current.meshSelection.length) current.setMeshSelection(pruned)
  }, [asset, session])

  return { ...viewportResult, atlas }
}
