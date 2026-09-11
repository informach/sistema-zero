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
  IconBlocks,
  IconCamera,
  IconChevronDown,
  IconCode,
  IconGamepad,
  IconPlus,
  type IconProps,
  IconSearch,
  IconUpload,
} from '#ui'
import { listProTemplates } from '../components/code/pro-templates'
import { HostBackLink } from '../components/layout/HostBackLink'
import { HostMenuButton } from '../components/layout/HostMenuButton'
import { HOST_STATUS_ICON } from '../components/layout/hostStatusIcons'
import { ThemeToggle } from '../components/layout/ThemeToggle'
import { ImportButton, type ImportButtonHandle } from '../components/projects/ImportButton'
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

/** Um comparador por módulo (o `localeCompare(.., 'pt-BR')` criava um Collator por comparação). */
const COLLATOR = new Intl.Collator('pt-BR')

/**
 * Os chips de modo, com os ícones de linha da imagem-modelo (os emojis 🧩/💻 saíram). A grade
 * dos cartões é a `.sz-tool-grid` compartilhada (auto-fill de 13,75rem: 4 colunas de ~245px a
 * 1440px com o menu aberto, a medida da imagem; a largura do cartão fica estável e é a
 * QUANTIDADE de colunas que acompanha a tela). É a mesma grade das galerias do Pinta e do Molda.
 */
