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
import {
  IconAlert,
  IconCloud,
  IconCloudDownload,
  IconCloudOff,
  IconCloudUpload,
  IconSearch,
} from '#ui'
import { listProTemplates } from '../components/code/pro-templates'
import { HostMenuButton } from '../components/layout/HostMenuButton'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { ImportButton } from '../components/projects/ImportButton'
import {
  type NewProjectCreateOptions,
  NewProjectModal,
} from '../components/projects/NewProjectModal'
import { ProjectCard } from '../components/projects/ProjectCard'
import { perfMeasure, perfSpanAsync } from '../core/perf'
import {
  listAllProjects,
  loadProjectSummariesByIds,
  PROJECT_CHANGED_EVENT,
  PROJECT_THUMB_UPDATED_EVENT,
  type ProjectChangedDetail,
  type ProjectSummary,
} from '../state/persistence'
import { type ProjectSortOrder, useSettingsStore } from '../state/settingsStore'
import { type StudioHostChromeStatus, useStudioHostChrome } from '../studio/host-chrome'
import { useT } from '../studio/i18n'
import { type StudioTheme, StudioThemeProvider } from '../studio/theme'
import {
  matchesNormalizedName,
  matchesProjectMode,
  normalizeProjectSearchText,
  type ProjectModeFilter,
  projectSearchTerms,
} from './projectSearch'

/** Folga para juntar os ids que chegam em rajada (descida da nuvem) numa leitura só. */
const REFRESH_COALESCE_MS = 40

const LazyKitGallery = lazy(async () => {
  const module = await import('./KitGallery')
  return { default: module.KitGallery }
})

export interface ProjectListProps {
  /** Chamado quando um projeto deve abrir no editor (criado, importado ou clicado). */
  onOpenProject: (projectId: string) => void
  /** Habilita a criação de projetos profissionais (host com COOP/COEP). */
  professional?: boolean
  /** Extensões instaladas automaticamente num projeto básico novo. */
  initialExtensions?: readonly string[]
  /** Extensões que a carreira permite; usadas também pelo aviso de importação. */
  allowedExtensions?: readonly string[]
  /**
   * Tema FIXADO pelo host (ex.: a comunidade controla claro/escuro). Quando
   * definido, a lista segue ESTE tema e ESCONDE o botão de alternar — assim o
   * Estúdio embarcado não destoa do app ao redor. Ausente = preferência do
   * usuário (settingsStore), com o toggle visível (uso standalone/playground).
   */
  theme?: StudioTheme
  /**
   * Mostra a vitrine de "jogos prontos" (KitGallery) — os EXEMPLOS das extensões
   * + os clássicos. Default `false`: os exemplos são material de teste do admin e
   * podem estar desatualizados/com erro, então ficam escondidos para clientes; só
   * o playground local liga. Espelha `showExamples` do editor (a lista vive fora
   * do StudioCore, então recebe a flag por prop). Sem os kits, o estado vazio
   * mantém o "criar do zero".
   */
  showExamples?: boolean
}

/**
 * ⚠️ `auto-fill` + `minmax` no lugar de `sm:2 lg:3 xl:4`: com o teto de 4 colunas
 * o card ENGORDAVA conforme a tela crescia (~456px num monitor de 1920), porque
 * a largura sobrando era dividida entre sempre as mesmas 4 faixas. Agora a
 * largura do card fica estável (~250–290px) e é a QUANTIDADE de colunas que
 * acompanha a tela — é a mesma linha da galeria do Pinta (`GalleryScreen.tsx`,
 * `minmax(164px, 1fr)`), com o piso maior porque o card daqui tem `h-72` e nome,
 * data e ações. `auto-fill` (não `auto-fit`) mantém as faixas vazias de pé, então
 * dois projetos numa tela larga continuam com o tamanho de card, não de faixa.
 *
 * Piso medido, não chutado (largura da grade = viewport − 48px do px-6):
 * 1280→4 · 1366→5 · 1440→5 · 1600→6 · 1920→7 · 2560→9 colunas, com o card sempre
 * entre ~245 e ~300px. É o mesmo piso do `.pensa-project-grid`, de propósito: com
 * a mesma receita nos dois, os cards do Estúdio e do Pensa saem do mesmo tamanho
 * sem ninguém precisar sincronizar número mágico.
 * ⚠️ Os 240px vêm do PENSA, onde são conteúdo e não gosto: a linha de etapa mais
 * longa ("Versão 20 · Plano aprovado") exige 239px de card para não quebrar em
 * duas linhas. Aqui eles sobram — a data precisa de 215px —, mas o piso é comum
 * de propósito, senão as duas home voltam a ter cards de tamanhos diferentes.
 */
