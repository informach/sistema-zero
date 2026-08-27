/**
 * Tela inicial: a galeria de desenhos do perfil. CRUD completo (criar em 3
 * passos, renomear, duplicar, apagar com confirmação) + estados de
 * carregando/vazio/erro com retry.
 */
import type { JSX } from 'react'
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { COPY } from '../../core/copy'
import {
  EMPTY_GALLERY_FILTERS,
  filterGalleryAssets,
  type GalleryFilters,
  type GalleryRoleFilter,
  type GalleryStyleFilter,
  hasActiveGalleryFilters,
} from '../../core/gallerySearch'
import { expandSelection } from '../../core/gallerySelection'
import { perfMeasure } from '../../core/perf'
import { isTilesetKind, type PintaAsset } from '../../core/project'
import type { PintaInitialIntent } from '../../core/types'
import { type PintaBackupReadFailure, readPintaBackupFile } from '../../export/backupFile'
import { triggerDownload } from '../../export/download'
import { importPintaJson } from '../../export/projectJson'
import { zipGallery } from '../../export/zip'
import { decodeImageFile, IMPORT_ACCEPT, MAX_IMAGE_FILE_BYTES } from '../../import/decodeImage'
import type { RGBAImage } from '../../import/quantize'
import { usePintaApp, usePintaGallery } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  Download,
  Image as ImageIcon,
  Plus,
  Search,
  Sparkles,
  SquareCheckBig,
  Upload,
  X,
} from '../ui/icons'
import { useToast } from '../ui/Toast'
import { AssetCard } from './AssetCard'
import { useGallerySelection } from './useGallerySelection'

/**
 * "Trazer uma foto" carrega junto o quantizador (median-cut) e o decodificador — nada
 * disso é usado até a criança clicar; o chunk só entra quando o diálogo abre.
 */
const LazyImportImageDialog = lazy(() =>
  import('./ImportImageDialog').then((m) => ({ default: m.ImportImageDialog })),
)

import { NewAssetDialog, type NewAssetRole } from './NewAssetDialog'

/**
 * Grade da galeria: cards COMPACTOS, mas largos o bastante para as três ações
 * caberem no próprio card com alvo de 44px (3×44 = 132px + respiros ⇒ ~164px).
 * `auto-fill` + `minmax` em vez de um número fixo de colunas porque o card
 * precisa ter o MESMO tamanho em qualquer tela: com um `grid-cols-N` fixo, um
 * monitor de 1920 esticaria cada card. Assim dá ~6 colunas num notebook de 1366
 * e ~9 em 1920, com o card sempre em ~165px.
 */
const GALLERY_GRID_CLASS = 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(164px,1fr))]'

/** Nome sugerido pela missão de arte (com sufixo se a criança já usou o base). */
const ROLE_NAME_BASE: Record<NewAssetRole, string> = {
  sprite: 'heroi',
  background: 'cenario',
  tileset: 'pecas',
  tilemap: 'mapa',
}

function suggestName(role: NewAssetRole, taken: ReadonlySet<string>): string {
  const base = ROLE_NAME_BASE[role]
  if (!taken.has(base)) return base
  for (let n = 2; n <= 999; n += 1) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  }
  return ''
}

