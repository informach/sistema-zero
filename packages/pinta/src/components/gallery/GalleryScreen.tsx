/**
 * Tela inicial: a galeria de desenhos do perfil. CRUD completo (criar em 3
 * passos, renomear, duplicar, apagar com confirmação) + estados de
 * carregando/vazio/erro com retry.
 *
 * ⭐ 11/09/2026: o desenho das telas-modelo, o MESMO da galeria "Meus Jogos" do Estúdio: três
 * faixas de borda a borda que rolam juntas (creme com o cabeçalho de duas linhas, céu com a
 * grade e o cartão "Criar novo" na frente, lilás com o cartão de fechamento). As receitas
 * `sz-tool-*` vêm de `@sistemazero/ui/tool-chrome.css`, que o host importa (kids, playground).
 */
import type { JSX } from 'react'
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
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
import type { PintaHostChromeStatus, PintaInitialIntent } from '../../core/types'
import { type PintaBackupReadFailure, readPintaBackupFile } from '../../export/backupFile'
import { triggerDownload } from '../../export/download'
import { importPintaJson } from '../../export/projectJson'
import { zipGallery } from '../../export/zip'
import { decodeImageFile, IMPORT_ACCEPT, MAX_IMAGE_FILE_BYTES } from '../../import/decodeImage'
import type { RGBAImage } from '../../import/quantize'
import { usePintaApp, usePintaGallery } from '../appContext'
import { HostBackLink, HostCloudStatus, HostMenuButton, usePintaHostChrome } from '../hostChrome'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  Download,
  Grid3x3,
  Image as ImageIcon,
  type LucideIcon,
  Map as MapIcon,
  Palette,
  PersonStanding,
  Plus,
  Puzzle,
  Search,
  Shapes,
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
 * Grade da galeria: a `.sz-tool-grid` COMPARTILHADA (11/09/2026), a mesma da galeria "Meus
 * Jogos" do Estúdio: `auto-fill` de 13,75rem, 4 colunas de ~246px a 1440px com o menu aberto
 * (a imagem-modelo) e mais colunas, não cartões mais largos, conforme a tela cresce. Era uma
 * grade própria de 164px (o piso das três ações de 44px, que cabem folgadas agora).
 */
const GALLERY_GRID_CLASS = 'sz-tool-grid'

/** Uma opção dos chips de filtro: rótulo visível, ícone de linha e o nome acessível. */
interface FilterOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  aria: string
}

/**
 * Os chips com os ÍCONES DE LINHA da imagem-modelo (os emojis saíram, como no Estúdio); o
 * "Todos" fica sem ícone. Constantes de módulo: a lista não muda de um render para o outro.
 */
const STYLE_FILTER_OPTIONS: ReadonlyArray<FilterOption<GalleryStyleFilter>> = [
  { value: 'all', label: COPY.gallery.filterAll, aria: COPY.gallery.filterAria.allStyles },
  {
    value: 'pixel',
    label: COPY.styles.pixel.title,
    icon: Grid3x3,
    aria: COPY.gallery.filterAria.pixel,
  },
  {
    value: 'vector',
    label: COPY.styles.vector.title,
    icon: Shapes,
    aria: COPY.gallery.filterAria.vector,
  },
]

