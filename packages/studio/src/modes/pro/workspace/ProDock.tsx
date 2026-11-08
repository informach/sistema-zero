import { type JSX, useEffect, useId, useMemo, useState } from 'react'
import { cn, ErrorBoundary, IconChevronDown, IconChevronUp, IconFile } from '#ui'
import { proFileBaseName, proFileKind } from '../../../components/code/proFileKinds'
import { ConsolePanel } from '../../../components/console/ConsolePanel'
import { renderBottomPanel, useVisibleBottomTabs } from '../../../components/layout/bottomTabs'
import { SectionErrorFallback } from '../../../components/layout/ErrorViews'
import type { ProjectTree } from '../../../core/proProject'
import type { ProAnalysisState, ProEditorDiagnostic } from '../../../monaco/pro/session'
import { glossErrorMessage } from '../../../state/errorGloss'
import { ERROR_LOG_KINDS, useLogsStore } from '../../../state/logsStore'
import { useT } from '../../../studio/i18n'
import { currentProDiagnostics } from './diagnostics'
import type { ProWorkspaceBottom } from './model'

export { currentProDiagnostics } from './diagnostics'

type DockTab = Exclude<ProWorkspaceBottom, 'closed'>

function diagnosticHint(code: number | string, source?: ProEditorDiagnostic['source']) {
  if (source === 'pyright') {
    if (code === 'reportUndefinedVariable')
      return 'Este nome ainda não foi definido. Confira a escrita e onde ele foi criado.'
    if (code === 'reportMissingImports' || code === 'reportMissingModuleSource')
      return 'Confira o nome do módulo e se ele está disponível neste projeto Python.'
    if (
      code === 'reportArgumentType' ||
      code === 'reportAssignmentType' ||
      code === 'reportCallIssue'
    )
      return 'Confira os valores e argumentos usados nesta linha.'
    return 'Confira a mensagem e a linha indicada. Em Python, a indentação também organiza o código.'
  }
  if (code === 2307) return 'Confira se o caminho do arquivo ou o nome da biblioteca está certo.'
  if (code === 2322 || code === 2345)
    return 'O valor usado aqui tem um tipo diferente do esperado. Confira a linha indicada.'
  if (code === 2304)
    return 'Este nome ainda não foi definido. Confira a escrita ou onde ele foi criado.'
  if (code === 1005 || code === 1128)
    return 'Parece faltar uma parte da escrita do código. Confira parênteses, chaves e sinais nesta linha.'
  return 'Abra a linha indicada e confira a mensagem técnica. Você também pode pedir uma dica ao Zappy.'
}

/**
 * A gaveta de baixo do workspace Pro (redesenho de 11/2026): um cartão com abas de verdade
 * (`role="tablist"`). JavaScript: "Mensagens do jogo" · "Problemas" · "Terminal" (avançado);
 * Python: "Problemas" · "Experimentar comandos" · "Mensagens do programa". Apertar a aba aberta
 * fecha a gaveta; "Abrir/Fechar" à direita faz o mesmo. Os Problemas viram cartões: o lugar
 * (arquivo e linha), a DICA como texto principal, "Ir para a linha N", "Pedir uma dica ao
 * Zappy" e o texto técnico dobrado. O console e o terminal continuam passando pelos portões do
 * host (`useVisibleBottomTabs`); o "Experimentar comandos" é o console com o campo de Python.
 */
