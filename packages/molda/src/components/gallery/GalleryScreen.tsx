/**
 * A galeria "Minhas criações 3D": cabeçalho com as ações, busca + filtro de
 * tipo, a grade de cards e os diálogos (criar, renomear, apagar). O import do
 * backup entra por um `<input type="file">` escondido.
 */
import type { ChangeEvent, JSX } from 'react'
import { useMemo, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  EMPTY_GALLERY_FILTERS,
  filterGalleryAssets,
  type GalleryFilters,
  type GalleryKindFilter,
  hasActiveGalleryFilters,
} from '../../core/gallerySearch'
import { MOLDA_ASSET_KINDS, type MoldaAsset } from '../../core/model'
import { type MoldaBackupReadFailure, readMoldaBackupFile } from '../../export/backupFile'
import { triggerDownload } from '../../export/download'
import { importMoldaJson } from '../../export/projectJson'
import { GALLERY_ZIP_FILE_NAME, zipGallery } from '../../export/zip'
import { useGallery, useMoldaApp } from '../appContext'
import { Button, IconButton } from '../ui/Button'
import { Download, ExternalLink, Loader2, Plus, Search, Upload, X } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { AssetCard } from './AssetCard'
import { ConfirmDialog } from './ConfirmDialog'
import { NewAssetDialog } from './NewAssetDialog'
import { RenameDialog } from './RenameDialog'

const KIND_FILTERS: readonly GalleryKindFilter[] = ['all', ...MOLDA_ASSET_KINDS]

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
  const { adapter, gallery } = useMoldaApp()
  const assets = useGallery((state) => state.assets)
  const loaded = useGallery((state) => state.loaded)
  const loading = useGallery((state) => state.loading)
  const syncing = useGallery((state) => state.syncing)
  const error = useGallery((state) => state.error)
  const { showToast } = useToast()

  const [filters, setFilters] = useState<GalleryFilters>(EMPTY_GALLERY_FILTERS)
  const [newOpen, setNewOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<MoldaAsset | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MoldaAsset | null>(null)
  const [packing, setPacking] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)

  const visible = useMemo(() => filterGalleryAssets(assets, filters), [assets, filters])
  const filtered = hasActiveGalleryFilters(filters)

  async function downloadAll(): Promise<void> {
    if (assets.length === 0 || packing) return
    setPacking(true)
    showToast(COPY.gallery.downloadPreparing)
    try {
      const bytes = await zipGallery(assets)
      const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' })
      showToast(
        triggerDownload(blob, GALLERY_ZIP_FILE_NAME)
          ? COPY.gallery.downloadReady
          : COPY.gallery.downloadFailed,
      )
    } catch {
      showToast(COPY.gallery.downloadFailed)
    } finally {
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

  async function duplicate(asset: MoldaAsset): Promise<void> {
    const copy = await gallery.getState().duplicate(asset.id)
    showToast(copy ? COPY.toast.duplicated : COPY.toast.saveFailed)
  }

  async function confirmRemove(): Promise<void> {
    const target = removeTarget
    setRemoveTarget(null)
    if (!target) return
    await gallery.getState().remove(target.id)
    showToast(COPY.toast.removed)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b-2 border-mld-border bg-mld-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="mld-display text-2xl text-mld-text">{COPY.gallery.title}</h1>
          <p className="text-sm text-mld-text-soft">{COPY.gallery.subtitle}</p>
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
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4" />
            )}
            {COPY.gallery.importJson}
          </Button>
          <Button
            variant="outline"
            onClick={() => void downloadAll()}
            disabled={assets.length === 0 || packing}
          >
            {packing ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            {COPY.gallery.downloadAll}
          </Button>
          <Button ref={createButtonRef} variant="primary" onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" className="size-5" />
            {COPY.gallery.create}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={RESTORE_ACCEPT}
            onChange={importFile}
            aria-label={COPY.gallery.importJson}
            className="hidden"
          />
        </div>
      </header>

      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="sr-only">{COPY.gallery.search}</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 size-4 text-mld-muted"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            placeholder={COPY.gallery.searchPlaceholder}
            className="min-h-11 w-full rounded-xl border-2 border-mld-border bg-mld-surface pl-9 pr-11 text-base text-mld-text focus-visible:border-mld-accent focus-visible:outline-none"
          />
          {filters.query ? (
            <IconButton
              aria-label={COPY.gallery.searchClear}
              onClick={() => setFilters({ ...filters, query: '' })}
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
                onClick={() => setFilters({ ...filters, kind })}
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

      <div className="px-4 pb-2 text-sm text-mld-muted" role="status">
        {syncing ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {COPY.gallery.syncing}
          </span>
        ) : loaded ? (
          COPY.gallery.resultCount(visible.length, assets.length)
        ) : loading ? (
          COPY.gallery.loading
        ) : null}
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-base text-mld-text">{error}</p>
            <Button variant="outline" onClick={() => void gallery.getState().load()}>
              {COPY.gallery.retry}
            </Button>
          </div>
        ) : loaded && assets.length === 0 ? (
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
            <Button variant="outline" onClick={() => setFilters(EMPTY_GALLERY_FILTERS)}>
              {COPY.gallery.searchClearAll}
            </Button>
          </div>
        ) : (
          <ul
            aria-label={COPY.a11y.galleryGrid}
            className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3"
          >
            {visible.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onOpen={onOpen}
                onRename={setRenameTarget}
                onDuplicate={(item) => void duplicate(item)}
                onRemove={setRemoveTarget}
              />
            ))}
          </ul>
        )}
      </main>

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
        onConfirm={() => void confirmRemove()}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  )
}
