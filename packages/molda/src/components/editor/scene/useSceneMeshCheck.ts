import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import type { MoldaSceneDocument, SceneMeshGeometry } from '../../../scene/document'
import type { SceneComponentSession } from '../../../scene/meshComponents'
import {
  MESH_ISSUE_MODES,
  type MeshFixKind,
  type SceneMeshIssue,
} from '../../../scene/meshDiagnosis'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { createSceneMeshGesture } from '../../../state/sceneMeshGesture'
import { checkMeshInWorker } from '../../../workers/sceneMeshCheck'

export function useSceneMeshCheck(
  editor: EditorStore<MoldaSceneDocument>,
  setSession: (session: SceneComponentSession | null) => void,
) {
  const [report, setReport] = useState<{
    nodeId: string
    mesh: SceneMeshGeometry
    issues: SceneMeshIssue[]
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<SceneMeshIssue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const before = useRef<SceneComponentSession | null>(null)
  const publishing = useRef(false)
  const pending = useRef<{ controller: AbortController; revision: number } | null>(null)
  const gesture = useMemo(
    () =>
      createSceneMeshGesture(editor, (error) =>
        setError(
          error instanceof SceneValidationError ? error.message : COPY.scene.meshCheckChanged,
        ),
      ),
    [editor],
  )
  const cancel = useCallback(() => {
    pending.current?.controller.abort()
    pending.current = null
    const restore = before.current
    before.current = null
    gesture.cancel()
    if (restore) setSession(restore)
    setBusy(false)
    setPreview(null)
  }, [gesture, setSession])
  useEffect(() => {
    const unsubscribe = editor.subscribe((state, previous) => {
      if (state.contentRevision === previous.contentRevision) return
      if (
        (pending.current && state.contentRevision !== pending.current.revision) ||
        (before.current && !publishing.current)
      )
        cancel()
      if (!before.current)
        setReport((current) => {
          if (!current) return null
          const node = state.asset.nodes.find((n) => n.id === current.nodeId)
          return node?.kind === 'mesh' &&
            state.asset.geometries.find((g) => g.id === node.geometryId) === current.mesh
            ? current
            : null
        })
    })
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      unsubscribe()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      pending.current?.controller.abort()
      pending.current = null
      gesture.cancel()
    }
  }, [editor, gesture, cancel])
  async function request(
    session: SceneComponentSession,
    mesh: SceneMeshGeometry,
    fix?: MeshFixKind,
  ) {
    const issue = fix
      ? report?.mesh === mesh && report.nodeId === session.nodeId
        ? report.issues.find((entry) => entry.kind === fix)
        : null
      : null
    if (fix && !issue) return
    cancel()
    setError(null)
    if (fix) {
      if (!gesture.begin(session.nodeId, mesh)) return
      before.current = session
      setPreview(issue ?? null)
    } else setReport(null)
    const state = editor.getState()
    const controller = new AbortController()
    const revision = state.contentRevision
    pending.current = { controller, revision }
    setBusy(true)
    try {
      const base = { documentId: state.asset.id, revision, mesh }
      const result = await checkMeshInWorker(
        fix ? { ...base, action: 'repair', fix } : { ...base, action: 'inspect' },
        controller.signal,
      )
      if (controller.signal.aborted || editor.getState().contentRevision !== revision) return
      pending.current = null
      setBusy(false)
      if (result.kind === 'report')
        setReport({ nodeId: session.nodeId, mesh, issues: result.issues })
      else {
        publishing.current = true
        try {
          if (gesture.preview(() => result.mesh)) {
            const node = editor.getState().asset.nodes.find((n) => n.id === session.nodeId)
            if (node?.kind === 'mesh' && issue)
              setSession({
                nodeId: node.id,
                geometryId: node.geometryId,
                mode: MESH_ISSUE_MODES[issue.kind],
                ids: issue.ids,
              })
          } else cancel()
        } finally {
          publishing.current = false
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return
      cancel()
      setError(error instanceof SceneValidationError ? error.message : COPY.scene.meshCheckFailed)
    }
  }
  return {
    report,
    busy,
    preview,
    error,
    cancel,
    clear: () => {
      cancel()
      setReport(null)
      setError(null)
    },
    inspect: (session: SceneComponentSession, mesh: SceneMeshGeometry) => request(session, mesh),
    repair: (session: SceneComponentSession, mesh: SceneMeshGeometry, kind: MeshFixKind) =>
      request(session, mesh, kind),
    confirm: () => {
      if (busy || !preview) return
      before.current = null
      if (!gesture.end(true)) setError(COPY.scene.meshCheckChanged)
      setPreview(null)
      setReport(null)
    },
  }
}
