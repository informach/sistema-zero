/**
 * Ponte entre o estado React do editor e o palco imperativo.
 *
 * Mantém num só lugar os gestos transacionais, a seleção transitória da malha
 * e a sincronização de estado para o WebGL. O `ModelEditor` continua dono das
 * ações de produto; este controller cuida apenas do protocolo do palco.
 */
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaModelAsset, ShapeId } from '../../../core/model'
import { moveMeshVertices } from '../../../model/meshOps'
import {
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
  meshEditId: string | null
  meshSelectMode: MeshSelectMode
  meshVertices: readonly string[]
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
    meshEditId,
    meshSelectMode,
    meshVertices,
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
      onDragStart: () => {
        closeColorGesture()
        endNudge()
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
        closeColorGesture()
        endNudge()
        gestureBefore.current = model()
      },
      onPaintEnd: (after) => {
        const before = gestureBefore.current ?? model()
        gestureBefore.current = null
        if (after !== before) editor.getState().commitGesture(before, after)
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
      onMeshDragStart: () => {
        closeColorGesture()
        endNudge()
        gestureBefore.current = model()
      },
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
        if (next !== model()) editor.getState().replace(next)
      },
      onMeshDragEnd: () => {
        const before = gestureBefore.current
        gestureBefore.current = null
        const after = model()
        const blocked = meshDragBlocked.current
        meshDragBlocked.current = false
        if (before && after !== before) {
          editor.getState().commitGesture(before, after)
          warnMeshIssues(before, after, session.getState().meshEditId)
        } else if (before && blocked) {
          showToast(COPY.editor.model.mesh.cannotMove)
        }
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
  useEffect(() => viewport?.setSnapState(snapState), [viewport, snapState])

  useEffect(() => {
    if (selectedId && !findPart(asset, selectedId)) session.getState().select(null)
    const alive = extraIds.filter((id) => findPart(asset, id))
    if (alive.length !== extraIds.length) session.getState().setExtraIds(alive)
  }, [asset, selectedId, extraIds, session])

  useEffect(() => {
    viewport?.setMeshEdit(
      meshEditId ? { partId: meshEditId, mode: meshSelectMode, vertices: meshVertices } : null,
    )
  }, [viewport, meshEditId, meshSelectMode, meshVertices])

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