const MODE_FILTERS: ReadonlyArray<{
  value: ProjectModeFilter
  label: string
  icon?: (props: IconProps) => JSX.Element
}> = [
  { value: 'all', label: 'projects.filterAll' },
  { value: 'blocks', label: 'projects.filterBlocks', icon: IconBlocks },
  { value: 'code', label: 'projects.filterCode', icon: IconCode },
]

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

  // O chrome do host (community-kids): o menu lateral, a seta de volta para Criar, o selo da nuvem
  // e o sinal da conta. `null` fora dele (playground, adulto).
  const hostChrome = useStudioHostChrome()
  const hasProjects = Boolean(projects && projects.length > 0)
  // A pílula do cabeçalho diz o que acontece AGORA (o selo do host) ou, em repouso, que a nuvem
  // da conta está ligada: a imagem-modelo mostra "Guardado na sua conta" sem nada acontecendo.
  const pill: StudioHostChromeStatus | null =
    hostChrome?.status ??
    (hostChrome?.account
      ? {
          tone: 'ok',
          icon: 'cloud',
          label: hostChrome.account.label,
          text: hostChrome.account.label,
        }
      : null)
  // O cartão da faixa lilás diz ONDE os projetos estão: na conta (com a nuvem ligada) ou só
  // neste aparelho (sem perfil, no playground). Nunca promete a nuvem que não existe.
  const savedCount = projects?.length ?? 0
  const savedText = hostChrome?.account
    ? savedCount === 1
      ? t('projects.saved.accountOne')
      : t('projects.saved.account', { count: savedCount })
    : savedCount === 1
      ? t('projects.saved.deviceOne')
      : t('projects.saved.device', { count: savedCount })
  // O "Importar um jogo" do cartão usa o MESMO input e o MESMO aviso do "Importar" do cabeçalho.
  const importRef = useRef<ImportButtonHandle | null>(null)
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

  // O cartão "Novo projeto" que abre a grade (a imagem-modelo): creme com o fio amarelo e o "+"
  // num círculo amarelo. É um BOTÃO de verdade, com nome próprio (título + dica), diferente do
  // "+ Novo projeto" do cabeçalho, que os e2e usam por nome exato. Some quando a lista está
  // filtrada: no meio de um resultado de busca ele seria ruído.
  // `min-h-40` e não `h-72`: numa fileira com projetos a grade o estica até a altura deles; sozinho
  // numa coluna (celular) ele não precisa de 288px vazios.
  const newCard = (
    <button
      type="button"
      className="sz-tool-card sz-tool-card--new min-h-40"
      onClick={() => setModalOpen(true)}
    >
      <span className="sz-tool-new-dot" aria-hidden="true">
        <IconPlus />
      </span>
      <span className="sz-tool-card-title text-base">{t('projects.new')}</span>
      <span className="text-sz-fg-soft text-xs">{t('projects.newCard.hint')}</span>
    </button>
  )

  return (
    <StudioThemeProvider value={theme}>
      <div
        data-sz-theme={theme}
        className="flex h-full flex-col bg-sz-bg text-sz-fg"
        style={{ fontFamily: 'var(--font-family-sans)' }}
      >
        {/* A galeria no desenho das telas-modelo (11/09/2026): três faixas de borda a borda que
            rolam JUNTAS (creme com o cabeçalho de duas linhas, céu com a grade, lilás com o cartão
            de fechamento), as mesmas das páginas do kids e das galerias do Pinta, do Pensa e do
            Molda. As receitas `sz-tool-*` vêm de `@sistemazero/ui/tool-chrome.css` (o host importa;
            ver docs/embedding.md). Nada de `<main>`: a lista mora dentro do `<main>` do host. */}
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="sz-tool-bands">
            <header className="sz-tool-band sz-tool-band--creme">
              {/* 48px em cima e 36px embaixo a partir de 1024px: o respiro medido na imagem
                  (o título desce um pouco mais que o das outras faixas). */}
              <div className="sz-tool-band__inner lg:pt-12 lg:pb-9">
                <div className="sz-tool-header">
                  <div className="sz-tool-header__lead">
                    {/* O menu da comunidade e a seta de volta para Criar vêm ANTES do título, no
                        quadrado das barras da imagem. */}
                    {hostChrome?.menu || hostChrome?.back ? (
                      <div className="sz-tool-header__nav">
                        {hostChrome.menu ? <HostMenuButton menu={hostChrome.menu} /> : null}
                        {hostChrome.back ? <HostBackLink back={hostChrome.back} /> : null}
                      </div>
                    ) : null}
                    <div className="sz-tool-header__title">
                      <h1 className="sz-tool-title">{t('projects.heroTitle')}</h1>
                      <p className="sz-tool-subtitle">{t('projects.subtitle')}</p>
                    </div>
                  </div>
                  <div className="sz-tool-header__actions">
                    {pill ? <HostStatusPill status={pill} /> : null}
                    {themeProp === undefined && <ThemeToggle className="sz-tool-icon-btn" />}
                    <ImportButton
                      ref={importRef}
                      onImported={handleImported}
                      allowedExtensions={allowedExtensions}
                    />
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--primary"
                      onClick={() => setModalOpen(true)}
                    >
                      + {t('projects.new')}
                    </button>
                  </div>
                </div>

                {/* Linha 2: os filtros de modo e os jogos prontos à esquerda, a busca e a
                    ordenação à direita. 28px abaixo do título, como na imagem. */}
                <div className="sz-tool-toolbar mt-7">
                  <div className="sz-tool-toolbar__start">
                    {/* Filtro de modo (só com projetos). A legend fica para o leitor de tela
                        (o `role="group"` "Modo"); o trilho de chips é autoexplicativo. */}
                    {hasProjects ? (
                      <fieldset className="sz-tool-chips">
                        <legend className="sr-only">{t('projects.filterMode')}</legend>
                        {MODE_FILTERS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={option.value === modeFilter}
                            onClick={() => setModeFilter(option.value)}
                            className="sz-tool-chip"
                          >
                            {option.icon ? <option.icon /> : null}
                            {t(option.label)}
                          </button>
                        ))}
                      </fieldset>
                    ) : null}
                    {showExamples && hasProjects ? (
                      <button
                        type="button"
                        className="sz-tool-chip"
                        aria-expanded={kitsOpen}
                        aria-controls="sz-kits-panel"
                        onClick={() => setKitsOpen((value) => !value)}
                      >
                        <IconGamepad />
                        {kitsOpen ? t('kits.hide') : t('kits.show')}
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
                    <span className="sz-tool-select-wrap">
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
                      <IconChevronDown />
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <section aria-labelledby="sz-projects-title" className="sz-tool-band sz-tool-band--ceu">
              <div className="sz-tool-band__inner">
                {/* O heading da seção segue no DOM para o leitor de tela; visualmente o título
                    da página já diz tudo. */}
                <h2 id="sz-projects-title" className="sr-only">
                  {t('projects.title')}
                </h2>

                {/* Os jogos prontos abrem ENTRE a linha de ferramentas e a grade. No primeiro
                    uso a galeria já vem aberta, junto do recado da lista vazia. */}
                {showExamples && hasProjects && kitsOpen ? (
                  <div id="sz-kits-panel" ref={kitsRef} className="sz-tool-card mb-6 p-5">
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
                  // Skeleton na MESMA grade dos cartões (h-72): sem layout shift nem tela
                  // "travada" enquanto o IndexedDB responde.
                  <output aria-label="Carregando projetos" className="block">
                    <div className="sz-tool-grid">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-72 animate-pulse rounded-[1.25rem] bg-sz-panel motion-reduce:animate-none"
                        />
                      ))}
                    </div>
                  </output>
                ) : filtered.length === 0 && projects?.length === 0 ? (
                  // Primeiro uso: o recado, os jogos prontos (só onde os exemplos estão
                  // liberados, o playground) e o cartão "Novo projeto" sozinho na grade.
                  <div className="flex flex-col gap-6">
                    <p className="font-semibold text-base text-sz-fg-soft">{t('projects.empty')}</p>
                    {showExamples ? (
                      <div className="sz-tool-card p-5">
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
                    <div className="sz-tool-grid">{newCard}</div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="font-semibold text-base text-sz-fg-soft">
                      {t('projects.emptySearch')}
                    </p>
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--quiet"
                      onClick={clearFilters}
                    >
                      {t('projects.searchClearAll')}
                    </button>
                  </div>
                ) : (
                  <div className="sz-tool-grid">
                    {filtering ? null : newCard}
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
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 font-semibold text-sm text-sz-fg-soft">
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
            </section>

            {/* O fechamento da página (faixa lilás, só com projetos): onde eles estão guardados
                e o segundo caminho do import, a pílula creme da imagem. */}
            {hasProjects ? (
              <section
                aria-labelledby="sz-projects-saved"
                className="sz-tool-band sz-tool-band--lilas"
              >
                <div className="sz-tool-band__inner">
                  <div className="sz-tool-cta-card">
                    <span className="sz-tool-tile sz-tool-tile--new" aria-hidden="true">
                      <IconCamera />
                    </span>
                    <div className="sz-tool-cta-card__body">
                      <h2 id="sz-projects-saved" className="sz-tool-cta-card__title">
                        {savedText}
                      </h2>
                      <p className="sz-tool-cta-card__text">{t('projects.saved.hint')}</p>
                    </div>
                    <button
                      type="button"
                      className="sz-tool-pill sz-tool-pill--creme"
                      onClick={() => importRef.current?.open()}
                    >
                      <IconUpload />
                      {t('projects.importCta')}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>

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
