import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { triggerDownload } from '../../../export/download'
import { HDR_MIME } from '../../../export/skyHdr'
import type { EditorStore } from '../../../state/editorStore'
import { exportSkyHdrInWorker } from '../../../workers/skyExport'
import type { SkyExportProgress } from '../../../workers/skyExportProtocol'
import { useToast } from '../../ui/Toast'

/** A download belongs to exactly one document revision, not the latest render closure. */
export function useSkyDownload(editor: EditorStore) {
  const { showToast } = useToast()
  const active = useRef<AbortController | null>(null)
  const [progress, setProgress] = useState<SkyExportProgress | null>(null)
  const copy = COPY.editor.sky.download

  useEffect(
    () => () => {
      active.current?.abort()
      active.current = null
    },
    [],
  )

  const cancel = (message: string = copy.cancelled): void => {
    const task = active.current
    if (!task) return
    active.current = null
    task.abort()
    setProgress(null)
    showToast(message)
  }

  const start = (): void => {
    if (active.current) return
    const { asset, contentRevision } = editor.getState()
    if (asset.kind !== 'sky') return
    const controller = new AbortController()
    active.current = controller
    setProgress('rendering')
    const unsubscribe = editor.subscribe((state) => {
      if (
        active.current === controller &&
        (state.asset.id !== asset.id || state.contentRevision !== contentRevision)
      )
        cancel(copy.changed)
    })
    void (async () => {
      try {
        const result = await exportSkyHdrInWorker(asset, {
          signal: controller.signal,
          revision: contentRevision,
          onProgress: (phase) => {
            if (active.current === controller) setProgress(phase)
          },
        })
        if (active.current !== controller) return
        const current = editor.getState()
        if (current.asset.id !== asset.id || current.contentRevision !== contentRevision) {
          cancel(copy.changed)
          return
        }
        if (!result.ok) {
          showToast(copy.tooBig)
          return
        }
        // Own ArrayBuffer for Blob's DOM contract; document buffers are never detached.
        const blob = new Blob([Uint8Array.from(result.bytes).buffer], { type: HDR_MIME })
        showToast(triggerDownload(blob, `${asset.name}.hdr`, HDR_MIME) ? copy.ready : copy.failed)
      } catch {
        // Explicit cancellation/unmount already handled; real worker failures remain visible.
        if (active.current === controller) showToast(copy.failed)
      } finally {
        unsubscribe()
        if (active.current === controller) {
          active.current = null
          setProgress(null)
        }
      }
    })()
  }

  return { progress, start, cancel: () => cancel() }
}
