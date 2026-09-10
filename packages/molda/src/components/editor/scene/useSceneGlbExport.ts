import { useCallback, useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { triggerDownload } from '../../../export/download'
import type { MoldaSceneDocument } from '../../../scene/document'
import { SceneValidationError } from '../../../scene/validation'
import type { EditorStore } from '../../../state/editorStore'
import { prepareSceneGlbInWorker } from '../../../workers/sceneGlb'
import type {
  SceneGlbExportResult,
  SceneGlbProgress,
  SceneGlbToken,
} from '../../../workers/sceneGlbProtocol'
import type { TaskWorker } from '../../../workers/workerTask'

interface ExportOwner extends SceneGlbToken {
  editor: EditorStore<MoldaSceneDocument>
  controller: AbortController
  name: string
}
type ExportState =
  | { status: 'idle'; message?: string }
  | { status: 'error'; message: string }
  | { status: 'downloaded' }
  | { status: 'busy'; owner: ExportOwner; progress: SceneGlbProgress }
  | {
      status: 'ready'
      owner: ExportOwner
      result: SceneGlbExportResult
      accepted: boolean
      error?: string
    }
type PendingExport = Extract<ExportState, { status: 'busy' | 'ready' }>

/** Session-only bytes. No history, persistence writes or automatic download. */
export function useSceneGlbExport(
  editor: EditorStore<MoldaSceneDocument>,
  createWorker?: () => TaskWorker,
) {
  const pending = useRef<PendingExport | null>(null)
  const activeEditor = useRef<EditorStore<MoldaSceneDocument> | null>(null)
  const [state, setState] = useState<ExportState>({ status: 'idle' })
  const copy = COPY.scene.glbExport
  const cancel = useCallback((message?: string) => {
    const previous = pending.current
    pending.current = null
    previous?.owner.controller.abort()
    setState({ status: 'idle', message })
  }, [])

  useEffect(() => {
    activeEditor.current = editor
    setState({ status: 'idle' })
    const unsubscribe = editor.subscribe((current) => {
      const owner = pending.current?.owner
      // Thumbnails and save status do not change GLB content or revoke consent.
      if (
        owner &&
        (owner.revision !== current.contentRevision || owner.documentId !== current.asset.id)
      )
        cancel(copy.changed)
    })
    const interrupt = () => {
      if (pending.current) cancel(copy.interrupted)
    }
    const hidden = () => {
      if (document.hidden) interrupt()
    }
    window.addEventListener('blur', interrupt)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      activeEditor.current = null
      unsubscribe()
      window.removeEventListener('blur', interrupt)
      document.removeEventListener('visibilitychange', hidden)
      const previous = pending.current
      pending.current = null
      previous?.owner.controller.abort()
    }
  }, [editor, cancel, copy.changed, copy.interrupted])

  async function prepare() {
    if (activeEditor.current !== editor) return
    cancel()
    if (document.hidden) {
      cancel(copy.interrupted)
      return
    }
    const source = editor.getState()
    const owner: ExportOwner = {
      editor,
      documentId: source.asset.id,
      revision: source.contentRevision,
      name: source.asset.name,
      controller: new AbortController(),
    }
    const initial: PendingExport = { status: 'busy', owner, progress: 'validating' }
    pending.current = initial
    setState(initial)
    try {
      const result = await prepareSceneGlbInWorker(
        { document: source.asset, documentId: owner.documentId, revision: owner.revision },
        {
          signal: owner.controller.signal,
          createWorker,
          onProgress: (progress) => {
            if (pending.current?.owner !== owner) return
            const next: PendingExport = { status: 'busy', owner, progress }
            pending.current = next
            setState(next)
          },
        },
      )
      if (pending.current?.owner !== owner) return
      const ready: PendingExport = { status: 'ready', owner, result, accepted: false }
      pending.current = ready
      setState(ready)
    } catch (error) {
      if (pending.current?.owner !== owner) return
      pending.current = null
      setState({
        status: 'error',
        message: error instanceof SceneValidationError ? error.message : copy.failed,
      })
    }
  }
  function accept(accepted: boolean) {
    if (state.status !== 'ready' || pending.current !== state) return
    const next: PendingExport = { ...state, accepted }
    pending.current = next
    setState(next)
  }
  function download() {
    // Captured callbacks cannot approve another result, reuse old consent or survive closing.
    if (state.status !== 'ready' || pending.current !== state) return
    const { owner, result } = state
    const current = editor.getState()
    if (
      activeEditor.current !== owner.editor ||
      owner.revision !== current.contentRevision ||
      owner.documentId !== current.asset.id
    ) {
      cancel(copy.changed)
      return
    }
    if (result.issues.length && !state.accepted) return
    try {
      if (
        !triggerDownload(
          new Blob([result.bytes.buffer], { type: 'model/gltf-binary' }),
          `${owner.name}.glb`,
        )
      )
        throw new Error('Download unavailable')
      pending.current = null
      setState({ status: 'downloaded' })
    } catch {
      if (pending.current !== state) return
      const next: PendingExport = { ...state, error: copy.downloadFailed }
      pending.current = next
      setState(next)
    }
  }
  return { state, prepare, accept, download, cancel: () => cancel(copy.cancelled) }
}
