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
import { createGalleryStore } from '../state/galleryStore'
import { getDefaultMoldaPersistence, type MoldaPersistence } from '../state/persistence'
import { MoldaAppProvider, type MoldaHostAdapter, useGallery } from './appContext'
import { EditorScreen } from './editor/EditorScreen'
import { GalleryScreen } from './gallery/GalleryScreen'
import { ToastProvider } from './ui/Toast'

export interface MoldaAppProps {
  adapter?: MoldaHostAdapter
  /** Default: a persistência local do namespace corrente. */
  persistence?: MoldaPersistence
  className?: string
}

type Screen = { type: 'gallery' } | { type: 'editor'; assetId: string }

const EMPTY_ADAPTER: MoldaHostAdapter = {}

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
  const done = useRef(false)
  useEffect(() => {
    if (!id || done.current || !ready) return
    done.current = true
    if (exists) onOpen(id)
  }, [id, ready, exists, onOpen])
  return null
}

export function MoldaApp({ adapter, persistence, className }: MoldaAppProps): JSX.Element {
  const adapterValue = adapter ?? EMPTY_ADAPTER
  const [persist] = useState(() => persistence ?? getDefaultMoldaPersistence())
  const [gallery] = useState(() => createGalleryStore(persist))
  const [screen, setScreen] = useState<Screen>({ type: 'gallery' })

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
    () => ({ adapter: adapterValue, gallery, persistence: persist }),
    [adapterValue, gallery, persist],
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
            <GalleryScreen onOpen={(assetId) => setScreen({ type: 'editor', assetId })} />
          ) : (
            <EditorScreen
              key={screen.assetId}
              assetId={screen.assetId}
              onBack={() => setScreen({ type: 'gallery' })}
            />
          )}
          <InitialAssetOpener
            id={adapterValue.initialAssetId}
            onOpen={(assetId) => setScreen({ type: 'editor', assetId })}
          />
        </ToastProvider>
      </MoldaAppProvider>
    </div>
  )
}
