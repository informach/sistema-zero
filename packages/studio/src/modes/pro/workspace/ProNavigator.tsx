import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn, IconArrowLeft, IconBook, IconFile } from '#ui'
import { ProFileTree, type ProFileTreeProps } from '../../../components/code/ProFileTree'
import { proFileBaseName, proFileKind } from '../../../components/code/proFileKinds'
import type { ProExample } from '../../../core/proExamples'
import { compatibleProGuides } from '../../../core/proLearningGuides'
import type { ProjectTree } from '../../../core/proProject'
import { useProjectStore } from '../../../state/projectStore'
import { useUIStore } from '../../../state/uiStore'
import { useT } from '../../../studio/i18n'
import { PRO_WORKSPACE_PANELS, type ProWorkspacePanel } from './model'
import { type ProSearchResult, searchProFiles } from './search'

const ProAssetPaths = lazy(() =>
  import('../../../components/assets/ProAssetPaths').then((module) => ({
    default: module.ProAssetPaths,
  })),
)

const VIEW_LABEL: Record<ProWorkspacePanel, string> = {
  files: 'pro.files',
  search: 'pro.search',
  materials: 'pro.materials',
  guides: 'pro.guides',
}

/**
 * O painel lateral do Pro (redesenho de 11/2026), com as quatro vistas que o trilho escolhe:
 * Arquivos (`ProFileTree`), Procurar (dentro do código ou pelo nome, resultados agrupados por
 * arquivo), Materiais (`ProAssetPaths`, o único lugar deles) e Guias (cartões; o guia aberto
 * mostra "No código", o passo a passo, o que conferir e os limites, sem progresso inventado).
 * No celular, onde não há trilho, o seletor das quatro vistas aparece no topo.
 */
