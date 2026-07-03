/**
 * Componente raiz do Pinta — uncontrolled, navegação por ESTADO (sem router):
 * galeria ⇄ editor. O host só passa o `adapter` (tema/capabilities) e chama
 * `setPintaStorageNamespace(viewerId)` ANTES de montar.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PintaHostAdapter } from '../core/types'
import { createGalleryStore } from '../state/galleryStore'
import { type PintaAppContextValue, PintaAppProvider } from './appContext'
import { EditorScreen } from './editor/EditorScreen'
import { GalleryScreen } from './gallery/GalleryScreen'
import { PintaThemeProvider } from './PintaThemeScope'
import { ToastProvider } from './ui/Toast'

type PintaView = { screen: 'gallery' } | { screen: 'editor'; assetId: string }

const EMPTY_ADAPTER: PintaHostAdapter = {}

export function PintaApp({ adapter }: { adapter?: PintaHostAdapter }): JSX.Element {
  const [gallery] = useState(createGalleryStore)
  const [view, setView] = useState<PintaView>({ screen: 'gallery' })
  const resolvedAdapter = adapter ?? EMPTY_ADAPTER
  const theme = resolvedAdapter.theme ?? 'light'

  useEffect(() => {
    void gallery.getState().load()
  }, [gallery])

  // Intent do Pensa (missão de arte) vive num ref: consumido 1x pela galeria.
  const initialIntentRef = useRef(resolvedAdapter.initialIntent ?? null)

  const context = useMemo<PintaAppContextValue>(
    () => ({
      adapter: resolvedAdapter,
      gallery,
      openAsset: (id) => setView({ screen: 'editor', assetId: id }),
      closeEditor: () => setView({ screen: 'gallery' }),
      takeInitialIntent: () => {
        const intent = initialIntentRef.current
        initialIntentRef.current = null
        return intent
      },
    }),
    [resolvedAdapter, gallery],
  )

  return (
    <div
      data-pinta-theme={theme}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-pin-bg text-pin-text"
    >
      <PintaThemeProvider value={theme}>
        <PintaAppProvider value={context}>
          <ToastProvider>
            {view.screen === 'gallery' ? (
              <GalleryScreen />
            ) : (
              // key por asset: trocar de desenho recria o editor (stores novas).
              <EditorScreen key={view.assetId} assetId={view.assetId} />
            )}
          </ToastProvider>
        </PintaAppProvider>
      </PintaThemeProvider>
    </div>
  )
}
