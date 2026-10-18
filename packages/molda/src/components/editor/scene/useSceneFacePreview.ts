import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import { dot } from '../../../model/vec'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import { indexSceneDocument } from '../../../scene/documentIndex'
import { type AffineMatrix, affineInverse, affineMultiply } from '../../../scene/matrix'
import { prepareMeshExtrusion } from '../../../scene/meshExtrude'
import { meshFaceFrame } from '../../../scene/meshFaceFrame'
import type { SceneFaceSelection } from '../../../scene/meshFaces'
import { insetMeshFaces } from '../../../scene/meshInset'
import { prepareMeshThickness } from '../../../scene/meshThickness'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneMeshGesture } from '../../../state/sceneMeshGesture'
import type { SceneSurfaceTool } from '../../../workers/sceneSurfaceProtocol'
import {
  createSceneSurfaceSession,
  SURFACE_WORKER_FACE_THRESHOLD,
} from '../../../workers/sceneSurfaceSession'

export type SceneFacePreviewTool = SceneSurfaceTool
export type SceneFaceSession = SceneFaceSelection & { geometryId: string }
interface SurfaceOwner {
  selection: SceneFaceSession
  tool: SceneFacePreviewTool
  surface: ReturnType<typeof prepareMeshExtrusion> | null
  worker: ReturnType<typeof createSceneSurfaceSession> | null
  mesh: SceneMeshGeometry
  world: Readonly<AffineMatrix>
  amount: number
  offset?: Vec3
  drag: { amount: number; offset?: Vec3; base: Vec3; normal: Vec3 } | null
}
function dispose(owner: SurfaceOwner) {
  owner.worker?.dispose()
  owner.surface?.dispose()
}