export function ProNavigator({
  tree,
  searchRequest,
  revealRequest = 0,
  onResult,
  onInsert,
  onGuideReference,
  view: controlledView,
  onViewChange,
  showViewSwitcher = true,
  visible = true,
  ...treeProps
}: ProFileTreeProps & {
  tree: ProjectTree
  searchRequest: number
  onResult(result: ProSearchResult): void
  onInsert(example: ProExample): void
  onGuideReference?: (path: string, symbol: string) => Promise<void>
  /** A vista escolhida no trilho; sem ela, o painel guarda a própria. */
  view?: ProWorkspacePanel
  onViewChange?: (view: ProWorkspacePanel) => void
  /** O seletor das quatro vistas no topo: só onde não há o trilho (o celular). */
  showViewSwitcher?: boolean
  /** O painel está à vista (o foco só pode ir para um campo que aparece). */
  visible?: boolean
}) {
  const t = useT()
  const openAssetsTab = useUIStore((state) => state.openAssetsTab)
  const [ownView, setOwnView] = useState<ProWorkspacePanel>('files')
  const view = controlledView ?? ownView
  const setView = (next: ProWorkspacePanel) => {
    setOwnView(next)
    onViewChange?.(next)
  }
  const [guideQuery, setGuideQuery] = useState('')
  const [guideNotice, setGuideNotice] = useState('')
  const [openGuide, setOpenGuide] = useState<string | null>(null)
  const assets = useProjectStore((state) => state.project?.assets)
  const templateId = useProjectStore((state) => state.project?.proMeta?.templateId)
  const converted = useProjectStore((state) => Boolean(state.project?.proMeta?.origin))
  const python = useProjectStore((state) => state.project?.programmingLanguage === 'python')
  const hasConvertedModules =
    view === 'guides' && Object.keys(tree).some((path) => path.startsWith('src/converted/'))
  const guides = useMemo(
    () =>
      view === 'guides'
        ? compatibleProGuides(templateId, tree, guideQuery).filter((guide) => guide.recipe)
        : [],
    [view, templateId, tree, guideQuery],
  )
  const guide = guides.find((item) => item.id === openGuide)
  const [mode, setMode] = useState<'files' | 'content'>('content')
  const [query, setQuery] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const results = useMemo(
    () => (view === 'search' ? searchProFiles(tree, query, mode) : { items: [], truncated: false }),
    [view, tree, query, mode],
  )
  const groups = useMemo(() => {
    const map = new Map<string, ProSearchResult[]>()
    for (const item of results.items) {
      const list = map.get(item.path) ?? []
      list.push(item)
      map.set(item.path, list)
    }
    return [...map]
  }, [results.items])
  const latestSetView = useRef(setView)
  latestSetView.current = setView
  // Ctrl+Shift+F e "Mostrar na lista de arquivos" chegam com o painel às vezes ESCONDIDO (a gaveta
  // do tablet fechada, a coluna fechada no largo): o pedido fica guardado e é atendido quando o
  // painel aparece. Focar um campo escondido falha em silêncio, e o que a criança digitasse em
  // seguida iria para o CÓDIGO, embaixo da gaveta.
  const pendingSearchFocus = useRef(false)
  const pendingReveal = useRef(false)
  const [treeReveal, setTreeReveal] = useState(0)
  useEffect(() => {
    if (!searchRequest) return
    pendingSearchFocus.current = true
    latestSetView.current('search')
    setMode('content')
  }, [searchRequest])
  useEffect(() => {
    if (!revealRequest) return
    pendingReveal.current = true
    latestSetView.current('files')
  }, [revealRequest])
  // biome-ignore lint/correctness/useExhaustiveDependencies: os pedidos são GATILHOS (com o painel já à vista na vista certa, um pedido novo também precisa ser atendido); o corpo lê só refs
  useEffect(() => {
    if (!visible) return
    if (view === 'search' && pendingSearchFocus.current) {
      pendingSearchFocus.current = false
      searchInput.current?.focus()
    } else if (view === 'files' && pendingReveal.current) {
      pendingReveal.current = false
      setTreeReveal((value) => value + 1)
    }
  }, [visible, view, searchRequest, revealRequest])
  useEffect(() => {
    if (view === 'search' && visible) searchInput.current?.focus()
  }, [view, visible])
  return (
    <div className="flex h-full min-h-0 flex-col bg-sz-panel">
      <nav
        aria-label={t('pro.navigation')}
        hidden={!showViewSwitcher}
        className="shrink-0 border-b border-sz-border-soft p-2"
      >
        <div className="sz-pro-seg w-full">
          {PRO_WORKSPACE_PANELS.map((item) => (
            <button
              key={item}
              type="button"
              className="sz-pro-seg-btn flex-1"
              aria-pressed={view === item}
              onClick={() => setView(item)}
            >
              {t(VIEW_LABEL[item])}
            </button>
          ))}
        </div>
      </nav>
      {view === 'materials' && (
        <section aria-label={t('pro.materials')} className="min-h-0 flex-1 overflow-auto p-3">
          <Suspense fallback={<p role="status">{t('pro.materials.reading')}</p>}>
            <ProAssetPaths
              assets={assets ?? []}
              path={treeProps.activeFile}
              onInsert={onInsert}
              onBring={(tab) => openAssetsTab(tab)}
              onFindUses={(text) => {
                setQuery(text)
                setMode('content')
                setView('search')
              }}
            />
          </Suspense>
        </section>
      )}
      {view === 'guides' && (
        <section aria-label={t('pro.guides')} className="min-h-0 flex-1 overflow-auto p-3 text-sm">
          {guide?.recipe ? (
            <article className="flex flex-col gap-3">
              <button
                type="button"
                className="sz-pro-btn sz-pro-btn--sm self-start"
                onClick={() => {
                  setOpenGuide(null)
                  setGuideNotice('')
                }}
              >
                <IconArrowLeft />
                <span>{t('pro.guides.all')}</span>
              </button>
              <h2 className="m-0 text-lg font-black leading-tight">{guide.recipe.label}</h2>
              {guide.recipe.preconditions.length ? (
                <p className="m-0 text-sz-fg-soft">{guide.recipe.preconditions.join(' ')}</p>
              ) : null}
              <div className="flex flex-col gap-1">
                <h3 className="sz-pro-section-label m-0">{t('pro.guides.inCode')}</h3>
                {guide.recipe.references.map((reference) => {
                  const kind = proFileKind(reference.path)
                  return (
                    <button
                      type="button"
                      key={`${reference.path}:${reference.exportName}`}
                      className="sz-pro-row min-h-12"
                      aria-label={t('pro.guides.openInCode', {
                        target: `${reference.path} · ${reference.exportName}`,
                      })}
                      onClick={() => {
                        setGuideNotice('')
                        if (!onGuideReference) treeProps.onSelectFile(reference.path)
                        else
                          void onGuideReference(reference.path, reference.exportName).catch(
                            (error: unknown) =>
                              setGuideNotice(
                                error instanceof Error
                                  ? error.message
                                  : 'Não foi possível localizar este símbolo.',
                              ),
                          )
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('sz-pro-tile sz-pro-tile--sm', `sz-pro-tile--${kind.tone}`)}
                      >
                        {kind.short || <IconFile />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="sz-pro-row__name font-mono">{reference.exportName}</span>
                        <span className="sz-pro-row__hint">{reference.path}</span>
                      </span>
                    </button>
                  )
                })}
                {guideNotice && <p role="status">{guideNotice}</p>}
              </div>
              <div>
                <h3 className="sz-pro-section-label m-0">{t('pro.guides.steps')}</h3>
                <ol className="sz-pro-guide-steps">
                  {guide.recipe.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              {guide.recipe.checks.length ? (
                <div>
                  <h3 className="sz-pro-section-label m-0">{t('pro.guides.checks')}</h3>
                  <ul className="m-0 list-disc space-y-1 pl-5">
                    {guide.recipe.checks.map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="rounded-xl bg-sz-panel-soft p-3 text-xs text-sz-fg-soft">
                <strong className="block text-sz-fg">{t('pro.guides.limits')}</strong>
                {guide.recipe.limits} {t('pro.guides.noProgress')}
              </div>
            </article>
          ) : (
            <div className="flex flex-col gap-3">
              <h2 className="m-0 text-base font-black">{t('pro.guides')}</h2>
              <label className="flex flex-col gap-1 text-xs font-bold text-sz-fg-soft">
                {t('pro.searchGuides')}
                <input
                  type="search"
                  value={guideQuery}
                  maxLength={160}
                  onChange={(event) => setGuideQuery(event.target.value)}
                  className="min-h-10 rounded-xl border-2 border-sz-border bg-sz-bg px-3 font-normal text-sz-fg"
                />
              </label>
              {converted && (
                <p className="m-0 rounded-xl bg-sz-panel-soft p-3 text-xs">
                  Este projeto veio dos blocos.{' '}
                  {python
                    ? 'Os arquivos Python mantêm o código da versão em blocos. '
                    : hasConvertedModules
                      ? 'Os módulos convertidos estão em src/converted. '
                      : 'A conversão mantém os scripts globais em public/. '}
                  A cópia original em blocos continua separada; editar código aqui não altera essa
                  cópia.
                </p>
              )}
              {!guides.length && <p role="status">{t('pro.noGuides')}</p>}
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {guides.map((item) =>
                  item.recipe ? (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="sz-pro-card sz-pro-hard flex w-full items-start gap-3 p-3 text-left"
                        onClick={() => {
                          setOpenGuide(item.id)
                          setGuideNotice('')
                        }}
                      >
                        <span aria-hidden="true" className="sz-pro-tile sz-pro-tile--py">
                          <IconBook />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-black leading-tight">
                            {item.recipe.label}
                          </span>
                          <span className="mt-1 block text-xs text-sz-fg-soft">
                            {t('pro.guides.stepCount', { count: item.recipe.steps.length })} ·{' '}
                            {item.recipe.references
                              .map((ref) => proFileBaseName(ref.path))
                              .join(', ')}
                          </span>
                        </span>
                      </button>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}
        </section>
      )}
      <div className={view === 'files' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <div className="min-h-0 flex-1">
          <ProFileTree {...treeProps} revealRequest={treeReveal} />
        </div>
      </div>
      {view === 'search' && (
        <section aria-label={t('pro.search')} className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <h2 className="m-0 text-base font-black">{t('pro.search')}</h2>
          <div className="sz-pro-seg self-start">
            <button
              type="button"
              className="sz-pro-seg-btn"
              aria-pressed={mode === 'content'}
              onClick={() => setMode('content')}
            >
              {t('pro.byContent')}
            </button>
            <button
              type="button"
              className="sz-pro-seg-btn"
              aria-pressed={mode === 'files'}
              onClick={() => setMode('files')}
            >
              {t('pro.byName')}
            </button>
          </div>
          <label htmlFor={inputId} className="text-xs font-bold text-sz-fg-soft">
            {t(mode === 'files' ? 'pro.searchFiles' : 'pro.searchContent')}
          </label>
          <input
            id={inputId}
            ref={searchInput}
            type="search"
            maxLength={160}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-10 w-full rounded-xl border-2 border-sz-border bg-sz-bg px-3 text-sm text-sz-fg"
          />
          <p role="status" className="m-0 text-xs text-sz-fg-mute">
            {query.trim()
              ? t(results.truncated ? 'pro.searchLimited' : 'pro.searchCount', {
                  count: results.items.length,
                })
              : t('pro.searchHint')}
          </p>
          <ul
            aria-label={t('pro.search.results')}
            className="m-0 min-h-0 list-none space-y-3 overflow-auto p-0"
          >
            {groups.map(([path, items]) => {
              const kind = proFileKind(path)
              return (
                <li key={path}>
                  {mode === 'files' ? (
                    <button
                      type="button"
                      className="sz-pro-row min-h-12"
                      aria-label={path}
                      onClick={() => items[0] && onResult(items[0])}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('sz-pro-tile sz-pro-tile--sm', `sz-pro-tile--${kind.tone}`)}
                      >
                        {kind.short || <IconFile />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="sz-pro-row__name">{proFileBaseName(path)}</span>
                        <span className="sz-pro-row__hint">{path}</span>
                      </span>
                    </button>
                  ) : (
                    <>
                      <p className="m-0 mb-1 flex items-center gap-2 text-xs font-black">
                        <span
                          aria-hidden="true"
                          className={cn('sz-pro-tile sz-pro-tile--sm', `sz-pro-tile--${kind.tone}`)}
                        >
                          {kind.short || <IconFile />}
                        </span>
                        <span className="min-w-0 truncate" title={path}>
                          {proFileBaseName(path)}
                        </span>
                        <span className="sz-pro-badge sz-pro-badge--quiet">{items.length}</span>
                      </p>
                      <ul className="m-0 list-none space-y-1 p-0">
                        {items.map((result) => (
                          <li key={`${result.path}:${result.line}`}>
                            <button
                              type="button"
                              aria-label={`${result.path}:${result.line} ${result.text}`}
                              className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-sz-panel-soft"
                              onClick={() => onResult(result)}
                            >
                              <span className="block text-xs font-bold text-sz-accent">
                                {t('pro.search.line', { line: result.line })}
                              </span>
                              <span className="block break-all font-mono text-xs text-sz-fg-soft">
                                {result.text}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
