import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../../../core/copy'
import { base64ToBytes } from '../../../core/skinCodec'
import { triggerDownload } from '../../../export/download'
import { scenePresentationHtml } from '../../../export/scenePresentation'
import type { MoldaSceneDocument } from '../../../scene/document'
import type { EditorStore } from '../../../state/editorStore'
import type { SceneViewportPort } from '../../../viewport/sceneViewportTypes'
import { Button } from '../../ui/Button'

export function ScenePhotoExportPanel({
  editor,
  viewport,
  format,
  onClose,
}: {
  editor: EditorStore<MoldaSceneDocument>
  viewport: SceneViewportPort | null
  format: 'png' | 'presentation'
  onClose(): void
}) {
  const copy = COPY.scene.photoExport
  const owner = useRef<object | null>(null)
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState<{
    owner: object
    revision: number
    name: string
    file: string
    preview: string
  } | null>(null)
  const session = useMemo(() => ({ editor, viewport, format }), [editor, viewport, format])
  const cancel = useCallback(() => {
    owner.current = null
    setBusy(false)
    setReady(null)
  }, [])
  useEffect(() => {
    cancel()
    const off = session.editor.subscribe((state, previous) => {
      if (state.contentRevision !== previous.contentRevision) cancel()
    })
    const hidden = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      owner.current = null
      off()
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [session, cancel])
  async function prepare() {
    cancel()
    setError(null)
    if (!viewport?.captureImage || document.hidden) {
      setError(copy.unavailable)
      return
    }
    const token = {},
      source = editor.getState(),
      count = format === 'png' ? 1 : 24
    owner.current = token
    setBusy(true)
    setProgress(0)
    const frames: string[] = []
    try {
      for (let i = 0; i < count; i++) {
        // Let cancellation, storage notifications and paint settle between GPU captures.
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        if (owner.current !== token) return
        const image = viewport.captureImage(
          format === 'png' ? 1024 : 384,
          Math.PI / 5 + (i / count) * Math.PI * 2,
        )
        if (!image) throw new Error(copy.unavailable)
        frames.push(image)
        setProgress(i + 1)
      }
      if (owner.current !== token || source.contentRevision !== editor.getState().contentRevision)
        return
      const file = format === 'png' ? frames[0]! : scenePresentationHtml(source.asset.name, frames)
      setReady({
        owner: token,
        revision: source.contentRevision,
        name: source.asset.name,
        file,
        preview: frames[0]!,
      })
    } catch {
      if (owner.current === token) setError(copy.unavailable)
    } finally {
      if (owner.current === token) setBusy(false)
    }
  }
  function download() {
    if (
      !ready ||
      ready.owner !== owner.current ||
      ready.revision !== editor.getState().contentRevision
    )
      return
    try {
      const pixels =
        format === 'png' ? base64ToBytes(ready.file.slice('data:image/png;base64,'.length)) : null
      const file =
        format === 'png' && pixels
          ? new Blob([Uint8Array.from(pixels)], { type: 'image/png' })
          : new Blob([ready.file], { type: 'text/html;charset=utf-8' })
      if (format === 'png' && !pixels) throw new Error('Invalid image')
      if (triggerDownload(file, `${ready.name}.${format === 'png' ? 'png' : 'html'}`)) cancel()
      else setError(COPY.scene.glbExport.downloadFailed)
    } catch {
      setError(COPY.scene.glbExport.downloadFailed)
    }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">
        {format === 'png' ? copy.pngHint : copy.presentationHint}
      </p>
      <p className="text-sm text-mld-muted">{copy.original}</p>
      {busy && <p role="status">{copy.progress(progress, format === 'png' ? 1 : 24)}</p>}
      {error && (
        <p role="alert" className="text-sm text-mld-danger">
          {error}
        </p>
      )}
      {ready && (
        <img src={ready.preview} alt={copy.preview} className="mx-auto size-48 rounded-xl" />
      )}
      <div className="flex flex-wrap gap-2">
        {busy ? (
          <Button onClick={cancel}>{COPY.scene.glbExport.cancel}</Button>
        ) : ready ? (
          <Button variant="primary" onClick={download}>
            {COPY.scene.glbExport.downloadFile}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => void prepare()}>
            {COPY.scene.glbExport.prepareFile}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          {COPY.scene.glbExport.close}
        </Button>
      </div>
    </div>
  )
}
