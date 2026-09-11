/**
 * A galeria "Minhas criações 3D": cabeçalho com as ações, busca + filtro de
 * tipo, a grade de cards e os diálogos (criar, renomear, apagar). O import do
 * backup entra por um `<input type="file">` escondido.
 *
 * ⭐ 11/09/2026: o desenho das telas-modelo, o MESMO da galeria "Meus Jogos" do Estúdio e da
 * galeria do Pinta: três faixas de borda a borda que rolam juntas (creme com o cabeçalho de duas
 * linhas, céu com a grade e o cartão "Nova criação" na frente, lilás com o cartão de fechamento).
 * As receitas `sz-tool-*` vêm de `@sistemazero/ui/tool-chrome.css`, que o host importa (o kids e
 * o playground); o Molda só roda nesses dois.
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
import { GALLERY_SHELL_COPY } from '../../core/galleryShellCopy'
import type { MoldaHostChromeStatus } from '../../core/hostChrome'
import { MOLDA_ASSET_KINDS } from '../../core/model'
import {
  type MoldaBackupReadFailure,
  readMoldaBackupFile,
  readMoldaBackupProjects,
} from '../../export/backupFile'
import { triggerDownload } from '../../export/download'
import { importMoldaJson } from '../../export/projectJson'
import { GALLERY_ZIP_FILE_NAME, GalleryZipError, zipGalleryBlob } from '../../export/zip'
import { readSceneDocument } from '../../scene/readDocument'
import { createGalleryPreviews } from '../../state/galleryPreviews'
import { useGallery, useMoldaApp } from '../appContext'
import { HostBackLink, HostCloudStatus, HostMenuButton, useMoldaHostChrome } from '../hostChrome'
import { Box, Download, ExternalLink, Loader2, Plus, Search, Upload, X } from '../ui/icons'
import { useToast } from '../ui/Toast'
import { AssetCard } from './AssetCard'
import { ConfirmDialog } from './ConfirmDialog'
import { KIND_ICONS } from './kinds'
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

/**
 * A grade: a `.sz-tool-grid` COMPARTILHADA, a mesma do Estúdio e do Pinta (`auto-fill` de
 * 13,75rem: 4 colunas de ~246px a 1440px com o menu aberto, a imagem-modelo, e mais colunas,
 * não cartões mais largos, conforme a tela cresce). Era uma grade própria de 164px.
 */
const GALLERY_GRID_CLASS = 'sz-tool-grid'

