import { type JSX, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import type { PintaMemoryAsset } from '../../core/assetMemory'
import { COPY } from '../../core/copy'
import { pintaLocalRevisionOf } from '../../core/localAssetOrigin'
import type { RegionTilemapAsset } from '../../core/project'
import type { LocalRegionAuthorSession } from '../../state/localRegionAuthorSession'
import { markPintaAssetClosed, markPintaAssetOpen } from '../../state/persistence'
import { createSessionStore, TILEMAP_ZOOM_LEVELS } from '../../state/sessionStore'
import { captureWorkshopPintaAssetForImage } from '../../state/workshopPersistence'
import { usePintaApp } from '../appContext'
import { WorkshopMapDownload } from '../export/WorkshopMapDownload'
import { HostCloudStatus, HostMenuButton, usePintaHostChrome } from '../hostChrome'
import { Button, IconButton } from '../ui/Button'
import { ArrowLeft, Download, Map as MapIcon } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { TilemapEditor } from './TilemapEditor'

export function FocalEditorScreen({
  focal,
  openComplete,
}: {
  focal: LocalRegionAuthorSession
  openComplete: () => Promise<void>
}): JSX.Element {
  const { closeEditor } = usePintaApp()
  const { showToast } = useToast()
  const chrome = usePintaHostChrome()
  const document = useStore(focal.store, (state) => state.document)
  const saving = useStore(focal.store, (state) => state.saving)
  const error = useStore(focal.store, (state) => state.error)
  const [busy, setBusy] = useState(false)
  const [download, setDownload] = useState<{
    asset: RegionTilemapAsset
    catalog: readonly PintaMemoryAsset[]
  } | null>(null)
  const [session] = useState(() =>
    createSessionStore({
      tool: 'pencil',
      zoom: 2,
      zoomLevels: TILEMAP_ZOOM_LEVELS,
    }),
  )
  useEffect(() => {
    markPintaAssetOpen(focal.id)
    return () => markPintaAssetClosed(focal.id)
  }, [focal.id])
  async function finish(action: () => Promise<void> | void) {
    if (busy) return
    setBusy(true)
    try {
      const result = await focal.flush()
      if (!result.ok) throw Error(result.message ?? COPY.editor.saveError)
      await action()
    } catch (error) {
      showToast(error instanceof Error ? error.message : COPY.editor.saveError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="pin-band flex shrink-0 items-center gap-2 px-3 py-2">
        {chrome?.menu ? <HostMenuButton menu={chrome.menu} /> : null}
        <IconButton
          aria-label={COPY.editor.back}
          disabled={busy}
          onClick={() => void finish(closeEditor)}
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </IconButton>
        <MapIcon aria-hidden="true" className="size-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-bold">{document.name}</span>
        <span aria-live="polite" role="status">
          {error ? COPY.editor.saveError : saving ? COPY.editor.saving : COPY.editor.saved}
        </span>
        {error ? (
          <Button variant="barOutline" disabled={busy || saving} onClick={closeEditor}>
            Sair sem guardar o gesto
          </Button>
        ) : null}
        {chrome?.status ? <HostCloudStatus status={chrome.status} variant="bar" /> : null}
        <Button
          variant="barOutline"
          disabled={busy || saving}
          onClick={() => void finish(openComplete)}
        >
          {COPY.scene.avancado}
        </Button>
        <IconButton
          aria-label={COPY.editor.download}
          disabled={busy || saving}
          onClick={() =>
            void finish(async () => {
              const revision = focal.store.getState().revision
              const capture = await captureWorkshopPintaAssetForImage(focal.id, {
                namespace: focal.namespace,
              })
              if (
                !capture.ok ||
                capture.source.kind !== 'tilemap' ||
                !('origin' in capture.source) ||
                pintaLocalRevisionOf(capture.source) !== revision ||
                focal.store.getState().revision !== revision
              )
                throw Error(COPY.scene.gestureChanged)
              setDownload({ asset: capture.source, catalog: capture.assets ?? capture.tilesets })
            })
          }
        >
          <Download aria-hidden="true" className="size-5" />
        </IconButton>
      </header>
      <div inert={busy} className="flex min-h-0 flex-1 flex-col">
        <TilemapEditor regional={{ focal, session }} />
      </div>
      {download ? (
        <WorkshopMapDownload
          open
          asset={download.asset}
          catalog={download.catalog}
          onClose={() => setDownload(null)}
        />
      ) : null}
    </div>
  )
}
