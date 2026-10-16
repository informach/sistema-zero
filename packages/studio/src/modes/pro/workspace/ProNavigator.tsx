import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ProFileTree, type ProFileTreeProps } from '../../../components/code/ProFileTree'
import type { ProExample } from '../../../core/proExamples'
import { compatibleProGuides } from '../../../core/proLearningGuides'
import type { ProjectTree } from '../../../core/proProject'
import { useProjectStore } from '../../../state/projectStore'
import { useUIStore } from '../../../state/uiStore'
import { useT } from '../../../studio/i18n'
import { type ProSearchResult, searchProFiles } from './search'

const ProAssetPaths = lazy(() =>
  import('../../../components/assets/ProAssetPaths').then((module) => ({
    default: module.ProAssetPaths,
  })),
)

const control =
  'min-h-9 rounded-md px-2 py-1.5 text-xs aria-pressed:bg-sz-accent/15 aria-pressed:text-sz-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-sz-accent hover:bg-sz-bg'

export function ProNavigator({
  tree,
  searchRequest,
  revealRequest = 0,
  onResult,
  onInsert,
  onGuideReference,
  ...treeProps
}: ProFileTreeProps & {
  tree: ProjectTree
  searchRequest: number
  onResult(result: ProSearchResult): void
  onInsert(example: ProExample): void
  onGuideReference?: (path: string, symbol: string) => Promise<void>
}) {
  const t = useT()
  const setShowAssets = useUIStore((state) => state.setShowAssets)
  const [view, setView] = useState<'files' | 'search' | 'materials' | 'guides'>('files')
  const [guideQuery, setGuideQuery] = useState('')
  const [guideNotice, setGuideNotice] = useState('')
  const assets = useProjectStore((state) => state.project?.assets)
  const templateId = useProjectStore((state) => state.project?.proMeta?.templateId)
  const converted = useProjectStore((state) => Boolean(state.project?.proMeta?.origin))
  const hasConvertedModules =
    view === 'guides' && Object.keys(tree).some((path) => path.startsWith('src/converted/'))
  const guides = useMemo(
    () => (view === 'guides' ? compatibleProGuides(templateId, tree, guideQuery) : []),
    [view, templateId, tree, guideQuery],
  )
  const [mode, setMode] = useState<'files' | 'content'>('files')
  const [query, setQuery] = useState('')
  const searchInput = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const results = useMemo(
    () => (view === 'search' ? searchProFiles(tree, query, mode) : { items: [], truncated: false }),
    [view, tree, query, mode],
  )
  useEffect(() => {
    if (!searchRequest) return
    setView('search')
    setMode('content')
    searchInput.current?.focus()
  }, [searchRequest])
  useEffect(() => {
    if (view === 'search') searchInput.current?.focus()
  }, [view])
  useEffect(() => {
    if (revealRequest) setView('files')
  }, [revealRequest])
  return (
    <div className="flex h-full min-h-0 flex-col bg-sz-panel">
      <nav
        aria-label={t('pro.navigation')}
        className="flex shrink-0 flex-wrap gap-1 border-b border-sz-border-soft p-2"
      >
        <button
          type="button"
          className={control}
          aria-pressed={view === 'files'}
          onClick={() => setView('files')}
        >
          {t('pro.files')}
        </button>
        <button
          type="button"
          className={control}
          aria-pressed={view === 'search'}
          onClick={() => setView('search')}
        >
          {t('pro.search')}
        </button>
        <button
          type="button"
          className={control}
          aria-pressed={view === 'materials'}
          onClick={() => setView('materials')}
        >
          {t('pro.materials')}
        </button>
        <button
          type="button"
          className={control}
          aria-pressed={view === 'guides'}
          onClick={() => setView('guides')}
        >
          {t('pro.guides')}
        </button>
      </nav>
      {view === 'materials' && (
        <section aria-label="Materiais no código" className="min-h-0 flex-1 overflow-auto p-2">
          <button
            type="button"
            className={`${control} mb-2 w-full border border-sz-border`}
            onClick={() => setShowAssets(true)}
          >
            Abrir biblioteca de materiais
          </button>
          <p className="mb-2 text-xs">
            Importe imagens, sons e modelos pela biblioteca. Depois confira um exemplo para o
            arquivo aberto.
          </p>
          <Suspense fallback={<p role="status">Carregando materiais…</p>}>
            <ProAssetPaths
              assets={assets ?? []}
              path={treeProps.activeFile}
              onInsert={onInsert}
              onFindUses={(text) => {
                setQuery(text)
                setMode('content')
                setView('search')
              }}
              expanded
            />
          </Suspense>
        </section>
      )}
      {view === 'guides' && (
        <section aria-label={t('pro.guides')} className="min-h-0 flex-1 overflow-auto p-3 text-xs">
          <label className="block">
            {t('pro.searchGuides')}
            <input
              type="search"
              value={guideQuery}
              maxLength={160}
              onChange={(event) => setGuideQuery(event.target.value)}
              className="my-2 min-h-10 w-full rounded border border-sz-border bg-sz-bg px-2"
            />
          </label>
          {!guides.length && <p role="status">{t('pro.noGuides')}</p>}
          {guideNotice && <p role="status">{guideNotice}</p>}
          {converted && (
            <p className="my-2">
              Este projeto veio dos blocos.{' '}
              {hasConvertedModules
                ? 'Os módulos convertidos estão em src/converted. '
                : 'A conversão mantém os scripts globais em public/. '}
              A cópia original em blocos continua separada; editar código aqui não altera essa
              cópia.
            </p>
          )}
          {guides.map(
            (guide) =>
              guide.recipe && (
                <details key={guide.id} className="mt-2">
                  <summary className="cursor-pointer py-1">{guide.recipe.label}</summary>
                  <p className="my-2">{guide.recipe.preconditions.join(' ')}</p>
                  {guide.recipe.references.map((reference) => (
                    <button
                      type="button"
                      key={`${reference.path}:${reference.exportName}`}
                      className={`${control} block break-all text-left`}
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
                      {reference.path} · {reference.exportName}
                    </button>
                  ))}
                  <ol className="my-2 list-decimal space-y-2 pl-4">
                    {guide.recipe.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p>{guide.recipe.checks.join(' ')}</p>
                  <p className="mt-2 text-sz-fg-mute">
                    {guide.recipe.limits} Esta experiência não conclui objetivos da sua fase
                    automaticamente.
                  </p>
                </details>
              ),
          )}
        </section>
      )}
      <div className={view === 'files' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <div className="min-h-0 flex-1">
          <ProFileTree {...treeProps} revealRequest={view === 'files' ? revealRequest : 0} />
        </div>
      </div>
      {view === 'search' && (
        <section aria-label={t('pro.search')} className="flex min-h-0 flex-1 flex-col p-3">
          <label htmlFor={inputId} className="mb-2 text-xs font-semibold">
            {t(mode === 'files' ? 'pro.searchFiles' : 'pro.searchContent')}
          </label>
          <input
            id={inputId}
            ref={searchInput}
            type="search"
            maxLength={160}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-10 w-full rounded-md border border-sz-border bg-sz-bg px-2 text-sm text-sz-fg"
          />
          <div className="my-2 flex gap-1">
            <button
              type="button"
              className={control}
              aria-pressed={mode === 'files'}
              onClick={() => setMode('files')}
            >
              {t('pro.byName')}
            </button>
            <button
              type="button"
              className={control}
              aria-pressed={mode === 'content'}
              onClick={() => setMode('content')}
            >
              {t('pro.byContent')}
            </button>
          </div>
          <p role="status" className="mb-2 text-xs text-sz-fg-mute">
            {query.trim()
              ? t(results.truncated ? 'pro.searchLimited' : 'pro.searchCount', {
                  count: results.items.length,
                })
              : t('pro.searchHint')}
          </p>
          <ul className="min-h-0 space-y-1 overflow-auto">
            {results.items.map((result) => (
              <li key={`${result.path}:${result.line}`}>
                <button
                  type="button"
                  className={`${control} w-full text-left`}
                  onClick={() => onResult(result)}
                >
                  <span className="block break-all font-mono text-sz-fg">
                    {result.path}
                    {mode === 'content' ? `:${result.line}` : ''}
                  </span>
                  {mode === 'content' && (
                    <span className="block break-all text-sz-fg-mute">{result.text}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