const ROLE_FILTER_OPTIONS: ReadonlyArray<FilterOption<GalleryRoleFilter>> = [
  { value: 'all', label: COPY.gallery.filterAll, aria: COPY.gallery.filterAria.allRoles },
  {
    value: 'sprite',
    label: COPY.gallery.filterRoles.sprite,
    icon: PersonStanding,
    aria: COPY.gallery.filterAria.sprite,
  },
  {
    value: 'background',
    label: COPY.gallery.filterRoles.background,
    icon: ImageIcon,
    aria: COPY.gallery.filterAria.background,
  },
  {
    value: 'tileset',
    label: COPY.gallery.filterRoles.tileset,
    icon: Puzzle,
    aria: COPY.gallery.filterAria.tileset,
  },
  {
    value: 'tilemap',
    label: COPY.gallery.filterRoles.tilemap,
    icon: MapIcon,
    aria: COPY.gallery.filterAria.tilemap,
  },
]

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
  const hostChrome = usePintaHostChrome()
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
    // restauro recusaria o mapa. O snapshot também congela a IDENTIDADE da
    // marcação no clique: se a criança mexer na seleção durante um zip demorado
    // (Limpar, Cancelar + recomeçar, marcar mais um), o auto-fechar do sucesso
    // NÃO pode engolir a sessão nova — todo toggle cria um Set novo, então
    // identidade igual = ninguém tocou.
    const markedAtClick = captureSelection()
    const expanded = expandSelection(gallery.getState().assets, markedAtClick.ids)
    if (expanded.assets.length === 0) {
      // Corrida rara (a nuvem removeu os marcados entre o render e o clique):
      // avisa em vez de um clique-morto silencioso.
      showToast(COPY.gallery.drawingGone)
      return
    }
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

  // A pílula do cabeçalho diz o que acontece AGORA (o selo do host) ou, em repouso, que a nuvem
  // da conta está ligada: a imagem-modelo mostra "Guardado na sua conta" sem nada acontecendo.
  // Fora do community-kids o `hostChrome` é `null` e nada disso aparece.
  const headerPill: PintaHostChromeStatus | null =
    hostChrome?.status ??
    (hostChrome?.account
      ? {
          tone: 'ok',
          icon: 'cloud',
          label: hostChrome.account.label,
          text: hostChrome.account.label,
        }
      : null)
  // O cartão da faixa lilás diz ONDE os desenhos estão: na conta (com a nuvem ligada) ou só
  // neste aparelho. Nunca promete a nuvem que não existe.
  const savedText = hostChrome?.account
    ? COPY.gallery.savedAccount(assets.length)
    : COPY.gallery.savedDevice(assets.length)
  const savedTitleId = useId()
  const ready = loaded && !loadError

  // Importar muda a galeria por baixo das marcas: sai do modo (mesma régua do "Criar novo").
  const openRestore = (): void => {
    if (selectionMode) exitSelection()
    restoreRef.current?.click()
  }
  const openPhoto = (): void => {
    if (selectionMode) exitSelection()
    photoRef.current?.click()
  }
  // Criar navega ao editor e a galeria DESMONTA: sair do modo aqui evita a marcação morrer em
  // silêncio no meio do gesto.
  const openCreate = (): void => {
    if (selectionMode) exitSelection()
    setCreateOpen(true)
  }

  // O cartão "Criar novo" que abre a grade (a imagem-modelo): creme com o fio amarelo e o "+"
  // num círculo amarelo. É um BOTÃO de verdade, com nome próprio (título + dica), diferente do
  // "Criar novo" do cabeçalho, que os testes acham pelo nome exato. Some com busca ou filtro (no
  // meio de um resultado ele seria ruído). No modo seleção ele FICA, desligado, pela mesma régua
  // das ações dos cartões: sumir faria todos os desenhos andarem uma casa na grade justo quando
  // a criança vai tocar neles.
  // `min-h-40` e não a altura do cartão: numa fileira com desenhos a grade o estica até eles;
  // sozinho (a galeria vazia) ele não precisa de 326px vazios.
  const showNewCard = ready && !searching
  const newCard = showNewCard ? (
    <button
      type="button"
      className="sz-tool-card sz-tool-card--new min-h-40"
      disabled={selectionMode}
      onClick={openCreate}
    >
      <span className="sz-tool-new-dot" aria-hidden="true">
        <Plus />
      </span>
      <span className="sz-tool-card-title text-base">{COPY.gallery.create}</span>
      <span className="font-semibold text-pin-muted text-xs">{COPY.gallery.newCardHint}</span>
    </button>
  ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* A área que ROLA: as três faixas de borda a borda, que rolam juntas (o cabeçalho não fica
          preso em cima). A barra do modo seleção NÃO mora aqui dentro: ela é a irmã de baixo, e
          assim fica sempre no rodapé sem cobrir a última fileira e sem precisar de `sticky` (com a
          última faixa esticando até o pé, um `sticky` depois dela faria a galeria sempre rolar
          a altura da barra). */}
      <div data-pin-scroll-root="" className="min-h-0 flex-1 overflow-y-auto">
        <div className="sz-tool-bands">
          <header className="sz-tool-band sz-tool-band--creme">
            {/* 48px em cima e 36px embaixo a partir de 1024px: o respiro medido na imagem (o
                título desce um pouco mais que o das outras faixas), igual ao Estúdio. */}
            <div className="sz-tool-band__inner lg:pt-12 lg:pb-9">
              {/* Linha 1: [menu][voltar] + título e subtítulo à esquerda; à direita o que a
                  imagem-modelo tem ali: o selo, o importar ("Trazer foto") e o "Criar novo". O
                  "Selecionar", o "Baixar tudo" e o "Trazer de volta" moram no cartão lilás do
                  fim (o arquivo dos desenhos: levar e trazer). Este é o título da página quando
                  o Pinta está embarcado, por isso mora aqui e some ao abrir o editor. */}
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
                  {/* Os dois campos de arquivo moram aqui, SEMPRE montados: o do "Trazer de
                      volta" é acionado pelo botão do cartão lilás, que só existe com a galeria
                      carregada. */}
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
                  <Button variant="pill" onClick={openPhoto}>
                    <ImageIcon aria-hidden="true" />
                    {COPY.gallery.importImage}
                  </Button>
                  <Button variant="pillPrimary" onClick={openCreate}>
                    <Plus aria-hidden="true" />
                    {COPY.gallery.create}
                  </Button>
                </div>
              </div>

              {ready && assets.length > 0 ? (
                // Linha 2, 28px abaixo do título (a imagem): os dois trilhos de chips à esquerda
                // (com a legend VISÍVEL: dois "Todos" precisam de nome), o contador (só ao
                // buscar; o ÚNICO `role="status"` da galeria) e a busca à direita.
                <div className="sz-tool-toolbar mt-7">
                  <div className="sz-tool-toolbar__start">
                    <FilterChips<GalleryStyleFilter>
                      label={COPY.gallery.filterStyle}
                      value={filters.style}
                      onChange={(style) => setFilters((f) => ({ ...f, style }))}
                      options={STYLE_FILTER_OPTIONS}
                    />
                    <FilterChips<GalleryRoleFilter>
                      label={COPY.gallery.filterRole}
                      value={filters.role}
                      onChange={(role) => setFilters((f) => ({ ...f, role }))}
                      options={ROLE_FILTER_OPTIONS}
                    />
                  </div>
                  <div className="sz-tool-toolbar__end">
                    {searching ? (
                      <p role="status" className="font-semibold text-pin-muted text-sm">
                        {COPY.gallery.searchCount(visibleAssets.length, assets.length)}
                      </p>
                    ) : null}
                    <label className="sz-tool-search-wrap">
                      <Search aria-hidden="true" />
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
                        className="sz-tool-search pr-11"
                      />
                      {query ? (
                        <button
                          type="button"
                          aria-label={COPY.gallery.searchClear}
                          onClick={() => {
                            setQuery('')
                            searchRef.current?.focus()
                          }}
                          className="absolute right-1 inline-flex size-9 items-center justify-center rounded-full text-pin-muted hover:bg-pin-border/40 hover:text-pin-text"
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

          <div className="sz-tool-band sz-tool-band--ceu">
            <div className="sz-tool-band__inner">
              {syncing && loaded && !hostChrome?.status ? (
                // Sem `role="status"`: o contador da busca é o único status da tela (os testes o
                // procuram); isto é só um lembrete discreto de que mais desenhos podem chegar.
                // Com o selo do host no cabeçalho ("Buscando…"), a linha some: seria dito 2×.
                <p className="mb-5 font-semibold text-pin-muted text-sm">{COPY.gallery.syncing}</p>
              ) : null}
              {loading && !loaded ? (
                <p className="py-12 text-center font-semibold text-base text-pin-muted">
                  {COPY.gallery.loading}
                </p>
              ) : null}

              {loadError ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <p className="font-semibold text-base text-pin-muted">{loadError}</p>
                  <Button variant="pillPrimary" onClick={() => void gallery.getState().load()}>
                    {COPY.gallery.retry}
                  </Button>
                </div>
              ) : null}

              {ready && assets.length > 0 && searching && visibleAssets.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="font-semibold text-base text-pin-muted">
                    {COPY.gallery.searchEmpty}
                  </p>
                  <Button variant="pill" onClick={clearFilters}>
                    {COPY.gallery.searchClearAll}
                  </Button>
                </div>
              ) : null}

              {ready && assets.length === 0 ? (
                // Primeiro uso: o recado e o cartão "Criar novo" sozinho na grade (o convite que
                // antes era um botão grande no meio da tela).
                <div className="flex flex-col gap-6">
                  <p className="font-semibold text-base text-pin-muted">{COPY.gallery.empty}</p>
                  {newCard ? <div className={GALLERY_GRID_CLASS}>{newCard}</div> : null}
                </div>
              ) : projectSections.length === 0 ? (
                newCard || visibleAssets.length > 0 ? (
                  <div className={GALLERY_GRID_CLASS}>
                    {newCard}
                    {visibleAssets.map(renderCard)}
                  </div>
                ) : null
              ) : (
                // Seções por jogo do Pensa (desenhos com projectRef) + avulsos no fim. O cartão
                // "Criar novo" mora nos AVULSOS: é lá que o desenho novo vai aparecer.
                <div className="flex flex-col gap-8">
                  {projectSections.map(([projectId, section]) => (
                    <section key={projectId} aria-label={section.name}>
                      <h2 className="sz-tool-card-title mb-3 text-lg">
                        <span aria-hidden="true">🎮 </span>
                        {section.name}
                      </h2>
                      <div className={GALLERY_GRID_CLASS}>{section.assets.map(renderCard)}</div>
                    </section>
                  ))}
                  {newCard || looseAssets.length > 0 ? (
                    <section aria-label={COPY.gallery.looseSection}>
                      <h2 className="sz-tool-card-title mb-3 text-lg text-pin-muted">
                        {COPY.gallery.looseSection}
                      </h2>
                      <div className={GALLERY_GRID_CLASS}>
                        {newCard}
                        {looseAssets.map(renderCard)}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* O fechamento da página (faixa lilás): ONDE os desenhos estão e o que se faz com o
              arquivo deles, levar (tudo ou só os escolhidos) e trazer de volta. Os três saíram do
              cabeçalho para ele ficar como o da imagem-modelo (o selo, "Trazer foto" e o "Criar
              novo"), como no Molda. Com a galeria VAZIA ele também aparece: num aparelho novo,
              trazer os desenhos de volta é justamente o primeiro passo. */}
          {ready ? (
            <section aria-labelledby={savedTitleId} className="sz-tool-band sz-tool-band--lilas">
              <div className="sz-tool-band__inner">
                <div className="sz-tool-cta-card">
                  <span className="sz-tool-tile sz-tool-tile--new" aria-hidden="true">
                    <Palette />
                  </span>
                  <div className="sz-tool-cta-card__body">
                    <h2 id={savedTitleId} className="sz-tool-cta-card__title">
                      {savedText}
                    </h2>
                    <p className="sz-tool-cta-card__text">{COPY.gallery.savedHint}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {assets.length > 0 && !selectionMode ? (
                      <Button variant="pillSoft" onClick={enterSelection}>
                        <SquareCheckBig aria-hidden="true" />
                        {COPY.gallery.select}
                      </Button>
                    ) : null}
                    {/* Some no modo seleção: ele deslizaria para a posição do "Selecionar" que
                        acabou de desmontar (mesmo ícone) e baixaria a galeria INTEIRA ignorando
                        a marcação. A barra do modo é o comando dele. */}
                    {assets.length > 0 && !selectionMode ? (
                      <Button
                        variant="pillSoft"
                        disabled={zipping}
                        onClick={() => void handleDownloadAll()}
                      >
                        <Download aria-hidden="true" />
                        {COPY.gallery.downloadAll}
                      </Button>
                    ) : null}
                    <Button
                      variant="pillSoft"
                      disabled={restoring}
                      aria-busy={restoring}
                      onClick={openRestore}
                    >
                      <Upload aria-hidden="true" />
                      {restoring ? COPY.gallery.restoring : COPY.gallery.restore}
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {selectionMode ? (
        // Barra do pack, IRMÃ de baixo da área que rola: fica sempre no rodapé, com a galeria
        // curta ou comprida, e nunca cobre a última fileira. O respiro dos lados é o das faixas
        // (16/32/64px). O contador NÃO é role=status: o da busca é o único status da tela.
        <div
          data-pin-selection-bar=""
          className="shrink-0 border-pin-border border-t bg-pin-surface px-4 py-2.5 md:px-8 lg:px-16"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold text-sm">{COPY.gallery.selectionCount(selectedCount)}</p>
            <div className="flex flex-wrap items-center gap-2">
              {/* Desmarca tudo e PERMANECE no modo (recomeçar a escolha); quem sai do modo é o
                  Cancelar ao lado. */}
              <Button
                variant="pill"
                disabled={selectedCount === 0}
                onClick={(event) => {
                  clearSelection()
                  // Com 0 marcados este botão vira disabled e o navegador derrubaria o foco no
                  // body (criança de teclado se perde): manda para o Cancelar, o irmão SEGUINTE
                  // nesta barra.
                  const next = event.currentTarget.nextElementSibling
                  if (next instanceof HTMLElement) next.focus()
                }}
              >
                {COPY.gallery.selectionClear}
              </Button>
              <Button variant="pill" onClick={exitSelection}>
                {COPY.gallery.cancel}
              </Button>
              <Button
                variant="pillPrimary"
                disabled={zipping || selectedCount === 0}
                aria-busy={zipping}
                onClick={() => void handleDownloadSelection()}
              >
                <Download aria-hidden="true" />
                {COPY.gallery.downloadSelection}
              </Button>
            </div>
          </div>
        </div>
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
 * ligado (o ativo é o azul da marca cheio); alvo de 40px no mouse e 44px no toque. A receita
 * (`.sz-tool-chips`/`.sz-tool-chip`) é a compartilhada com o Estúdio, e a legend fica INLINE
 * com os chips (a folha a flutua; sem isso o navegador a desenhava numa linha acima).
 */
function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: ReadonlyArray<FilterOption<T>>
  onChange: (value: T) => void
}): JSX.Element {
  return (
    <fieldset className="sz-tool-chips">
      <legend>{label}</legend>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          aria-label={option.aria}
          onClick={() => onChange(option.value)}
          className="sz-tool-chip"
        >
          {option.icon ? <option.icon aria-hidden="true" /> : null}
          {option.label}
        </button>
      ))}
    </fieldset>
  )
}
