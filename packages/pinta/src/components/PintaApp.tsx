/**
 * Componente raiz do Pinta — uncontrolled, navegação por ESTADO (sem router):
 * galeria ⇄ editor. O host só passa o `adapter` (tema/capabilities) e chama
 * `setPintaStorageNamespace(viewerId)` ANTES de montar.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COPY } from '../core/copy'
import type { PintaHostAdapter } from '../core/types'
import { createGalleryStore } from '../state/galleryStore'
import {
  type PintaAppContextValue,
  PintaAppProvider,
  usePintaApp,
  usePintaGallery,
} from './appContext'
import { EditorScreen } from './editor/EditorScreen'
import { GalleryScreen } from './gallery/GalleryScreen'
import { PintaThemeProvider } from './PintaThemeScope'
import { ToastProvider, useToast } from './ui/Toast'

type PintaView = { screen: 'gallery' } | { screen: 'editor'; assetId: string }

const EMPTY_ADAPTER: PintaHostAdapter = {}

/**
 * Abre o desenho pedido pelo host (botão "Editar" do Estúdio → `/pinta?desenho=`).
 *
 * ⚠️ Só DEPOIS que a galeria carrega: o `EditorScreen` resolve o asset num
 * inicializador de estado e volta para a galeria quando não acha — abrir cedo
 * cairia na galeria e o link pareceria quebrado. Vive aqui dentro (e não no
 * corpo do PintaApp) para poder avisar pelo toast quando o desenho já foi
 * apagado.
 */
function InitialAssetOpener(): null {
  const { gallery, openAsset, takeInitialAssetId } = usePintaApp()
  const { showToast } = useToast()
  const loaded = usePintaGallery((state) => state.loaded)

  useEffect(() => {
    if (!loaded) return
    const id = takeInitialAssetId()
    if (!id) return
    if (gallery.getState().assets.some((a) => a.id === id)) openAsset(id)
    else showToast(COPY.gallery.drawingGone)
  }, [loaded, gallery, openAsset, takeInitialAssetId, showToast])

  return null
}

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
  // "Abrir este desenho" (botão Editar do Estúdio): também 1x, e só depois que a
  // galeria carrega — ver o InitialAssetOpener.
  const initialAssetIdRef = useRef(resolvedAdapter.initialAssetId ?? null)

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
      takeInitialAssetId: () => {
        const id = initialAssetIdRef.current
        initialAssetIdRef.current = null
        return id
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
            <InitialAssetOpener />
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