export function GalleryScreen(): JSX.Element {
  const { gallery, openAsset, takeInitialIntent, initialIntentVersion } = usePintaApp()
  const { showToast } = useToast()
  const assets = usePintaGallery((state) => state.assets)
  const loaded = usePintaGallery((state) => state.loaded)
  const syncing = usePintaGallery((state) => state.syncing)
  // Medição: do início da leitura da galeria até a primeira renderização com os cards.
  useEffect(() => {
    if (loaded) perfMeasure('pinta:gallery:rendered', 'pinta:gallery:load:start')
  }, [loaded])
  const loading = usePintaGallery((state) => state.loading)
  const loadError = usePintaGallery((state) => state.loadError)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  // Intent do Pensa (missão de arte): abre o "Criar novo" pré-configurado. É
  // consumido no efeito (não no initializer) p/ o duplo-mount do StrictMode
  // não engolir o intent; o segundo run recebe null e não faz nada.
  const [intent, setIntent] = useState<PintaInitialIntent | null>(null)
  useEffect(() => {
    // O contador é o sinal para consumir um novo intent, mesmo que o callback
    // estável continue com a mesma identidade.
    void initialIntentVersion
    const taken = takeInitialIntent()
    if (taken) {
      setIntent(taken)
      setCreateOpen(true)
    }
  }, [takeInitialIntent, initialIntentVersion])
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null)
  const [zipping, setZipping] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [importImage, setImportImage] = useState<RGBAImage | null>(null)
  const restoreRef = useRef<HTMLInputElement>(null)
  // Busca (nome, tipo, jogo) + filtros de estilo e tipo. Sem teto de desenhos, são
  // eles que mantêm a galeria navegável.
  const [filters, setFilters] = useState<GalleryFilters>(EMPTY_GALLERY_FILTERS)
  const query = filters.query
  const setQuery = (value: string) => setFilters((f) => ({ ...f, query: value }))
  const searchRef = useRef<HTMLInputElement>(null)
  const searching = hasActiveGalleryFilters(filters)
  // O campo responde na hora; a filtragem usa os filtros ADIADOS (React desprioriza a grade de
  // centenas de cards enquanto a criança ainda digita) e é memoizada — termos da busca uma vez
  // por tecla, texto de cada desenho do cache (não N normalizações por tecla).
  const deferredFilters = useDeferredValue(filters)
  const visibleAssets = useMemo(
    () =>
      hasActiveGalleryFilters(deferredFilters)
        ? filterGalleryAssets(assets, deferredFilters)
        : assets,
    [assets, deferredFilters],
  )
  const clearFilters = () => setFilters(EMPTY_GALLERY_FILTERS)

  const {
    selectionMode,
    selectedIds,
    selectedCount,
    enterSelection,
    exitSelection,
    clearSelection,
    toggleSelection,
    captureSelection,
    exitSelectionIfUnchanged,
  } = useGallerySelection(assets, searchRef)

  const renameTarget = assets.find((a) => a.id === renameId) ?? null
  const removeTarget = assets.find((a) => a.id === removeId) ?? null
  const dependentMaps =
    removeTarget && isTilesetKind(removeTarget)
      ? assets.filter((asset) => asset.kind === 'tilemap' && asset.tilesetId === removeTarget.id)
      : []
  const tilesets = useMemo(() => assets.filter(isTilesetKind), [assets])
  const lastStyle = usePintaGallery((state) => state.lastStyle)
  // Índice por id (o mapa de tiles procura as peças dele por card) e nomes já usados — uma vez
  // por lista, não uma busca linear por card nem um `Set` novo a cada render.
  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const findAsset = useCallback((id: string) => assetsById.get(id) ?? null, [assetsById])
  const takenNames = useMemo(() => new Set(assets.map((a) => a.name)), [assets])

  // Agrupamento por jogo do Pensa: chave = projectRef.id (não o nome — dois
  // jogos homônimos não devem fundir). A ordem das seções segue o asset mais
  // recente (a lista já vem por updatedAt desc; o Map preserva a inserção).
  // A busca filtra ANTES do agrupamento: uma seção some quando nada nela casa.
  const { projectSections, looseAssets } = useMemo(() => {
    const byProject = new Map<string, { name: string; assets: PintaAsset[] }>()
    const loose: PintaAsset[] = []
    for (const asset of visibleAssets) {
      const ref = asset.projectRef
      if (!ref) {
        loose.push(asset)
        continue
      }
      const entry = byProject.get(ref.id) ?? { name: ref.name, assets: [] }
      entry.assets.push(asset)
      byProject.set(ref.id, entry)
    }
    return { projectSections: [...byProject.entries()], looseAssets: loose }
  }, [visibleAssets])

  // Ações do card POR ID, estáveis (o card é `memo`): trocar de diálogo ou digitar na busca
  // não re-renderiza centenas de cards.
  const onOpenCard = useCallback((id: string) => openAsset(id), [openAsset])
  const onRenameCard = useCallback(
    (id: string) => {
      const target = assetsById.get(id)
      if (!target) return
      setRenameId(id)
      setRenameValue(target.name)
    },
    [assetsById],
  )
  const onDuplicateCard = useCallback(
    (id: string) =>
      gallery
        .getState()
        .duplicate(id)
        .then((copy) => {
          if (!copy) {
            const error = gallery.getState().mutateError
            if (error) showToast(error)
          }
        }),
    [gallery, showToast],
  )
  const onRemoveCard = useCallback((id: string) => setRemoveId(id), [])

  const renderCard = (asset: PintaAsset): JSX.Element => (
    <AssetCard
      key={asset.id}
      asset={asset}
      justCreated={asset.id === justCreatedId}
      findAsset={findAsset}
      onOpen={onOpenCard}
      onRename={onRenameCard}
      onDuplicate={onDuplicateCard}
      onRemove={onRemoveCard}
      selectable={selectionMode}
      selected={selectionMode && selectedIds.has(asset.id)}
      onToggleSelect={toggleSelection}
    />
  )

  async function handleDownloadAll(): Promise<void> {
    if (zipping) return
    setZipping(true)
    try {
      const bytes = await zipGallery(gallery.getState().assets)
      triggerDownload(
        new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
        'meus-desenhos-pinta.zip',
      )
      showToast(COPY.toast.downloadReady)
    } catch {
      showToast(COPY.gallery.zipError)
    } finally {
      setZipping(false)
    }
  }

  async function handleDownloadSelection(): Promise<void> {
    if (zipping) return
    // Expande na hora do download, sobre a galeria VIVA (nunca a lista filtrada
    // da tela): mapa marcado leva o tileset dele junto — sem as peças o
    // restauro recusaria o mapa.
    const markedAtClick = captureSelection()
    const expanded = expandSelection(gallery.getState().assets, markedAtClick.ids)
    if (expanded.assets.length === 0) {
      // Corrida rara (a nuvem removeu os marcados entre o render e o clique):
      // avisa em vez de um clique-morto silencioso.
      showToast(COPY.gallery.drawingGone)
      return
    }
    // Identidade da marcação NO CLIQUE: se a criança mexer na seleção durante
    // um zip demorado (Limpar, Cancelar + recomeçar, marcar mais um), o
    // auto-fechar do sucesso NÃO pode engolir a sessão nova — todo toggle cria
    // um Set novo, então identidade igual = ninguém tocou.
    setZipping(true)
    try {
      const bytes = await zipGallery(expanded.assets, 'pack')
      triggerDownload(
        new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
        'pack-pinta.zip',
      )
      // A contagem é do que FOI para o zip (marcados + peças auto-incluídas),
      // coerente com o sufixo do tileset — o toast confere o pack sozinho.
      const done = COPY.gallery.downloadedSelection(expanded.assets.length)
      showToast(
        expanded.autoIncludedTilesetIds.length > 0
          ? `${done} ${COPY.gallery.selectionTilesetIncluded}`
          : done,
      )
      // Pack baixado = tarefa concluída; sair do modo devolve os cards ao normal.
      exitSelectionIfUnchanged(markedAtClick)
    } catch {
      showToast(COPY.gallery.zipError)
    } finally {
      setZipping(false)
    }
  }

  async function handlePhoto(file: File): Promise<void> {
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      showToast(COPY.gallery.importTooLarge)
      return
    }
    const decoded = await decodeImageFile(file)
    if (!decoded) {
      showToast(COPY.gallery.importDecodeError)
      return
    }
    setImportImage(decoded)
  }

  async function handleRestore(file: File): Promise<void> {
    if (restoring) return
    setRestoring(true)
    try {
      const read = await readPintaBackupFile(file)
      if (!read.ok) {
        const messages: Record<PintaBackupReadFailure, string> = {
          'too-large': COPY.gallery.restoreTooLarge,
          'invalid-zip': COPY.gallery.restoreError,
          'missing-backup': COPY.gallery.restoreZipMissing,
          'duplicate-backup': COPY.gallery.restoreZipDuplicate,
          'read-error': COPY.gallery.restoreError,
        }
        showToast(messages[read.reason])
        return
      }
      const { assets: restored, warnings } = importPintaJson(read.text)
      if (restored.length === 0) {
        showToast(warnings[0] ?? COPY.gallery.restoreError)
        return
      }
      const bundledMap =
        restored.length === 2 &&
        restored.some(
          (asset) =>
            asset.kind === 'tilemap' &&
            restored.some(
              (candidate) => isTilesetKind(candidate) && candidate.id === asset.tilesetId,
            ),
        )
      const { added, skipped } = await gallery
        .getState()
        .importAssets(restored, { atomic: bundledMap })
      if (added === 0) {
        showToast(gallery.getState().mutateError ?? COPY.gallery.restoreError)
        return
      }
      const suffix = skipped > 0 || warnings.length > 0 ? COPY.gallery.restorePartial : ''
      showToast(
        (bundledMap && added === 2
          ? COPY.gallery.restoredMapBundle
          : added === 1
            ? COPY.gallery.restoredOne
            : COPY.gallery.restoredMany(added)) + suffix,
      )
    } catch {
      showToast(COPY.gallery.restoreError)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div
      // Em modo seleção o padding de BAIXO sai (a barra sticky o substitui):
      // o clamp do sticky é o content box do root, então qualquer pb deixaria
      // a barra flutuando esse tanto acima do rodapé (medido: 24px).
      className={`flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 ${
        selectionMode ? 'pb-0 sm:pb-0' : ''
      }`}
      data-pin-scroll-root=""
    >
      {/* Cabeçalho de SEÇÃO da comunidade (mesma escala de `/criar` e da home
          do kids): este é o título da página quando o Pinta está embarcado —
          por isso ele mora aqui e some sozinho ao abrir o editor. */}
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="pin-display text-3xl md:text-4xl">{COPY.gallery.title}</h1>
          <p className="mt-1 text-pin-muted text-sm md:text-base">{COPY.gallery.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={restoreRef}
            type="file"
            accept=".pinta.json,.json,.zip,application/json,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleRestore(file)
              event.target.value = ''
            }}
          />
          <Button
            variant="ghost"
            disabled={restoring}
            aria-busy={restoring}
            onClick={() => {
              // Importar muda a galeria por baixo das marcas: sai do modo
              // (mesma régua do "Criar novo").
              if (selectionMode) exitSelection()
              restoreRef.current?.click()
            }}
          >
            <Upload aria-hidden="true" className="size-4" />
            {restoring ? COPY.gallery.restoring : COPY.gallery.restore}
          </Button>
          <input
            ref={photoRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handlePhoto(file)
              event.target.value = ''
            }}
          />
          <Button
            variant="ghost"
            onClick={() => {
              if (selectionMode) exitSelection()
              photoRef.current?.click()
            }}
          >
            <ImageIcon aria-hidden="true" className="size-4" />
            {COPY.gallery.importImage}
          </Button>
          {assets.length > 0 && !selectionMode ? (
            <Button variant="ghost" onClick={enterSelection}>
              <SquareCheckBig aria-hidden="true" className="size-4" />
              {COPY.gallery.select}
            </Button>
          ) : null}
          {/* Some no modo seleção: ele desliza para a posição do "Selecionar"
              que acabou de desmontar (mesmo ícone) e baixa a galeria INTEIRA
              ignorando a marcação — a barra sticky é o comando do modo. */}
          {assets.length > 0 && !selectionMode ? (
            <Button variant="ghost" disabled={zipping} onClick={() => void handleDownloadAll()}>
              <Download aria-hidden="true" className="size-4" />
              {COPY.gallery.downloadAll}
            </Button>
          ) : null}
          <Button
            variant="primary"
            onClick={() => {
              // Criar navega ao editor e a galeria DESMONTA: sair do modo aqui
              // evita a marcação morrer em silêncio no meio do gesto.
              if (selectionMode) exitSelection()
              setCreateOpen(true)
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            {COPY.gallery.create}
          </Button>
        </div>
      </header>

      {syncing && loaded ? (
        // Sem `role="status"`: o contador da busca é o único status da tela (os testes o
        // procuram); isto é só um lembrete discreto de que mais desenhos podem chegar.
        <p className="text-pin-muted text-sm">{COPY.gallery.syncing}</p>
      ) : null}
      {loading && !loaded ? (
        <p className="py-12 text-center text-base text-pin-muted">{COPY.gallery.loading}</p>
      ) : null}

      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-base text-pin-muted">{loadError}</p>
          <Button onClick={() => void gallery.getState().load()}>{COPY.gallery.retry}</Button>
        </div>
      ) : null}

      {loaded && !loadError && assets.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="relative flex min-w-56 flex-1 items-center sm:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 size-4 text-pin-muted"
            />
            <input
              ref={searchRef}
              type="search"
              name="pinta-gallery-search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // Esc limpa (e o Dialog nunca está aberto aqui: o campo é da galeria).
                if (event.key === 'Escape' && query) {
                  event.preventDefault()
                  setQuery('')
                }
              }}
              aria-label={COPY.gallery.search}
              placeholder={COPY.gallery.searchPlaceholder}
              className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-bg py-2 pr-11 pl-10 text-base outline-none [&::-webkit-search-cancel-button]:appearance-none focus:border-pin-accent"
            />
            {query ? (
              <button
                type="button"
                aria-label={COPY.gallery.searchClear}
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
                className="absolute right-1 inline-flex size-9 items-center justify-center rounded-lg text-pin-muted hover:bg-pin-surface hover:text-pin-text"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </label>
          {searching ? (
            <p role="status" className="text-pin-muted text-sm">
              {COPY.gallery.searchCount(visibleAssets.length, assets.length)}
            </p>
          ) : null}
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
            <FilterChips<GalleryStyleFilter>
              label={COPY.gallery.filterStyle}
              value={filters.style}
              onChange={(style) => setFilters((f) => ({ ...f, style }))}
              options={[
                {
                  value: 'all',
                  label: COPY.gallery.filterAll,
                  aria: COPY.gallery.filterAria.allStyles,
                },
                {
                  value: 'pixel',
                  label: COPY.styles.pixel.title,
                  emoji: COPY.styles.pixel.emoji,
                  aria: COPY.gallery.filterAria.pixel,
                },
                {
                  value: 'vector',
                  label: COPY.styles.vector.title,
                  emoji: COPY.styles.vector.emoji,
                  aria: COPY.gallery.filterAria.vector,
                },
              ]}
            />
            <FilterChips<GalleryRoleFilter>
              label={COPY.gallery.filterRole}
              value={filters.role}
              onChange={(role) => setFilters((f) => ({ ...f, role }))}
              options={[
                {
                  value: 'all',
                  label: COPY.gallery.filterAll,
                  aria: COPY.gallery.filterAria.allRoles,
                },
                {
                  value: 'sprite',
                  label: COPY.gallery.filterRoles.sprite,
                  emoji: COPY.kinds['pixel-sprite'].emoji,
                  aria: COPY.gallery.filterAria.sprite,
                },
                {
                  value: 'background',
                  label: COPY.gallery.filterRoles.background,
                  emoji: COPY.kinds['pixel-background'].emoji,
                  aria: COPY.gallery.filterAria.background,
                },
                {
                  value: 'tileset',
                  label: COPY.gallery.filterRoles.tileset,
                  emoji: COPY.kinds.tileset.emoji,
                  aria: COPY.gallery.filterAria.tileset,
                },
                {
                  value: 'tilemap',
                  label: COPY.gallery.filterRoles.tilemap,
                  emoji: COPY.kinds.tilemap.emoji,
                  aria: COPY.gallery.filterAria.tilemap,
                },
              ]}
            />
          </div>
        </div>
      ) : null}

      {loaded && !loadError && searching && visibleAssets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="max-w-md text-base text-pin-muted">{COPY.gallery.searchEmpty}</p>
          <Button variant="ghost" onClick={clearFilters}>
            {COPY.gallery.searchClearAll}
          </Button>
        </div>
      ) : null}

      {loaded && !loadError && assets.length === 0 ? (
        // Onboarding do primeiro uso: convite grande + CTA próprio (rótulo
        // distinto do "Criar novo" do header p/ não colidir com o getByRole).
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span aria-hidden="true" className="text-5xl">
            🎨
          </span>
          <p className="max-w-md text-base text-pin-muted">{COPY.gallery.empty}</p>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Sparkles aria-hidden="true" className="size-4" />
            {COPY.gallery.emptyCta}
          </Button>
        </div>
      ) : null}

      {projectSections.length === 0 ? (
        <div className={GALLERY_GRID_CLASS}>{visibleAssets.map(renderCard)}</div>
      ) : (
        // Seções por jogo do Pensa (desenhos com projectRef) + avulsos no fim.
        <div className="flex flex-col gap-6">
          {projectSections.map(([projectId, section]) => (
            <section key={projectId} aria-label={section.name}>
              <h2 className="pin-display mb-2 text-lg">
                <span aria-hidden="true">🎮 </span>
                {section.name}
              </h2>
              <div className={GALLERY_GRID_CLASS}>{section.assets.map(renderCard)}</div>
            </section>
          ))}
          {looseAssets.length > 0 ? (
            <section aria-label={COPY.gallery.looseSection}>
              <h2 className="pin-display mb-2 text-lg text-pin-muted">
                {COPY.gallery.looseSection}
              </h2>
              <div className={GALLERY_GRID_CLASS}>{looseAssets.map(renderCard)}</div>
            </section>
          ) : null}
        </div>
      )}

      {selectionMode ? (
        <>
          {/* Espaçador flex: com galeria CURTA (sem rolagem interna) o mt-auto
              absorve a sobra da coluna e a barra ASSENTA no rodapé do rolável
              (sem ele, o sticky ficava solto logo abaixo da grade — pedido dela
              26/08). Com rolagem ele vira 0 e o sticky faz o de sempre; o mt-4
              da barra preserva o respiro no fim do scroll. */}
          <div aria-hidden="true" className="mt-auto" />
          {/* Barra do pack: STICKY no rodapé do scroll root (o header ROLA com o
              conteúdo — a barra não pode sumir junto). As margens negativas cobrem
              o padding do root para o fundo ir de borda a borda. O contador NÃO é
              role=status: o da busca é o único status da tela. */}
          <div className="-mx-4 sm:-mx-6 sticky bottom-0 z-10 mt-4 border-t-2 border-pin-border bg-pin-surface px-4 py-2 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-sm">{COPY.gallery.selectionCount(selectedCount)}</p>
              <div className="flex items-center gap-2">
                {/* Desmarca tudo e PERMANECE no modo (recomeçar a escolha);
                  quem sai do modo é o Cancelar ao lado. */}
                <Button
                  variant="ghost"
                  disabled={selectedCount === 0}
                  onClick={(event) => {
                    clearSelection()
                    // Com 0 marcados este botão vira disabled e o navegador
                    // derrubaria o foco no body (criança de teclado se perde):
                    // manda para o Cancelar, o irmão SEGUINTE nesta barra.
                    const next = event.currentTarget.nextElementSibling
                    if (next instanceof HTMLElement) next.focus()
                  }}
                >
                  {COPY.gallery.selectionClear}
                </Button>
                <Button variant="ghost" onClick={exitSelection}>
                  {COPY.gallery.cancel}
                </Button>
                <Button
                  variant="primary"
                  disabled={zipping || selectedCount === 0}
                  aria-busy={zipping}
                  onClick={() => void handleDownloadSelection()}
                >
                  <Download aria-hidden="true" className="size-4" />
                  {COPY.gallery.downloadSelection}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Montado só quando aberto: o passo de estilo nasce do lastStyle ATUAL. */}
      <NewAssetDialog
        key={String(createOpen)}
        open={createOpen}
        tilesets={tilesets}
        takenNames={takenNames}
        creating={creating}
        initialStyle={intent?.style && intent.style !== 'either' ? intent.style : lastStyle}
        initialRole={intent?.artKind ?? null}
        initialName={intent?.artKind ? suggestName(intent.artKind, takenNames) : ''}
        projectName={intent?.projectRef.name ?? null}
        onClose={() => {
          // Fechar descarta o intent: o próximo "Criar novo" volta ao normal.
          setIntent(null)
          setCreateOpen(false)
        }}
        onCreate={(input) => {
          setCreating(true)
          const projectRef = intent?.projectRef
          void gallery
            .getState()
            .create(projectRef ? { ...input, projectRef } : input)
            .then((asset) => {
              setCreating(false)
              if (asset) {
                setIntent(null)
                setCreateOpen(false)
                setJustCreatedId(asset.id)
                openAsset(asset.id)
              } else {
                // Sempre avisa (fallback) — nunca clique-morto se o create falhar.
                showToast(gallery.getState().mutateError ?? COPY.editor.saveError)
              }
            })
        }}
        onCreateFromTemplate={(input) => {
          setCreating(true)
          void gallery
            .getState()
            .createFromTemplate({ ...input, projectRef: intent?.projectRef })
            .then((asset) => {
              setCreating(false)
              if (asset) {
                setIntent(null)
                setCreateOpen(false)
                setJustCreatedId(asset.id)
                openAsset(asset.id)
              } else {
                // Sempre avisa (fallback) — nunca clique-morto se o create falhar.
                showToast(gallery.getState().mutateError ?? COPY.editor.saveError)
              }
            })
        }}
      />

      {importImage !== null ? (
        // Enquanto o diálogo (pedaço separado do bundle) carrega: um aviso, não tela morta.
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="pin-panel px-5 py-3 font-bold text-pin-fg">
                {COPY.importImage.loading}
              </div>
            </div>
          }
        >
          <LazyImportImageDialog
            open
            image={importImage}
            onClose={() => setImportImage(null)}
            onImport={(asset) => {
              void gallery
                .getState()
                .importAssets([asset])
                .then(({ added }) => {
                  showToast(
                    added > 0
                      ? COPY.gallery.importDone
                      : (gallery.getState().mutateError ?? COPY.gallery.importDecodeError),
                  )
                })
            }}
          />
        </Suspense>
      ) : null}

      <Dialog
        open={renameTarget !== null}
        onClose={() => setRenameId(null)}
        title={COPY.gallery.rename}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (!renameTarget) return
            void gallery
              .getState()
              .rename(renameTarget.id, renameValue)
              .then((ok) => {
                if (ok) {
                  setRenameId(null)
                } else {
                  const error = gallery.getState().mutateError
                  if (error) showToast(error)
                }
              })
          }}
        >
          <input
            name="pinta-asset-name"
            autoComplete="off"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            aria-label={COPY.newAsset.nameTitle}
            className="min-h-11 rounded-xl border-2 border-pin-border bg-pin-bg px-4 text-base outline-none focus:border-pin-accent"
          />
          <p className="text-sm text-pin-muted">{COPY.newAsset.nameHelp}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameId(null)}>
              {COPY.gallery.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {COPY.gallery.rename}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveId(null)}
        title={
          dependentMaps.length > 0
            ? COPY.gallery.removeTilesetTitle
            : COPY.gallery.removeConfirmTitle
        }
      >
        <p className="text-base text-pin-muted">
          {dependentMaps.length > 0
            ? COPY.gallery.removeTilesetBody
            : COPY.gallery.removeConfirmBody}
        </p>
        {dependentMaps.length > 0 ? (
          <ul className="mt-3 list-inside list-disc text-pin-text text-sm">
            {dependentMaps.map((map) => (
              <li key={map.id}>{map.name}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoveId(null)}>
            {COPY.gallery.cancel}
          </Button>
          {dependentMaps.length === 0 ? (
            <Button
              variant="danger"
              onClick={() => {
                if (!removeTarget) return
                void gallery
                  .getState()
                  .remove(removeTarget.id)
                  .then((ok) => {
                    if (ok) setRemoveId(null)
                    else showToast(gallery.getState().mutateError ?? COPY.editor.saveError)
                  })
              }}
            >
              {COPY.gallery.removeConfirm}
            </Button>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}

/**
 * Uma fileira de chips exclusivos (rádio): "Todos" + as opções. `aria-pressed` diz qual está
 * ligado; alvo de 36px (a galeria é densa, mas o dedo da criança precisa acertar).
 */
function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string; emoji?: string; aria: string }>
  onChange: (value: T) => void
}): JSX.Element {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0">
      <legend className="mr-1 text-pin-muted text-xs uppercase tracking-wide">{label}</legend>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.aria}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-9 items-center gap-1 rounded-full border-2 px-3 font-bold text-sm transition-colors ${
              active
                ? 'border-pin-accent bg-pin-accent text-pin-accent-fg'
                : 'border-pin-border bg-pin-surface text-pin-text hover:border-pin-accent'
            }`}
          >
            {option.emoji ? <span aria-hidden="true">{option.emoji}</span> : null}
            {option.label}
          </button>
        )
      })}
    </fieldset>
  )
}
