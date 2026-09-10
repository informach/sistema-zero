/**
 * `<MoldaApp>`: o componente embarcável. Uncontrolled: galeria ⇄ editor por
 * estado interno; o host só entrega o adapter (tema, Estúdio, deep link) e,
 * se quiser, a persistência (a nuvem do kids embrulha a local).
 *
 * `data-molda-theme` no root escopa TODOS os tokens `mld-*` (o CSS nunca toca
 * o `<html>` do host).
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { unlistedReadIssues } from '../core/assetSummary'
import { COPY } from '../core/copy'
import { createGallerySceneSource } from '../state/gallerySceneSource'
import { createGalleryStore } from '../state/galleryStore'
import {
  getDefaultMoldaPersistence,
  getMoldaGenerationStore,
  type MoldaPersistence,
} from '../state/persistence'
import { MoldaAppProvider, type MoldaHostAdapter, useGallery, useMoldaApp } from './appContext'
import { DeferredModule } from './editor/DeferredEditor'
import { EditorScreen } from './editor/EditorScreen'

import { GalleryScreen } from './gallery/GalleryScreen'
import { ToastProvider, useToast } from './ui/Toast'

export interface MoldaAppProps {
  adapter?: MoldaHostAdapter
  /** Default: a persistência local do namespace corrente. */
  persistence?: MoldaPersistence
  className?: string
}

type Screen =
  | { type: 'gallery' }
  /** A geração decide o editor, não o `kind`: o documento seguinte é sempre um modelo. */
  | { type: 'editor'; assetId: string; generation: 1 | 2 }

const EMPTY_ADAPTER: MoldaHostAdapter = {}

/**
 * A oficina da geração seguinte é o pedaço mais pesado do pacote. Estática, ela entrava
 * no bundle inicial e a criança baixava a oficina inteira só para ver a galeria; carregada
 * sob demanda, ela só chega quando uma criação abre.
 */
const loadSceneWorkshop = () =>
  import('./editor/scene/SceneWorkshopHost').then((module) => module.SceneWorkshopHost)

/** Abre a criação do deep link assim que a galeria carregar (e a nuvem assentar). */
function InitialAssetOpener({
  id,
  onOpen,
}: {
  id: string | undefined
  onOpen: (id: string) => void
}): null {
  const ready = useGallery((state) => state.loaded && !state.syncing)
  const exists = useGallery((state) => id !== undefined && state.assets.some((a) => a.id === id))
  const { persistence } = useMoldaApp()
  const listed = useGallery((state) => state.assets)
  const unreadable = unlistedReadIssues(persistence.getReadIssues?.() ?? [], listed).some(
    (issue) => issue.id === id,
  )
  const { showToast } = useToast()
  const done = useRef(false)
  useEffect(() => {
    if (!id || done.current || !ready) return
    done.current = true
    if (exists && !unreadable) onOpen(id)
    // Criação que não está neste aparelho (nem desceu da nuvem): a galeria abre e AVISA,
    // em vez de ficar muda (o "Editar" do Estúdio chega por aqui).
    else showToast(unreadable ? COPY.gallery.recoveryHint : COPY.gallery.creationGone)
  }, [id, ready, exists, unreadable, onOpen, showToast])
  return null
}

export function MoldaApp({ adapter, persistence, className }: MoldaAppProps): JSX.Element {
  const adapterValue = adapter ?? EMPTY_ADAPTER
  const [persist] = useState(() => persistence ?? getDefaultMoldaPersistence())
  // A oficina seguinte lê o MESMO banco do namespace: uma criação, uma identidade.
  // Sempre ligada: quem já foi promovido precisa continuar visível e abrível, mesmo que
  // a promoção de novos modelos seja desligada de novo.
  const [sceneStore] = useState(() => getMoldaGenerationStore())
  const [scene] = useState(() => createGallerySceneSource(sceneStore))
  const [gallery] = useState(() => createGalleryStore(persist, { scene }))
  const [screen, setScreen] = useState<Screen>({ type: 'gallery' })
  /**
   * Uma criação JÁ na geração seguinte abre na oficina, sempre. Um modelo ANTIGO só vai
   * para lá com `sceneWorkshop` ligado, porque abrir por lá o PROMOVE
   * (`openSceneWorkshop`) e promover é escrever o formato novo no disco. Textura e céu
   * continuam nos editores deles.
   */
  function open(assetId: string): void {
    const summary = gallery.getState().getById(assetId)
    const promoted = summary?.formatVersion === 2
    const promoting = adapterValue.sceneWorkshop === true && summary?.kind === 'model'
    setScreen({ type: 'editor', assetId, generation: promoted || promoting ? 2 : 1 })
  }

  useEffect(() => {
    void gallery.getState().load()
    return gallery.getState().attachPersistence()
  }, [gallery])

  const onChange = adapterValue.onChange
  useEffect(() => {
    if (!onChange) return
    return gallery.subscribe((state, previous) => {
      if (state.assets !== previous.assets) onChange()
    })
  }, [gallery, onChange])

  const context = useMemo(
    () => ({ adapter: adapterValue, gallery, persistence: persist, scene }),
    [adapterValue, gallery, persist, scene],
  )

  return (
    <div
      data-molda-theme={adapterValue.theme ?? 'light'}
      className={clsx(
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-mld-bg text-mld-text',
        className,
      )}
    >
      <MoldaAppProvider value={context}>
        <ToastProvider>
          {screen.type === 'gallery' ? (
            <GalleryScreen onOpen={open} />
          ) : screen.generation === 2 ? (
            <DeferredModule
              reloadPage
              key={screen.assetId}
              load={loadSceneWorkshop}
              onBack={() => setScreen({ type: 'gallery' })}
              props={{
                store: sceneStore,
                initialId: screen.assetId,
                theme: adapterValue.theme ?? 'light',
                ...(adapterValue.resyncToStudio
                  ? {
                      resyncToStudio: adapterValue.resyncToStudio,
                      canResyncToStudio: adapterValue.canResyncToStudio,
                    }
                  : {}),
                onRouteChange: (id: string | null) => {
                  if (id === null) setScreen({ type: 'gallery' })
                },
              }}
            />
          ) : (
            <EditorScreen
              key={screen.assetId}
              assetId={screen.assetId}
              onBack={() => setScreen({ type: 'gallery' })}
            />
          )}
          <InitialAssetOpener id={adapterValue.initialAssetId} onOpen={open} />
        </ToastProvider>
      </MoldaAppProvider>
    </div>
  )
}
