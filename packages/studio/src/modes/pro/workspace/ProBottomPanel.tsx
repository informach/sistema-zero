import { useEffect, useId, useMemo, useState } from 'react'
import { renderBottomPanel, useVisibleBottomTabs } from '../../../components/layout/bottomTabs'
import type { ProjectTree } from '../../../core/proProject'
import type { ProAnalysisState, ProEditorDiagnostic } from '../../../monaco/pro/session'
import { glossErrorMessage } from '../../../state/errorGloss'
import { ERROR_LOG_KINDS, useLogsStore } from '../../../state/logsStore'
import { currentProDiagnostics } from './diagnostics'
import type { ProWorkspacePreferences } from './model'

export { currentProDiagnostics } from './diagnostics'

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
  return 'Abra a linha indicada e confira a mensagem técnica. Você também pode pedir ao Zappy para investigar.'
}

export function ProBottomPanel({
  tree,
  diagnostics,
  selected,
  onSelect,
  navigate,
  analysis,
  investigate,
}: {
  tree: ProjectTree
  diagnostics: ProEditorDiagnostic[] | null
  selected: ProWorkspacePreferences['bottom']
  onSelect: (tab: ProWorkspacePreferences['bottom']) => void
  navigate: (path: string, line: number, column?: number) => void
  analysis?: ProAnalysisState
  investigate?: (item: ProEditorDiagnostic) => void
}) {
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
  const tabs = [
    { id: 'problems' as const, label: `Problemas${count ? ` (${count})` : ''}` },
    ...allowed.filter((item) => item.id === 'console' || item.id === 'terminal'),
  ]
  const active = tabs.some((item) => item.id === selected) ? selected : 'closed'
  const [visited, setVisited] = useState<Set<string>>(() => new Set([selected]))
  const id = useId()
  useEffect(() => {
    if (active !== 'closed')
      setVisited((previous) => (previous.has(active) ? previous : new Set([...previous, active])))
  }, [active])
  return (
    <section
      className="shrink-0 border-t border-sz-border bg-sz-panel"
      aria-label="Problemas e saída do jogo"
    >
      <div className="flex flex-wrap items-center gap-1 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-expanded={active === tab.id}
            aria-controls={`${id}-${tab.id}`}
            className="min-h-10 rounded px-3 text-sm hover:bg-sz-bg focus-visible:outline focus-visible:outline-sz-accent"
            onClick={() => {
              if (tab.id !== 'problems' && tab.id !== 'console' && tab.id !== 'terminal') return
              setVisited((previous) => new Set([...previous, tab.id]))
              onSelect(active === tab.id ? 'closed' : tab.id)
            }}
          >
            {tab.label}
          </button>
        ))}
        {active !== 'closed' && (
          <button
            type="button"
            className="ml-auto min-h-10 px-3 text-xs"
            onClick={() => onSelect('closed')}
          >
            Recolher painéis
          </button>
        )}
      </div>
      <div
        hidden={active === 'closed'}
        className="h-56 max-h-[35vh] min-h-0 border-t border-sz-border-soft"
      >
        <div
          id={`${id}-problems`}
          hidden={active !== 'problems'}
          className="h-full space-y-2 overflow-auto p-3"
        >
          {(analysis?.status === 'pending' || (!analysis && diagnostics === null)) && (
            <p role="status" className="text-sm text-sz-fg-mute">
              Analisando o código…
            </p>
          )}
          {analysis?.status === 'error' && (
            <p role="alert" className="text-sm text-sz-error">
              A análise não pôde ser concluída: {analysis.message}
            </p>
          )}
          {diagnostics && diagnostics.length >= 100 && (
            <p className="text-sm text-sz-fg-mute">
              Mostrando até 100 problemas de código. Corrija alguns para ver os próximos.
            </p>
          )}
          {diagnostics && diagnostics.length > problems.length && (
            <p className="text-sm text-sz-fg-mute">
              Algumas linhas mudaram; aguardando a análise atualizada.
            </p>
          )}
          {!count &&
            diagnostics !== null &&
            diagnostics.length === 0 &&
            (!analysis || analysis.status === 'ready') && (
              <p className="text-sm">
                Nenhum problema detectado por estas verificações. Experimente o jogo para conferir o
                resultado.
              </p>
            )}
          {problems.map((item) => (
            <article
              key={`${item.path}:${item.line}:${item.column}:${item.code}:${item.message}`}
              className="rounded border border-sz-border p-2 text-sm"
            >
              <p className="text-xs text-sz-fg-mute">
                {item.source === 'pyright' ? 'Python · Pyright' : 'TypeScript'} ·{' '}
                {item.severity === 'warning'
                  ? 'Aviso'
                  : item.severity === 'info'
                    ? 'Informação'
                    : 'Erro'}
              </p>
              <button
                type="button"
                className="min-h-8 text-left font-medium text-sz-accent underline"
                onClick={() => navigate(item.path, item.line, item.column)}
              >
                {item.path}:{item.line}
              </button>
              <p className="text-xs text-sz-fg-mute">
                {item.source === 'pyright' ? item.code : `TS${item.code}`}
              </p>
              <pre className="whitespace-pre-wrap break-words">{item.message}</pre>
              <details className="mt-1 text-xs">
                <summary>Como investigar</summary>
                <p>{diagnosticHint(item.code, item.source)}</p>
              </details>
              {investigate && (
                <button
                  type="button"
                  className="mt-1 min-h-9 rounded px-2 text-xs text-sz-accent hover:bg-sz-bg"
                  onClick={() => investigate(item)}
                >
                  Investigar com Zappy
                </button>
              )}
            </article>
          ))}
          {runtime.map((entry) => (
            <article key={entry.id} className="rounded border border-sz-border p-2 text-sm">
              <p className="text-xs text-sz-fg-mute">Execução do jogo · Erro</p>
              <p>
                {glossErrorMessage(entry.text) ?? 'O jogo informou um problema durante a execução.'}
              </p>
              <details className="mt-1 text-xs">
                <summary>Mensagem do jogo</summary>
                <pre className="whitespace-pre-wrap break-words">
                  {entry.errorStack ?? entry.text}
                </pre>
              </details>
            </article>
          ))}
          {(problems.length >= 100 || runtime.length >= 50) && (
            <p className="text-xs">
              Lista limitada para manter o editor responsivo. Comece pelos primeiros problemas e
              execute novamente.
            </p>
          )}
        </div>
        {allowed
          .filter((tab) => tab.id === 'console' || tab.id === 'terminal')
          .map((tab) => (
            <div key={tab.id} id={`${id}-${tab.id}`} hidden={active !== tab.id} className="h-full">
              {(visited.has(tab.id) || active === tab.id) &&
                renderBottomPanel(tab.id === 'terminal' ? 'terminal' : 'console')}
            </div>
          ))}
      </div>
    </section>
  )
}