export function useSceneFacePreview(
  editor: EditorStore<MoldaSceneDocument>,
  setSession: (session: SceneFaceSession | null) => void,
) {
  const [tool, setTool] = useState<SceneFacePreviewTool | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [amount, setAmount] = useState(0),
    [dragging, setDragging] = useState(false),
    active = useRef<SurfaceOwner | null>(null)
  const gesture = useMemo(
    () =>
      createSceneMeshGesture(editor, (error) => {
        setError(error instanceof SceneValidationError ? error.message : COPY.scene.commandFailed)
      }),
    [editor],
  )
  const close = useCallback(
    (owner: SurfaceOwner, changed = false) => {
      if (active.current !== owner) return
      active.current = null
      dispose(owner)
      gesture.cancel()
      // Cancellation may publish a restored document and trigger a new owner in a subscriber.
      if (active.current) return
      setBusy(false)
      setTool(null)
      setAmount(0)
      setDragging(false)
      if (changed) setError(COPY.scene.previewChanged)
      setSession(owner.selection)
    },
    [gesture, setSession],
  )
  const cancel = useCallback(() => {
    const owner = active.current
    if (owner) close(owner)
  }, [close])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state, previous) => {
      const owner = active.current
      if (owner && state.contentRevision !== previous.contentRevision && !gesture.isCurrent())
        close(owner, true)
    })
    const visibility = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', visibility)
      const owner = active.current
      active.current = null
      if (owner) dispose(owner)
      gesture.cancel()
    }
  }, [editor, gesture, close, cancel])
  function update(nextAmount: number, offset?: Vec3) {
    const owner = active.current
    if (!owner) return false
    setError(null)
    if (owner.worker) {
      const accepted = owner.worker.update(nextAmount, offset)
      if (accepted) {
        owner.amount = nextAmount
        owner.offset = offset
        setAmount(nextAmount)
      }
      return accepted
    }
    if (
      !gesture.preview((mesh, allocate) => {
        if (owner.tool === 'inset')
          return insetMeshFaces(mesh, owner.selection.faceIds, nextAmount, allocate)
        if (!owner.surface) throw new Error('Missing surface snapshot')
        return owner.surface.apply(nextAmount, allocate, offset)
      })
    ) {
      close(owner)
      return false
    }
    if (active.current !== owner) return false
    owner.amount = nextAmount
    owner.offset = offset
    setAmount(nextAmount)
    const node = editor.getState().asset.nodes.find((n) => n.id === owner.selection.nodeId)
    if (node?.kind === 'mesh') setSession({ ...owner.selection, geometryId: node.geometryId })
    return true
  }
  return {
    tool,
    error,
    busy,
    amount,
    begin(next: SceneFacePreviewTool, selection: SceneFaceSession, expected: SceneMeshGeometry) {
      cancel()
      setError(null)
      if (!gesture.begin(selection.nodeId, expected)) return
      const owner: SurfaceOwner = {
        selection: { ...selection, faceIds: [...selection.faceIds] },
        tool: next,
        surface: null,
        worker: null,
        mesh: expected,
        world: indexSceneDocument(editor.getState().content).scene.worldMatrices.get(
          selection.nodeId,
        )!,
        amount: 0,
        drag: null,
      }
      active.current = owner
      setTool(next)
      setAmount(0)
      if (
        next === 'subdivide' ||
        Object.keys(expected.faces).length > SURFACE_WORKER_FACE_THRESHOLD
      ) {
        try {
          const source = editor.getState(),
            chosenFaces = new Set(selection.faceIds)
          owner.worker = createSceneSurfaceSession({
            source: {
              documentId: source.asset.id,
              revision: source.contentRevision,
              mesh: expected,
              faceIds: selection.faceIds,
              tool: next,
            },
            onBusy: (busy) => {
              if (active.current === owner) setBusy(busy)
            },
            onResult: (mesh, amount, offset) => {
              if (active.current !== owner) return
              if (
                !gesture.preview((source) =>
                  amount === 0 && !offset?.some((n) => n !== 0) ? source : mesh,
                )
              ) {
                close(owner)
                return
              }
              if (active.current !== owner) return
              const node = editor.getState().asset.nodes.find((n) => n.id === selection.nodeId)
              if (node?.kind === 'mesh')
                setSession({
                  ...selection,
                  geometryId: node.geometryId,
                  faceIds:
                    next === 'subdivide'
                      ? Object.keys(mesh.faces).filter(
                          (id) => chosenFaces.has(id) || !Object.hasOwn(expected.faces, id),
                        )
                      : selection.faceIds,
                })
            },
            onError: (error) => {
              if (active.current !== owner) return
              setError(
                error instanceof SceneValidationError
                  ? error.message
                  : COPY.scene.surfaceWorkerFailed,
              )
              close(owner)
            },
          })
        } catch {
          if (active.current === owner) {
            setError(COPY.scene.surfaceWorkerFailed)
            close(owner)
          }
        }
      } else if (next === 'extrude')
        owner.surface = prepareMeshExtrusion(expected, selection.faceIds)
      else if (next === 'thickness')
        owner.surface = prepareMeshThickness(expected, selection.faceIds)
    },
    update: (amount: number) => update(amount),
    transform: {
      dragging,
      error,
      begin() {
        const owner = active.current
        if (owner?.tool !== 'extrude') return false
        try {
          const normal = meshFaceFrame(owner.mesh, owner.selection.faceIds[0]!).normal
          owner.drag = {
            amount: owner.amount,
            offset: owner.offset,
            normal,
            base: owner.offset ?? [
              normal[0] * owner.amount,
              normal[1] * owner.amount,
              normal[2] * owner.amount,
            ],
          }
          setDragging(true)
          return true
        } catch (error) {
          setError(error instanceof SceneValidationError ? error.message : COPY.scene.commandFailed)
          return false
        }
      },
      preview(delta: AffineMatrix) {
        const owner = active.current
        if (!owner?.drag) return false
        const inverse = affineInverse(owner.world)
        if (!inverse) {
          setError('A escala da peça precisa ser diferente de zero para puxar com as alças.')
          return false
        }
        const local = affineMultiply(affineMultiply(inverse, delta), owner.world)
        const offset: Vec3 = [
          owner.drag.base[0] + local[12],
          owner.drag.base[1] + local[13],
          owner.drag.base[2] + local[14],
        ]
        const signed = dot(offset, owner.drag.normal) < 0 ? -1 : 1
        return update(signed * Math.hypot(...offset), offset)
      },
      end(accepted: boolean) {
        const owner = active.current
        const drag = owner?.drag
        if (!owner || !drag) return
        owner.drag = null
        setDragging(false)
        if (!accepted) update(drag.amount, drag.offset)
      },
      cancel() {
        const owner = active.current
        const drag = owner?.drag
        if (!owner || !drag) return
        owner.drag = null
        setDragging(false)
        update(drag.amount, drag.offset)
      },
    },
    confirm() {
      const owner = active.current
      if (!owner || owner.drag || owner.worker?.pending) return
      active.current = null
      dispose(owner)
      setBusy(false)
      setTool(null)
      setDragging(false)
      if (!gesture.end(true) && !active.current) setError(COPY.scene.previewChanged)
    },
    cancel,
  }
}