/** Um comparador por módulo (o `localeCompare(.., 'pt-BR')` criava um Collator por comparação). */
const COLLATOR = new Intl.Collator('pt-BR')

const PROJECT_GRID_CLASS = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]'

/** Ícone do selo de nuvem do host por estado (o vocabulário do `lib/host-chrome.ts` do kids). */
const HOST_STATUS_ICON: Record<StudioHostChromeStatus['icon'], typeof IconCloud> = {
  upload: IconCloudUpload,
  download: IconCloudDownload,
  cloud: IconCloud,
  offline: IconCloudOff,
  alert: IconAlert,
}

/**
 * "Guardado na sua conta" do host como a PÍLULA compartilhada (`.sz-tool-status`, a mesma do
 * Pinta). O `title` é o que dá NOME ao status para o leitor de tela; quem anuncia offline/erro
 * é a região viva do host (`aria-live="off"` aqui).
 */
function HostStatusPill({ status }: { status: StudioHostChromeStatus }): JSX.Element {
  const Icon = HOST_STATUS_ICON[status.icon]
  return (
    <span
      role="status"
      aria-live="off"
      title={status.text}
      className={`sz-tool-status sz-tool-status--${status.tone}`}
    >
      <Icon />
      {status.text}
    </span>
  )
}

export function ProjectList({
  onOpenProject,
  professional = false,
  initialExtensions,
  allowedExtensions,
  theme: themeProp,
  showExamples = false,
}: ProjectListProps): JSX.Element {
  const t = useT()
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null)
  const [search, setSearch] = useState('')
  // Filtro de modo (Blocos × Código): junto da busca, é o que mantém a lista navegável
  // sem teto de quantidade de projetos.
  const [modeFilter, setModeFilter] = useState<ProjectModeFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  // Vitrine de kits: aberta por padrão só no primeiro uso (lista vazia).
  const [kitsOpen, setKitsOpen] = useState(false)
  // A lista vive FORA do <Studio>, então aplica o tema por conta própria: o host
  // pode FIXAR o tema (`themeProp`); senão cai na preferência do settingsStore
  // (singleton compartilhado com o editor), carregada no mount.
  const settingsTheme = useSettingsStore((s) => s.theme)
  const theme = themeProp ?? settingsTheme
  const loadSettings = useSettingsStore((s) => s.load)

  /**
   * Atualização INCREMENTAL: relê só os projetos que mudaram (capa pronta, renomear,
   * duplicar, apagar, restauro da nuvem) em vez de reler meta + capa de TODOS (1,5–12 MB
   * com centenas de projetos). Os ids chegam por evento e são drenados juntos, num
   * `getMany` só; sem id (caminhos antigos) cai no `reload()` completo.
   *
   * Enquanto a PRIMEIRA leitura da lista está em voo (`projects === null`), os ids que
   * chegam — a descida da nuvem começa antes de a lista montar — não podem ser jogados fora:
   * o `keys()` daquela leitura é anterior à gravação, e sem isto o jogo restaurado só
   * aparecia no F5. Ficam em `missedIds` e são reaplicados logo depois do `reload()`.
   */
  const pendingIds = useRef<Set<string> | null>(null)
  const missedIds = useRef<Set<string>>(new Set())
  const reloadRef = useRef<() => Promise<void>>(async () => {})
  const refreshProjects = useCallback(async (ids: ReadonlySet<string>) => {
    const list = [...ids]
    let fresh: Array<ProjectSummary | null>
    try {
      fresh = await loadProjectSummariesByIds(list)
    } catch {
      // Leitura incremental falhou: volta para a leitura completa (o card não fica velho).
      void reloadRef.current()
      return
    }
    setProjects((current) => {
      if (!current) {
        for (const id of list) missedIds.current.add(id)
        return current
      }
      const byId = new Map(current.map((p) => [p.id, p]))
      list.forEach((id, index) => {
        const summary = fresh[index]
        if (summary) byId.set(id, summary)
        else byId.delete(id)
      })
      return [...byId.values()]
    })
  }, [])
  const reload = useCallback(async () => {
    const list = await perfSpanAsync('studio:list:load', () => listAllProjects())
    setProjects(list)
    // O que mudou DURANTE a leitura (restauro da nuvem, capa) entra por cima agora.
    const missed = missedIds.current
    if (missed.size > 0) {
      missedIds.current = new Set()
      await refreshProjects(missed)
    }
  }, [refreshProjects])
  reloadRef.current = reload

  useEffect(() => {
    void reload()
  }, [reload])

  // Medição: do início da leitura até a PRIMEIRA renderização com os cards (uma vez).
  const renderedMeasured = useRef(false)
  useEffect(() => {
    if (projects !== null && !renderedMeasured.current) {
      renderedMeasured.current = true
      perfMeasure('studio:list:rendered', 'studio:list:load:start')
    }
  }, [projects])

  const refreshProject = useCallback(
    (id: string | undefined) => {
      if (!id) {
        void reload()
        return
      }
      if (!pendingIds.current) {
        pendingIds.current = new Set([id])
        // Coalesce numa folga curta (não em rAF: em aba oculta o rAF não dispara e os ids
        // ficavam presos; uma descida traz vários ids em sequência).
        setTimeout(() => {
          const ids = pendingIds.current
          pendingIds.current = null
          if (ids) void refreshProjects(ids)
        }, REFRESH_COALESCE_MS)
        return
      }
      pendingIds.current.add(id)
    },
    [reload, refreshProjects],
  )

  // A miniatura é gravada em 2º plano DEPOIS que o aluno volta à lista (captura
  // fire-and-forget do exit) — e toda escrita local avisa `PROJECT_CHANGED_EVENT`
  // (inclusive o restauro da nuvem): a lista ganha/atualiza SÓ aquele card.
  useEffect(() => {
    const onThumb = (event: Event) =>
      refreshProject(
        typeof (event as CustomEvent).detail === 'string'
          ? (event as CustomEvent<string>).detail
          : undefined,
      )
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<ProjectChangedDetail | undefined>).detail
      refreshProject(detail?.id)
    }
    window.addEventListener(PROJECT_THUMB_UPDATED_EVENT, onThumb)
    window.addEventListener(PROJECT_CHANGED_EVENT, onChanged)
    return () => {
      window.removeEventListener(PROJECT_THUMB_UPDATED_EVENT, onThumb)
      window.removeEventListener(PROJECT_CHANGED_EVENT, onChanged)
    }
  }, [refreshProject])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const projectSort = useSettingsStore((s) => s.projectSort)
  const setProjectSort = useSettingsStore((s) => s.setProjectSort)

  // O campo responde na hora; a filtragem usa o valor ADIADO (React desprioriza a lista de
  // centenas de cards enquanto a criança ainda digita).
  const deferredSearch = useDeferredValue(search)
  // Índice de busca: o nome normalizado UMA vez por projeto (não N vezes por tecla).
  const searchIndex = useMemo(
    () => (projects ?? []).map((p) => ({ p, text: normalizeProjectSearchText(p.name) })),
    [projects],
  )
  const searchTerms = useMemo(() => projectSearchTerms(deferredSearch), [deferredSearch])
  const filtered = useMemo(() => {
    if (!projects) return null
    // Busca com a mesma régua do Pinta (sem acento, minúsculas, vários termos) + modo.
    const base = searchIndex
      .filter(
        ({ p, text }) =>
          matchesProjectMode(p.mode, modeFilter) && matchesNormalizedName(text, searchTerms),
      )
      .map(({ p }) => p)
    if (projectSort === 'name') base.sort((a, b) => COLLATOR.compare(a.name, b.name))
    else base.sort((a, b) => b.updatedAt - a.updatedAt)
    return base
  }, [projects, searchIndex, searchTerms, modeFilter, projectSort])
  // Filtro ATIVO = há termos de busca de verdade (só símbolos, "!!!", normalizam para nada e
  // casam tudo — não é filtro) ou um modo escolhido.
  const filtering = searchTerms.length > 0 || modeFilter !== 'all'
  const clearFilters = () => {
    setSearch('')
    setModeFilter('all')
  }

  const defaultName = useMemo(() => {
    const base = 'Meu projeto'
    if (!projects?.length) return base
    const used = new Set(projects.map((p) => p.name))
    let n = projects.length + 1
    while (used.has(`${base} ${n}`)) n++
    return `${base} ${n}`
  }, [projects])

  // Nomes em uso: memoizados pelo CONJUNTO de nomes (não pela lista), senão cada atualização
  // incremental (uma capa pronta) trocava a referência e re-renderizava TODOS os cards.
  const namesKey = useMemo(
    () =>
      (projects ?? [])
        .map((p) => p.name)
        .sort()
        .join('\u0000'),
    [projects],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: `namesKey` é a chave derivada de `projects`.
  const existingNames = useMemo(() => (projects ?? []).map((p) => p.name), [namesKey])
  const takenNames = useMemo(() => new Set(existingNames), [existingNames])

  // Referência estável: inline, `listProTemplates()` novo a cada render entraria
  // nas deps do reset do modal e apagaria o nome enquanto a criança digita.
  const templates = useMemo(() => (professional ? listProTemplates() : undefined), [professional])

  const handleCreate = async (name: string, opts?: NewProjectCreateOptions) => {
    const { useProjectStore } = await import('../state/projectStore')
    const { createProject, createProProject } = useProjectStore.getState()
    const created =
      opts?.kind === 'pro'
        ? await createProProject(name, opts.templateId)
        : await createProject(name, initialExtensions)
    setModalOpen(false)
    onOpenProject(created.id)
  }

  const handleImported = (id: string) => {
    onOpenProject(id)
  }

  // Botão do menu lateral + selo "Guardado na sua conta" do host (community-kids); null fora dele.
  const hostChrome = useStudioHostChrome()
  const hasProjects = Boolean(projects && projects.length > 0)
  // O painel dos kits abre entre a linha de ferramentas e a grade; "Precisa de ajuda para
  // começar?" (rodapé) abre e rola até ele.
  const kitsRef = useRef<HTMLDivElement | null>(null)
  const openKits = () => {
    setKitsOpen(true)
    requestAnimationFrame(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      kitsRef.current?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    })
  }
  // "Mostrando N de M projetos": permanente como frase no rodapé; `role="status"` SÓ quando
  // filtra (a régua dos testes: um status ao filtrar, nenhum sem filtro).
  const countText =
    filtered && projects
      ? filtered.length === 1
        ? t('projects.searchCountOne', { total: projects.length })
        : t('projects.searchCount', { shown: filtered.length, total: projects.length })
      : ''

  return (
    <StudioThemeProvider value={theme}>
      <div
        data-sz-theme={theme}
        className="flex h-full flex-col bg-sz-bg text-sz-fg"
        style={{ fontFamily: 'var(--font-family-sans)' }}
      >
        {/* Cabeçalho de DUAS linhas (07/09/2026, imagem-modelo dela), o MESMO do Pinta e do
            Pensa: linha 1 = menu do host + título/subtítulo à esquerda, selo/tema/Importar/
            "+ Novo projeto" à direita; linha 2 (no <main>) = filtros + jogos prontos à esquerda,
            busca + ordenação à direita. As receitas `sz-tool-*` vêm de
            `@sistemazero/ui/tool-chrome.css` (o host importa; ver docs/embedding.md). */}
        <header className="sz-tool-header px-6 pt-4 pb-3">
          {/* O botão do menu da comunidade (host) vem ANTES do título, alinhado à linha do h1. */}
          <div className="sz-tool-header__lead">
            {hostChrome?.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
            <div className="sz-tool-header__title">
              <h1 className="sz-ui-display text-3xl md:text-4xl">{t('projects.heroTitle')}</h1>
              <p className="mt-1 text-sm text-sz-fg-soft md:text-base">{t('projects.subtitle')}</p>
            </div>
          </div>
          <div className="sz-tool-header__actions">
            {hostChrome?.status ? <HostStatusPill status={hostChrome.status} /> : null}
            {themeProp === undefined && <ThemeToggle className="sz-tool-btn sz-tool-btn--icon" />}
            <ImportButton onImported={handleImported} allowedExtensions={allowedExtensions} />
            <button type="button" className="sz-tool-btn-3d" onClick={() => setModalOpen(true)}>
              + {t('projects.new')}
            </button>
          </div>
        </header>

        {/* Largura TOTAL, como a galeria do Pinta (sem teto de max-w). */}
        <main className="flex-1 overflow-auto px-6 pb-6">
          <div>
            {/* O heading da seção segue no DOM para o leitor de tela; visualmente o título da
                página já diz tudo (um "Meus projetos" a 20px de "Meus Jogos" era o cabeçalho
                ocupando espaço). */}
            <h2 className="sr-only">{t('projects.title')}</h2>
            <div className="sz-tool-toolbar mb-4">
              <div className="sz-tool-toolbar__start">
                {/* Filtro de modo (só com projetos). A legend fica para o leitor de tela
                    (o `role="group"` "Modo"); o trilho de chips é autoexplicativo. */}
                {hasProjects ? (
                  <fieldset className="sz-tool-chips">
                    <legend className="sr-only">{t('projects.filterMode')}</legend>
                    {(
                      [
                        { value: 'all', label: t('projects.filterAll') },
                        { value: 'blocks', label: t('projects.filterBlocks'), emoji: '🧩' },
                        { value: 'code', label: t('projects.filterCode'), emoji: '💻' },
                      ] as ReadonlyArray<{
                        value: ProjectModeFilter
                        label: string
                        emoji?: string
                      }>
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={option.value === modeFilter}
                        onClick={() => setModeFilter(option.value)}
                        className="sz-tool-chip"
                      >
                        {option.emoji ? <span aria-hidden>{option.emoji}</span> : null}
                        {option.label}
                      </button>
                    ))}
                  </fieldset>
                ) : null}
                {showExamples && hasProjects ? (
                  <button
                    type="button"
                    className="sz-tool-btn"
                    aria-expanded={kitsOpen}
                    aria-controls="sz-kits-panel"
                    onClick={() => setKitsOpen((value) => !value)}
                  >
                    <span aria-hidden>🎮</span> {kitsOpen ? t('kits.hide') : t('kits.show')}
                  </button>
                ) : null}
              </div>
              <div className="sz-tool-toolbar__end">
                <label className="sz-tool-search-wrap">
                  <IconSearch />
                  <input
                    name="project-search"
                    type="search"
                    aria-label={t('projects.search')}
                    autoComplete="off"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && search) {
                        e.preventDefault()
                        setSearch('')
                      }
                    }}
                    placeholder={t('projects.search')}
                    className="sz-tool-search"
                  />
                </label>
                <select
                  name="project-sort"
                  aria-label={t('projects.sort')}
                  value={projectSort}
                  onChange={(e) => void setProjectSort(e.target.value as ProjectSortOrder)}
                  className="sz-tool-select"
                >
                  <option value="recent">{t('projects.sortRecent')}</option>
                  <option value="name">{t('projects.sortName')}</option>
                </select>
              </div>
            </div>

            {/* Os jogos prontos abrem ENTRE a linha de ferramentas e a grade (dentro do
                rolável). No primeiro uso a galeria já vem aberta no painel do estado vazio. */}
            {showExamples && hasProjects && kitsOpen ? (
              <div id="sz-kits-panel" ref={kitsRef} className="sz-tool-panel mb-4 p-4">
                <Suspense
                  fallback={
                    <p role="status" className="text-sm text-sz-fg-soft">
                      {t('kits.loading')}
                    </p>
                  }
                >
                  <LazyKitGallery onOpenProject={onOpenProject} />
                </Suspense>
              </div>
            ) : null}

            {filtered === null ? (
              // Skeleton na MESMA grade dos cards (h-72): sem layout shift nem
              // tela "travada" enquanto o IndexedDB responde.
              <output aria-label="Carregando projetos" className="block">
                <div className={PROJECT_GRID_CLASS}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-72 animate-pulse rounded-2xl border-2 border-sz-border bg-sz-panel motion-reduce:animate-none"
                    />
                  ))}
                </div>
              </output>
            ) : filtered.length === 0 && projects?.length === 0 ? (
              // Primeiro uso: com exemplos liberados (playground) a vitrine É o
              // onboarding, com o "começar do zero" como alternativa. Para clientes
              // (sem exemplos), o "criar do zero" vira a ação principal.
              <div className="flex flex-col gap-6 rounded-2xl border-2 border-dashed border-sz-border bg-sz-panel/40 p-6">
                <p className="text-base text-sz-fg-soft">{t('projects.empty')}</p>
                {showExamples ? (
                  <Suspense
                    fallback={
                      <p role="status" className="text-sm text-sz-fg-soft">
                        {t('kits.loading')}
                      </p>
                    }
                  >
                    <LazyKitGallery onOpenProject={onOpenProject} />
                  </Suspense>
                ) : null}
                <div>
                  <button
                    type="button"
                    className={showExamples ? 'sz-tool-btn' : 'sz-tool-btn-3d'}
                    onClick={() => setModalOpen(true)}
                  >
                    + {showExamples ? t('kits.scratch') : t('projects.new')}
                  </button>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-base text-sz-fg-soft">{t('projects.emptySearch')}</p>
                <button type="button" className="sz-tool-btn" onClick={clearFilters}>
                  {t('projects.searchClearAll')}
                </button>
              </div>
            ) : (
              <div className={PROJECT_GRID_CLASS}>
                {filtered.map((summary) => (
                  <ProjectCard
                    key={summary.id}
                    summary={summary}
                    takenNames={takenNames}
                    onChanged={refreshProject}
                    onOpen={onOpenProject}
                  />
                ))}
              </div>
            )}

            {/* Rodapé: o contador (frase permanente; `role="status"` só ao filtrar) e a
                ajuda, que abre os jogos prontos (só quando eles existem). */}
            {hasProjects && filtered ? (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-sz-fg-soft">
                {filtering ? <p role="status">{countText}</p> : <p>{countText}</p>}
                {showExamples ? (
                  <button
                    type="button"
                    className="font-bold text-sz-accent hover:underline"
                    onClick={openKits}
                  >
                    {t('projects.help')}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </main>

        <NewProjectModal
          open={modalOpen}
          defaultName={defaultName}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
          professionalAvailable={professional}
          templates={templates}
          existingNames={existingNames}
        />
      </div>
    </StudioThemeProvider>
  )
}
