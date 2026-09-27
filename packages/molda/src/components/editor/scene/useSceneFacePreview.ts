import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import { prepareMeshExtrusion } from '../../../scene/meshExtrude'
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
  return {
    tool,
    error,
    busy,
    begin(next: SceneFacePreviewTool, selection: SceneFaceSession, expected: SceneMeshGeometry) {
      cancel()
      setError(null)
      if (!gesture.begin(selection.nodeId, expected)) return
      const owner: SurfaceOwner = {
        selection: { ...selection, faceIds: [...selection.faceIds] },
        tool: next,
        surface: null,
        worker: null,
      }
      active.current = owner
      setTool(next)
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
            onResult: (mesh, amount) => {
              if (active.current !== owner) return
              if (!gesture.preview((source) => (amount === 0 ? source : mesh))) {
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
    update(amount: number) {
      const owner = active.current
      if (!owner) return false
      setError(null)
      if (owner.worker) return owner.worker.update(amount)
      if (
        !gesture.preview((mesh, allocate) => {
          if (owner.tool === 'inset')
            return insetMeshFaces(mesh, owner.selection.faceIds, amount, allocate)
          if (!owner.surface) throw new Error('Missing surface snapshot')
          return owner.surface.apply(amount, allocate)
        })
      ) {
        close(owner)
        return false
      }
      if (active.current !== owner) return false
      const node = editor.getState().asset.nodes.find((n) => n.id === owner.selection.nodeId)
      if (node?.kind === 'mesh') setSession({ ...owner.selection, geometryId: node.geometryId })
      return true
    },
    confirm() {
      const owner = active.current
      if (!owner || owner.worker?.pending) return
      active.current = null
      dispose(owner)
      setBusy(false)
      setTool(null)
      if (!gesture.end(true) && !active.current) setError(COPY.scene.previewChanged)
    },
    cancel,
  }
}
