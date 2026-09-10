/**
 * A galeria "Minhas criações 3D": cabeçalho com as ações, busca + filtro de
 * tipo, a grade de cards e os diálogos (criar, renomear, apagar). O import do
 * backup entra por um `<input type="file">` escondido.
 */
import type { ChangeEvent, JSX } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type MoldaAssetSummary, unlistedReadIssues } from '../../core/assetSummary'
import { COPY } from '../../core/copy'
import {
  EMPTY_GALLERY_FILTERS,
  filterGalleryAssets,
  type GalleryFilters,
  type GalleryKindFilter,
  hasActiveGalleryFilters,
} from '../../core/gallerySearch'
import { MOLDA_ASSET_KINDS } from '../../core/model'
import { type MoldaBackupReadFailure, readMoldaBackupFile } from '../../export/backupFile'
import { triggerDownload } from '../../export/download'
import { importMoldaJson } from '../../export/projectJson'
import { GALLERY_ZIP_FILE_NAME, GalleryZipError, zipGalleryBlob } from '../../export/zip'
import { createGalleryPreviews } from '../../state/galleryPreviews'
import { useGallery, useMoldaApp } from '../appContext'
import { Button, IconButton } from '../ui/Button'
import { Download, ExternalLink, Loader2, Plus, Search, Upload, X } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { AssetCard } from './AssetCard'
import { ConfirmDialog } from './ConfirmDialog'
import { NewAssetDialog } from './NewAssetDialog'
import { RecoveryNotice } from './RecoveryNotice'
import { RenameDialog } from './RenameDialog'

const KIND_FILTERS: readonly GalleryKindFilter[] = ['all', ...MOLDA_ASSET_KINDS]
const GALLERY_PAGE_SIZE = 60

const RESTORE_MESSAGES: Record<MoldaBackupReadFailure, string> = {
  'too-large': COPY.gallery.restoreTooLarge,
  'invalid-zip': COPY.gallery.importFailed,
  'missing-backup': COPY.gallery.restoreZipMissing,
  'duplicate-backup': COPY.gallery.restoreZipDuplicate,
  'read-error': COPY.gallery.importFailed,
}

/** O botão inteligente aceita o ZIP do "Baixar tudo" e o JSON solto. */
const RESTORE_ACCEPT = '.zip,.json,application/zip,application/x-zip-compressed,application/json'

