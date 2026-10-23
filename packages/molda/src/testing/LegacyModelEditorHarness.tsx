import { useEffect, useState } from 'react'
import { MoldaAppProvider } from '../components/appContext'
import { EditorScreen } from '../components/editor/EditorScreen'
import { ToastProvider } from '../components/ui/Toast'
import { createGallerySceneSource } from '../state/gallerySceneSource'
import { createGalleryStore } from '../state/galleryStore'
import { getMoldaGenerationStore, type MoldaPersistence } from '../state/persistence'

/**
 * Testa os componentes internos do formato antigo diretamente. A rota pública de
 * modelos é sempre SceneWorkshopHost; este suporte de teste não é exportado pelo app.
 */
export function LegacyModelEditorHarness({
  persistence,
  assetId,
}: {
  persistence: MoldaPersistence
  assetId: string
}) {
  const [gallery] = useState(() => createGalleryStore(persistence))
  const [scene] = useState(() => createGallerySceneSource(getMoldaGenerationStore()))
  const [active, setActive] = useState(true)
  useEffect(() => {
    void gallery.getState().load()
    return gallery.getState().attachPersistence()
  }, [gallery])
  return (
    <div data-molda-theme="light">
      <MoldaAppProvider value={{ adapter: {}, persistence, gallery, scene }}>
        <ToastProvider>
          {active && <EditorScreen assetId={assetId} onBack={() => setActive(false)} />}
        </ToastProvider>
      </MoldaAppProvider>
    </div>
  )
}