export function ProDock({
  tree,
  diagnostics,
  selected,
  onSelect,
  navigate,
  analysis,
  investigate,
  python = false,
}: {
  tree: ProjectTree
  diagnostics: ProEditorDiagnostic[] | null
  selected: ProWorkspaceBottom
  onSelect: (tab: ProWorkspaceBottom) => void
  navigate: (path: string, line: number, column?: number) => void
  analysis?: ProAnalysisState
  investigate?: (item: ProEditorDiagnostic) => void
  python?: boolean
}): JSX.Element {
  const t = useT()
  const allowed = useVisibleBottomTabs()
  const entries = useLogsStore((state) => state.entries)
  const problems = useMemo(
    () => currentProDiagnostics(diagnostics ?? [], tree),
    [diagnostics, tree],
  )
  const runtime = useMemo(
    () =>
      [
        ...new Map(
          entries
            .filter((entry) => ERROR_LOG_KINDS.has(entry.kind))
            .map((entry) => [entry.text, entry]),
        ).values(),
      ].slice(-50),
    [entries],
  )
  const count = problems.length + runtime.length
  const hasConsole = allowed.some((item) => item.id === 'console')
  const hasTerminal = !python && allowed.some((item) => item.id === 'terminal')
  const subject = python ? 'program' : 'game'
  const tabs: DockTab[] = python
    ? ['problems', ...(hasConsole ? (['repl', 'console'] as const) : [])]
    : [
        ...(hasConsole ? (['console'] as const) : []),
        'problems',
        ...(hasTerminal ? (['terminal'] as const) : []),
      ]
  const active: ProWorkspaceBottom = (tabs as string[]).includes(selected) ? selected : 'closed'
  const [visited, setVisited] = useState<Set<string>>(() => new Set([selected]))
  const id = useId()
  useEffect(() => {
    if (active !== 'closed')
      setVisited((previous) => (previous.has(active) ? previous : new Set([...previous, active])))
  }, [active])
  const label = (tab: DockTab) =>
    tab === 'console'
      ? t(`pro.dock.messages.${subject}`)
      : tab === 'problems'
        ? t('pro.dock.problems')
        : tab === 'terminal'
          ? t('pro.dock.terminal')
          : t('pro.dock.repl')
  const open = active !== 'closed'
  return (
    <section className="sz-pro-dock" aria-label={t('pro.dock.label')}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div
          role="tablist"
          aria-label={t('pro.dock.tabs')}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`${id}-tab-${tab}`}
              aria-selected={active === tab}
              aria-controls={active === tab ? `${id}-${tab}` : undefined}
              className="sz-pro-dock-tab"
              onClick={() => {
                setVisited((previous) => new Set([...previous, tab]))
                onSelect(active === tab ? 'closed' : tab)
              }}
            >
              <span>{label(tab)}</span>
              {tab === 'problems' ? (
                count ? (
                  <span className="sz-pro-badge">{count}</span>
                ) : diagnostics !== null && analysis?.status !== 'pending' ? (
                  <span className="sz-pro-badge sz-pro-badge--ok">
                    <span aria-hidden="true">✓</span>
                    <span className="sr-only">{t('pro.dock.noProblems')}</span>
                  </span>
                ) : null
              ) : null}
              {tab === 'console' && entries.length ? (
                <span className="sz-pro-badge sz-pro-badge--quiet">{entries.length}</span>
              ) : null}
              {tab === 'terminal' ? (
                <span className="sz-pro-tag">{t('pro.dock.advanced')}</span>
              ) : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="sz-pro-btn sz-pro-btn--sm"
          aria-expanded={open}
          aria-label={open ? t('pro.dock.close') : t('pro.dock.open')}
          onClick={() => onSelect(open ? 'closed' : (tabs[0] ?? 'problems'))}
        >
          {open ? <IconChevronDown /> : <IconChevronUp />}
          <span className="sz-pro-dock__toggle-label">
            {open ? t('pro.dock.close') : t('pro.dock.open')}
          </span>
        </button>
      </div>
      <div hidden={!open} className="sz-pro-dock__body">
        <div
          id={`${id}-problems`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-problems`}
          hidden={active !== 'problems'}
          className="h-full space-y-2 overflow-auto p-3"
        >
          {(analysis?.status === 'pending' || (!analysis && diagnostics === null)) && (
            <p role="status" className="text-sm text-sz-fg-mute">
              {t('pro.problems.analysing')}
            </p>
          )}
          {analysis?.status === 'error' && (
            <p role="alert" className="text-sm text-sz-error">
              {t('pro.problems.analysisFailed', { message: analysis.message })}
            </p>
          )}
          {diagnostics && diagnostics.length >= 100 && (
            <p className="text-sm text-sz-fg-mute">{t('pro.problems.limited')}</p>
          )}
          {diagnostics && diagnostics.length > problems.length && (
            <p className="text-sm text-sz-fg-mute">{t('pro.problems.waiting')}</p>
          )}
          {!count &&
            diagnostics !== null &&
            diagnostics.length === 0 &&
            (!analysis || analysis.status === 'ready') && (
              <p className="text-sm">{t('pro.problems.none')}</p>
            )}
          {problems.map((item) => {
            const kind = proFileKind(item.path)
            const severity =
              item.severity === 'warning' ? 'warning' : item.severity === 'info' ? 'info' : 'error'
            return (
              <article
                key={`${item.path}:${item.line}:${item.column}:${item.code}:${item.message}`}
                className="sz-pro-card flex flex-col gap-2 p-3 text-sm"
              >
                <p className="m-0 flex items-center gap-2 text-xs font-bold text-sz-fg-soft">
                  <span
                    aria-hidden="true"
                    className={cn('sz-pro-tile sz-pro-tile--sm', `sz-pro-tile--${kind.tone}`)}
                  >
                    {kind.short || <IconFile />}
                  </span>
                  <span className="min-w-0 truncate" title={item.path}>
                    {t('pro.problems.where', { file: proFileBaseName(item.path), line: item.line })}
                  </span>
                  <span
                    className={cn(
                      'sz-pro-pill sz-pro-pill--quiet',
                      severity === 'error'
                        ? 'sz-pro-pill--error'
                        : severity === 'warning'
                          ? 'sz-pro-pill--wait'
                          : 'sz-pro-pill--prep',
                    )}
                  >
                    {t(`pro.problems.${severity}`)}
                  </span>
                </p>
                <p className="m-0 font-bold leading-snug">
                  {diagnosticHint(item.code, item.source)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
                    aria-label={t('pro.problems.goToLabel', { path: item.path, line: item.line })}
                    onClick={() => navigate(item.path, item.line, item.column)}
                  >
                    {t('pro.problems.goTo', { line: item.line })}
                  </button>
                  {investigate && (
                    <button
                      type="button"
                      className="sz-pro-btn sz-pro-btn--sm"
                      onClick={() => investigate(item)}
                    >
                      {t('pro.problems.askZappy')}
                    </button>
                  )}
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-sz-fg-soft">
                    {t('pro.problems.technical')}
                  </summary>
                  <p className="mt-1 mb-0 text-sz-fg-mute">
                    {item.source === 'pyright'
                      ? `Python · Pyright · ${item.code}`
                      : `TypeScript · TS${item.code}`}
                  </p>
                  <pre className="m-0 whitespace-pre-wrap break-words">{item.message}</pre>
                </details>
              </article>
            )
          })}
          {runtime.map((entry) => (
            <article key={entry.id} className="sz-pro-card flex flex-col gap-2 p-3 text-sm">
              <p className="m-0 text-xs font-bold text-sz-error">
                {t(`pro.problems.runtime.${subject}`)}
              </p>
              <p className="m-0 font-bold leading-snug">
                {glossErrorMessage(entry.text) ?? t('pro.problems.runtimeFallback')}
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer text-sz-fg-soft">
                  {t('pro.problems.technical')}
                </summary>
                <pre className="m-0 whitespace-pre-wrap break-words">
                  {entry.errorStack ?? entry.text}
                </pre>
              </details>
            </article>
          ))}
          {(problems.length >= 100 || runtime.length >= 50) && (
            <p className="text-xs">{t('pro.problems.capped')}</p>
          )}
        </div>
        {tabs
          .filter((tab): tab is 'console' | 'terminal' | 'repl' => tab !== 'problems')
          .map((tab) => (
            <div
              key={tab}
              id={`${id}-${tab}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${tab}`}
              hidden={active !== tab}
              className="h-full"
            >
              {(visited.has(tab) || active === tab) &&
                (tab === 'terminal' ? (
                  renderBottomPanel('terminal')
                ) : (
                  <ErrorBoundary
                    label="console"
                    fallback={(props) => (
                      <SectionErrorFallback {...props} title="O console falhou ao carregar" />
                    )}
                  >
                    <ConsolePanel variant={tab === 'repl' ? 'repl' : 'messages'} />
                  </ErrorBoundary>
                ))}
            </div>
          ))}
      </div>
    </section>
  )
}
