import { useLayoutEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { structuredBytes } from '../../core/structuredBytes'
import { createSceneProject } from '../../scene/createProject'
import { sceneToJson } from '../../scene/documentJson'
import { createDocumentEditorStore } from '../../state/editorStore'
import type { SceneViewportFactory } from '../../viewport/sceneViewportTypes'
import { useMoldaApp } from '../appContext'
import { SceneImportPanel } from '../editor/scene/SceneImportPanel'
import { useMoldaToolGate } from '../toolAccess'
import { Button } from '../ui/Button'

/** The draft never writes to storage. Only reviewed imports enter the gallery's mutation queue. */
export function GalleryModelImport({
  onClose,
  onOpen,
  onBusyChange,
  viewportFactory,
}: {
  onClose(): void
  onOpen(id: string): void
  onBusyChange(busy: boolean): void
  viewportFactory?: SceneViewportFactory
}) {
  const { gallery } = useMoldaApp()
  const gate = useMoldaToolGate('files.import')
  const [editor] = useState(() =>
    createDocumentEditorStore({
      asset: createSceneProject({ kind: 'empty', name: COPY.gallery.importedModelName }),
      sizeOf: structuredBytes,
      persistence: { save: async () => {} },
    }),
  )
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saving = useRef(false)
  const mounted = useRef(false)
  const lifetime = useRef<AbortController | null>(null)
  useLayoutEffect(() => {
    const controller = new AbortController()
    lifetime.current = controller
    mounted.current = true
    return () => {
      controller.abort()
      mounted.current = false
      editor.getState().dispose()
    }
  }, [editor])

  async function save() {
    const signal = lifetime.current?.signal
    if (!signal || signal.aborted || saving.current || !gate.canUse()) return
    saving.current = true
    onBusyChange(true)
    setConfirmed(true)
    setBusy(true)
    setError(null)
    try {
      const document = editor.getState().saveSnapshot()
      const result = await gallery
        .getState()
        .importProjects([{ name: document.name, json: JSON.stringify(sceneToJson(document)) }], {
          signal,
        })
      if (!mounted.current || !gate.canUse()) return
      const id = result.ids?.[0]
      if (id) onOpen(id)
      else
        setError(
          result.reason === 'storage-budget' ? COPY.gallery.storageBudget : COPY.toast.saveFailed,
        )
    } catch {
      if (mounted.current) setError(COPY.toast.saveFailed)
    } finally {
      saving.current = false
      onBusyChange(false)
      if (mounted.current) setBusy(false)
    }
  }

  if (confirmed)
    return (
      <div className="space-y-4" aria-busy={busy}>
        {busy ? (
          <p role="status">{COPY.gallery.importModelSaving}</p>
        ) : (
          <>
            <p role="alert" className="text-sm text-mld-danger">
              {error}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void save()}>
                {COPY.gallery.retry}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                {COPY.gallery.cancel}
              </Button>
            </div>
          </>
        )}
      </div>
    )
  return (
    <SceneImportPanel
      editor={editor}
      onClose={onClose}
      onImported={() => void save()}
      canAdopt={gate.canUse}
      destination="gallery"
      viewportFactory={viewportFactory}
    />
  )
}