export function GalleryScreen({ onOpen }: { onOpen: (id: string) => void }): JSX.Element {
  const { adapter, gallery, persistence } = useMoldaApp()
  const assets = useGallery((state) => state.assets)
  const loaded = useGallery((state) => state.loaded)
  const loading = useGallery((state) => state.loading)
  const syncing = useGallery((state) => state.syncing)
  const error = useGallery((state) => state.error)
  const readIssues = unlistedReadIssues(persistence.getReadIssues?.() ?? [], assets)
  const { showToast } = useToast()
  const [previews] = useState(() => createGalleryPreviews(persistence))
  useEffect(() => () => previews.clear(), [previews])

  const [filters, setFilters] = useState<GalleryFilters>(EMPTY_GALLERY_FILTERS)
  const [visibleLimit, setVisibleLimit] = useState(GALLERY_PAGE_SIZE)
  const [newOpen, setNewOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<MoldaAssetSummary | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MoldaAssetSummary | null>(null)
  const [removing, setRemoving] = useState(false)
  const [packing, setPacking] = useState(false)
  const [packingProgress, setPackingProgress] = useState(0)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const packingAbortRef = useRef<AbortController | null>(null)

  useEffect(() => () => packingAbortRef.current?.abort(), [])

  const visible = useMemo(() => filterGalleryAssets(assets, filters), [assets, filters])
  const page = visible.slice(0, visibleLimit)
  const filtered = hasActiveGalleryFilters(filters)

  function changeFilters(next: GalleryFilters): void {
    setFilters(next)
    setVisibleLimit(GALLERY_PAGE_SIZE)
  }

  async function downloadAll(): Promise<void> {
    if (assets.length === 0 || packing) return
    const controller = new AbortController()
    packingAbortRef.current = controller
    setPacking(true)
    setPackingProgress(0)
    showToast(COPY.gallery.downloadPreparing)
    try {
      // Explicit backup requests content; ordinary listing/filtering never does.
      const content = await persistence.loadAll()
      const blob = await zipGalleryBlob(content, {
        signal: controller.signal,
        onProgress: ({ processed }) => setPackingProgress(processed),
      })
      showToast(
        triggerDownload(blob, GALLERY_ZIP_FILE_NAME)
          ? COPY.gallery.downloadReady
          : COPY.gallery.downloadFailed,
      )
    } catch (error) {
      showToast(
        error instanceof GalleryZipError && error.code === 'aborted'
          ? COPY.gallery.downloadCancelled
          : COPY.gallery.downloadFailed,
      )
    } finally {
      packingAbortRef.current = null
      setPacking(false)
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || restoring) return
    setRestoring(true)
    try {
      const read = await readMoldaBackupFile(file)
      if (!read.ok) {
        showToast(RESTORE_MESSAGES[read.reason])
        return
      }
      const parsed = importMoldaJson(read.text)
      if (!parsed) {
        showToast(COPY.gallery.importFailed)
        return
      }
      if (parsed.assets.length === 0) {
        showToast(COPY.gallery.importedNone)
        return
      }
      const result = await gallery.getState().importAssets(parsed.assets)
      if (result.reason === 'storage-budget') showToast(COPY.gallery.storageBudget)
      else if (result.reason) showToast(COPY.toast.saveFailed)
      else showToast(COPY.gallery.imported(result.imported))
    } finally {
      setRestoring(false)
    }
  }

  async function duplicate(asset: MoldaAssetSummary): Promise<void> {
    const copy = await gallery.getState().duplicate(asset.id)
    showToast(copy ? COPY.toast.duplicated : COPY.toast.saveFailed)
  }

  async function confirmRemove(): Promise<void> {
    const target = removeTarget
    if (!target || removing) return
    setRemoving(true)
    const result = await gallery.getState().remove(target.id)
    setRemoving(false)
    if (!result.ok) {
      showToast(
        result.reason === 'storage-budget' ? COPY.gallery.storageBudget : COPY.toast.saveFailed,
      )
      return
    }
    setRemoveTarget(null)
    showToast(COPY.toast.removed)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      {/* Cabeçalho de SEÇÃO da comunidade (a mesma escala da galeria do Pinta e da lista do
          Estúdio): sem faixa própria (fundo/borda) e DENTRO da raiz rolável, cujo padding de
          cima é a folga do `.mld-pop` do 1º card no TOPO da lista (o hover cresce ~4px para
          cima; com a grade colada na borda do overflow, o topo do card era cortado). Com a
          lista rolada, uma fileira encostada na borda ainda corta o hover, mas aí o card já
          está saindo de tela. */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mld-display text-3xl text-mld-text md:text-4xl">{COPY.gallery.title}</h1>
          <p className="mt-1 text-sm text-mld-text-soft md:text-base">{COPY.gallery.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {adapter.studioOwned && adapter.onOpenStudio ? (
            <Button
              variant="outline"
              onClick={adapter.onOpenStudio}
              title={COPY.gallery.studioHint}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              {COPY.gallery.openStudio}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            title={COPY.gallery.importHint}
          >
            {restoring ? (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Upload aria-hidden="true" className="size-4" />
            )}
            {COPY.gallery.importJson}
          </Button>
          <Button
            variant="outline"
            onClick={() => (packing ? packingAbortRef.current?.abort() : void downloadAll())}
            disabled={assets.length === 0 && !packing}
          >
            {packing ? (
              <Loader2
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            {packing
              ? `${COPY.gallery.cancel} (${packingProgress}/${assets.length})`
              : COPY.gallery.downloadAll}
          </Button>
          <Button ref={createButtonRef} variant="primary" onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" className="size-5" />
            {COPY.gallery.create}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            name="molda-backup"
            accept={RESTORE_ACCEPT}
            onChange={importFile}
            aria-label={COPY.gallery.importJson}
            className="hidden"
          />
        </div>
      </header>

      <RecoveryNotice issues={readIssues} persistence={persistence} />

      <div className="sticky top-0 z-10 -mx-4 mb-3 flex flex-col gap-2 bg-mld-bg px-4 py-2 sm:-mx-6 sm:flex-row sm:items-center sm:px-6">
        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="sr-only">{COPY.gallery.search}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 size-4 text-mld-muted"
          />
          <input
            type="search"
            name="molda-gallery-search"
            autoComplete="off"
            value={filters.query}
            onChange={(event) => changeFilters({ ...filters, query: event.target.value })}
            placeholder={COPY.gallery.searchPlaceholder}
            className="min-h-11 w-full rounded-xl border-2 border-mld-border bg-mld-surface pl-9 pr-11 text-base text-mld-text focus-visible:border-mld-accent focus-visible:outline-none"
          />
          {filters.query ? (
            <IconButton
              aria-label={COPY.gallery.searchClear}
              onClick={() => changeFilters({ ...filters, query: '' })}
              className="absolute right-0"
            >
              <X aria-hidden="true" className="size-4" />
            </IconButton>
          ) : null}
        </label>
        <fieldset className="mld-scroll-x flex shrink-0 items-center gap-1 overflow-x-auto">
          <legend className="sr-only">{COPY.a11y.kindFilter}</legend>
          {KIND_FILTERS.map((kind) => {
            const active = filters.kind === kind
            const label = kind === 'all' ? COPY.gallery.filterAll : COPY.kinds[kind].title
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                aria-label={COPY.gallery.filterAria[kind]}
                onClick={() => changeFilters({ ...filters, kind })}
                className={
                  active
                    ? 'min-h-11 rounded-full bg-mld-accent px-4 text-sm font-bold text-mld-accent-fg'
                    : 'min-h-11 rounded-full border-2 border-mld-border bg-mld-surface px-4 text-sm font-bold text-mld-text hover:border-mld-accent'
                }
              >
                {kind === 'all' ? label : `${COPY.kinds[kind].emoji} ${label}`}
              </button>
            )
          })}
        </fieldset>
      </div>

      <div className="mb-2 text-sm text-mld-muted" role="status">
        {syncing ? (
          <span className="inline-flex items-center gap-2">
            <Loader2
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
            {COPY.gallery.syncing}
          </span>
        ) : loaded ? (
          COPY.gallery.resultCount(visible.length, assets.length)
        ) : loading ? (
          COPY.gallery.loading
        ) : null}
      </div>

      {/* Sem `<main>` próprio: o host já tem o dele; a grade rola com o cabeçalho. */}
      {error ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-base text-mld-text">{error}</p>
          <Button variant="outline" onClick={() => void gallery.getState().load()}>
            {COPY.gallery.retry}
          </Button>
        </div>
      ) : loaded && assets.length === 0 && readIssues.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span aria-hidden="true" className="text-5xl">
            {COPY.kinds.model.emoji}
          </span>
          <p className="max-w-md text-base text-mld-text-soft">{COPY.gallery.empty}</p>
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" className="size-5" />
            {COPY.gallery.emptyCta}
          </Button>
        </div>
      ) : loaded && visible.length === 0 && filtered ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-base text-mld-text-soft">{COPY.gallery.searchEmpty}</p>
          <Button variant="outline" onClick={() => changeFilters(EMPTY_GALLERY_FILTERS)}>
            {COPY.gallery.searchClearAll}
          </Button>
        </div>
      ) : (
        <>
          <ul
            id="molda-gallery-grid"
            aria-label={COPY.a11y.galleryGrid}
            className="grid grid-cols-[repeat(auto-fill,minmax(164px,1fr))] gap-3"
          >
            {page.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                previews={previews}
                onOpen={onOpen}
                onRename={setRenameTarget}
                onDuplicate={(item) => void duplicate(item)}
                onRemove={setRemoveTarget}
              />
            ))}
          </ul>
          {page.length < visible.length ? (
            <div className="flex justify-center py-5">
              <Button
                variant="outline"
                aria-controls="molda-gallery-grid"
                onClick={() =>
                  setVisibleLimit((current) =>
                    Math.min(current + GALLERY_PAGE_SIZE, visible.length),
                  )
                }
              >
                {COPY.gallery.loadMore}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <NewAssetDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(asset) => {
          setNewOpen(false)
          onOpen(asset.id)
        }}
      />
      <RenameDialog asset={renameTarget} onClose={() => setRenameTarget(null)} />
      <ConfirmDialog
        open={removeTarget !== null}
        title={COPY.gallery.removeConfirmTitle}
        body={COPY.gallery.removeConfirmBody}
        confirmLabel={COPY.gallery.removeConfirm}
        busy={removing}
        onConfirm={() => void confirmRemove()}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  )
}