export function GalleryScreen({ onOpen }: { onOpen: (id: string) => void }): JSX.Element {
  const { adapter, gallery, persistence, scene } = useMoldaApp()
  const hostChrome = useMoldaHostChrome()
  const assets = useGallery((state) => state.assets)
  // A lista da geração seguinte não respondeu nesta leitura. A galeria v1 fica de pé, mas o
  // "Baixar tudo" promete o pacote COMPLETO: um ZIP sem as criações promovidas, anunciado
  // como pronto, é o único backup da criança mentindo para ela.
  const sceneUnavailable = useGallery((state) => state.sceneUnavailable)
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
  const searchRef = useRef<HTMLInputElement>(null)
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
    // Inventário da geração seguinte mudo: nenhuma criação promovida foi sequer LISTADA,
    // então a contagem de faltantes daria ZERO e o pacote sairia anunciado como completo.
    // Recusar e pedir para tentar de novo é o único recado honesto que cabe aqui.
    if (sceneUnavailable) {
      showToast(COPY.gallery.downloadFailed)
      return
    }
    const controller = new AbortController()
    packingAbortRef.current = controller
    setPacking(true)
    setPackingProgress(0)
    showToast(COPY.gallery.downloadPreparing)
    try {
      // Explicit backup requests content; ordinary listing/filtering never does.
      const content = await persistence.loadAll()
      let missing = 0
      const scenes = assets
        .filter((asset) => asset.formatVersion === 2)
        .map((asset) => ({
          name: asset.name,
          async read() {
            const json = await scene.readProject(asset.id)
            if (json === null) missing++
            return json
          },
        }))
      const blob = await zipGalleryBlob(content, {
        signal: controller.signal,
        scenes,
        onProgress: ({ processed }) => setPackingProgress(processed),
      })
      // Uma criação da geração seguinte que não pôde ser lida agora ficaria de fora em
      // silêncio; dizer isso vale mais do que um pacote que parece completo e não é.
      showToast(
        !triggerDownload(blob, GALLERY_ZIP_FILE_NAME)
          ? COPY.gallery.downloadFailed
          : missing > 0
            ? COPY.gallery.downloadSkippedScene(missing)
            : COPY.gallery.downloadReady,
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
      const bundle = await readMoldaBackupProjects(file)
      if (!bundle.ok) {
        showToast(RESTORE_MESSAGES[bundle.reason])
        return
      }
      const raw = read.source === 'json' ? JSON.parse(read.text) : null
      const native = raw?.kind === 'model' && raw.formatVersion >= 2
      const parsed = native ? null : importMoldaJson(read.text)
      const texts = bundle.projects.slice()
      if (!parsed && read.source === 'json') texts.push(read.text)
      if (!parsed && !texts.length) {
        showToast(COPY.gallery.importFailed)
        return
      }
      // Validate all project entries before the first write, including unknown future versions.
      const projects: Array<{ name: string; json: string }> = []
      for (const json of texts) {
        const project = readSceneDocument(JSON.parse(json))
        if (project.status !== 'valid') {
          showToast(COPY.gallery.importFailed)
          return
        }
        projects.push({ name: project.document.name, json })
      }
      const total = (parsed?.assets.length ?? 0) + projects.length
      if (!total) {
        showToast(COPY.gallery.importedNone)
        return
      }
      let imported = 0
      const previous = await gallery.getState().importAssets(parsed?.assets ?? [])
      imported += previous.imported
      if (previous.reason) {
        showToast(
          previous.reason === 'storage-budget' ? COPY.gallery.storageBudget : COPY.toast.saveFailed,
        )
        return
      }
      const next = projects.length
        ? await gallery.getState().importProjects(projects)
        : { imported: 0 }
      imported += next.imported
      if (next.reason || parsed?.skipped) showToast(COPY.gallery.importedPartial(imported))
      else showToast(COPY.gallery.imported(imported))
    } catch {
      showToast(COPY.gallery.importFailed)
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

  // A pílula do cabeçalho diz o que acontece AGORA (o selo do host) ou, em repouso, que a nuvem
  // da conta está ligada: a imagem-modelo mostra "Guardado na sua conta" sem nada acontecendo.
  // Fora do community-kids o `hostChrome` é `null` e nada disso aparece.
  const headerPill: MoldaHostChromeStatus | null =
    hostChrome?.status ??
    (hostChrome?.account
      ? {
          tone: 'ok',
          icon: 'cloud',
          label: hostChrome.account.label,
          text: hostChrome.account.label,
        }
      : null)
  // O cartão lilás diz ONDE as criações estão: na conta (com a nuvem ligada) ou só neste
  // aparelho. Nunca promete a nuvem que não existe.
  const savedText = hostChrome?.account
    ? GALLERY_SHELL_COPY.savedAccount(assets.length)
    : GALLERY_SHELL_COPY.savedDevice(assets.length)
  const ready = loaded && !error
  const empty = ready && assets.length === 0 && readIssues.length === 0

  // O cartão amarelo que abre a grade (a imagem-modelo): um BOTÃO de verdade com nome próprio
  // (título + dica), diferente do "Criar novo" do cabeçalho, que os e2e acham pelo nome. Some
  // com busca ou filtro (no meio de um resultado ele seria ruído). `min-h-40` e não a altura do
  // cartão: numa fileira com criações a grade o estica até elas; sozinho (a galeria vazia) ele
  // não precisa de 272px vazios.
  const newCard = (
    <button
      type="button"
      className="sz-tool-card sz-tool-card--new min-h-40 w-full flex-1"
      onClick={() => setNewOpen(true)}
    >
      <span className="sz-tool-new-dot" aria-hidden="true">
        <Plus />
      </span>
      <span className="sz-tool-card-title text-base">{GALLERY_SHELL_COPY.newCardTitle}</span>
      <span className="font-semibold text-mld-muted text-xs">{GALLERY_SHELL_COPY.newCardHint}</span>
    </button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* A área que ROLA: as três faixas de borda a borda, que rolam juntas (o cabeçalho não fica
          preso em cima). Sem `<main>` próprio: o host já tem o dele. */}
      <div data-mld-scroll-root="" className="min-h-0 flex-1 overflow-y-auto">
        <div className="sz-tool-bands">
          <header data-mld-band="creme" className="sz-tool-band sz-tool-band--creme">
            {/* 48px em cima e 36px embaixo a partir de 1024px: o respiro medido na imagem (o
                título desce um pouco mais que o das outras faixas), igual ao Estúdio e ao Pinta. */}
            <div className="sz-tool-band__inner lg:pt-12 lg:pb-9">
              {/* Linha 1: [menu][voltar] + título e subtítulo à esquerda; à direita o selo, o
                  atalho do Estúdio (com a posse dele) e o "Criar novo". O "Baixar tudo" e o
                  "Trazer de volta" moram no cartão lilás do fim (o arquivo das criações: levar e
                  trazer), como no Pinta. */}
              <div className="sz-tool-header">
                <div className="sz-tool-header__lead">
                  {hostChrome?.menu || hostChrome?.back ? (
                    <div className="sz-tool-header__nav">
                      {hostChrome.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
                      {hostChrome.back ? <HostBackLink back={hostChrome.back} /> : null}
                    </div>
                  ) : null}
                  <div className="sz-tool-header__title">
                    <h1 className="sz-tool-title">{COPY.gallery.title}</h1>
                    <p className="sz-tool-subtitle">{COPY.gallery.subtitle}</p>
                  </div>
                </div>
                <div className="sz-tool-header__actions">
                  {headerPill ? <HostCloudStatus status={headerPill} variant="header" /> : null}
                  {adapter.studioOwned && adapter.onOpenStudio ? (
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--quiet"
                      onClick={adapter.onOpenStudio}
                      title={COPY.gallery.studioHint}
                    >
                      <ExternalLink aria-hidden="true" />
                      {COPY.gallery.openStudio}
                    </button>
                  ) : null}
                  <button
                    ref={createButtonRef}
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    onClick={() => setNewOpen(true)}
                  >
                    <Plus aria-hidden="true" />
                    {COPY.gallery.create}
                  </button>
                  {/* O campo de arquivo mora aqui, SEMPRE montado: o botão que o aciona fica no
                      cartão lilás, que só existe com a galeria carregada. */}
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
              </div>

              {ready && assets.length > 0 ? (
                // Linha 2, 28px abaixo do título (a imagem): os chips de tipo à esquerda, com os
                // ícones de linha no lugar dos emojis, e a busca à direita.
                <div className="sz-tool-toolbar mt-7">
                  <div className="sz-tool-toolbar__start">
                    <fieldset className="sz-tool-chips">
                      <legend className="sr-only">{COPY.a11y.kindFilter}</legend>
                      {KIND_FILTERS.map((kind) => {
                        const Icon = kind === 'all' ? null : KIND_ICONS[kind]
                        return (
                          <button
                            key={kind}
                            type="button"
                            aria-pressed={filters.kind === kind}
                            aria-label={COPY.gallery.filterAria[kind]}
                            onClick={() => changeFilters({ ...filters, kind })}
                            className="sz-tool-chip"
                          >
                            {Icon ? <Icon aria-hidden="true" /> : null}
                            {kind === 'all' ? COPY.gallery.filterAll : COPY.kinds[kind].plural}
                          </button>
                        )
                      })}
                    </fieldset>
                  </div>
                  <div className="sz-tool-toolbar__end">
                    <label className="sz-tool-search-wrap">
                      <Search aria-hidden="true" />
                      <input
                        ref={searchRef}
                        type="search"
                        name="molda-gallery-search"
                        autoComplete="off"
                        value={filters.query}
                        onChange={(event) =>
                          changeFilters({ ...filters, query: event.target.value })
                        }
                        onKeyDown={(event) => {
                          // Esc limpa a busca (o campo é da galeria: nenhum diálogo aberto aqui).
                          if (event.key === 'Escape' && filters.query) {
                            event.preventDefault()
                            changeFilters({ ...filters, query: '' })
                          }
                        }}
                        aria-label={COPY.gallery.search}
                        placeholder={COPY.gallery.searchPlaceholder}
                        className="sz-tool-search pr-11"
                      />
                      {filters.query ? (
                        <button
                          type="button"
                          aria-label={COPY.gallery.searchClear}
                          onClick={() => {
                            changeFilters({ ...filters, query: '' })
                            searchRef.current?.focus()
                          }}
                          className="absolute right-0 inline-flex size-10 items-center justify-center rounded-full text-mld-muted hover:bg-mld-border/40 hover:text-mld-text any-pointer-coarse:size-11"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      ) : null}
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          <div data-mld-band="ceu" className="sz-tool-band sz-tool-band--ceu">
            <div className="sz-tool-band__inner">
              <RecoveryNotice issues={readIssues} persistence={persistence} />

              {error ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="font-semibold text-base text-mld-muted">{error}</p>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--primary"
                    onClick={() => void gallery.getState().load()}
                  >
                    {COPY.gallery.retry}
                  </button>
                </div>
              ) : empty ? (
                // Primeiro uso: o recado e o cartão "Nova criação" sozinho na grade (o convite
                // que antes era um botão grande no meio da tela).
                <div className="flex flex-col gap-6">
                  <p className="font-semibold text-base text-mld-muted">{COPY.gallery.empty}</p>
                  <div className={GALLERY_GRID_CLASS}>{newCard}</div>
                </div>
              ) : loaded && visible.length === 0 && filtered ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="font-semibold text-base text-mld-muted">
                    {COPY.gallery.searchEmpty}
                  </p>
                  <button
                    type="button"
                    className="sz-tool-pill sz-tool-pill--quiet"
                    onClick={() => changeFilters(EMPTY_GALLERY_FILTERS)}
                  >
                    {COPY.gallery.searchClearAll}
                  </button>
                </div>
              ) : ready ? (
                <>
                  <ul
                    id="molda-gallery-grid"
                    aria-label={COPY.a11y.galleryGrid}
                    className={GALLERY_GRID_CLASS}
                  >
                    {/* O cartão novo é o PRIMEIRO item da grade, como na imagem-modelo; os testes
                        o separam das criações por este marcador. */}
                    {filtered ? null : (
                      <li data-mld-new-card="" className="flex">
                        {newCard}
                      </li>
                    )}
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
                    <div className="flex justify-center pt-6">
                      <button
                        type="button"
                        className="sz-tool-pill sz-tool-pill--quiet"
                        aria-controls="molda-gallery-grid"
                        onClick={() =>
                          setVisibleLimit((current) =>
                            Math.min(current + GALLERY_PAGE_SIZE, visible.length),
                          )
                        }
                      >
                        {COPY.gallery.loadMore}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : null}

              {/* Rodapé: o contador (e, enquanto a nuvem busca ou a galeria abre, o recado disso).
                  É o ÚNICO `role="status"` da galeria; monta sempre, vazio quando não há o que
                  dizer (região viva inserida já preenchida não é anunciada). Com o selo do host
                  no cabeçalho ("Buscando…"), o "buscando" daqui sai: seria dito duas vezes. */}
              <p
                role="status"
                className={empty ? 'sr-only' : 'mt-6 min-h-5 font-semibold text-mld-muted text-sm'}
              >
                {syncing && !hostChrome?.status ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                    {COPY.gallery.syncing}
                  </span>
                ) : loaded ? (
                  empty ? null : (
                    COPY.gallery.resultCount(visible.length, assets.length)
                  )
                ) : loading ? (
                  COPY.gallery.loading
                ) : null}
              </p>
            </div>
          </div>

          {/* O fechamento da página (faixa lilás): ONDE as criações estão e o que se faz com o
              arquivo delas, levar (tudo) e trazer de volta. Com a galeria VAZIA ele também
              aparece: num aparelho novo, trazer as criações de volta é justamente o primeiro
              passo. */}
          {ready ? (
            <section
              aria-labelledby="molda-gallery-saved"
              data-mld-band="lilas"
              className="sz-tool-band sz-tool-band--lilas"
            >
              <div className="sz-tool-band__inner">
                <div className="sz-tool-cta-card">
                  <span className="sz-tool-tile sz-tool-tile--new" aria-hidden="true">
                    <Box />
                  </span>
                  <div className="sz-tool-cta-card__body">
                    <h2 id="molda-gallery-saved" className="sz-tool-cta-card__title">
                      {savedText}
                    </h2>
                    <p className="sz-tool-cta-card__text">{GALLERY_SHELL_COPY.savedHint}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {assets.length > 0 || packing ? (
                      <button
                        type="button"
                        className="sz-tool-pill sz-tool-pill--creme"
                        aria-busy={packing}
                        onClick={() =>
                          packing ? packingAbortRef.current?.abort() : void downloadAll()
                        }
                      >
                        {packing ? (
                          <Loader2
                            aria-hidden="true"
                            className="animate-spin motion-reduce:animate-none"
                          />
                        ) : (
                          <Download aria-hidden="true" />
                        )}
                        {packing
                          ? `${COPY.gallery.cancel} (${packingProgress}/${assets.length})`
                          : COPY.gallery.downloadAll}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--creme"
                      disabled={restoring}
                      aria-busy={restoring}
                      title={COPY.gallery.importHint}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {restoring ? (
                        <Loader2
                          aria-hidden="true"
                          className="animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <Upload aria-hidden="true" />
                      )}
                      {COPY.gallery.importJson}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>

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
