import { type JSX, useId, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ErrorBoundary, IconChevronDown, IconChevronUp, IconRefresh } from '#ui'
import { isPythonProject } from '../../core/editableProject'
import { useDiagnosticsStore } from '../../state/diagnosticsStore'
import { useHighlightStoreApi } from '../../state/highlightStore'
import { useLogsStore } from '../../state/logsStore'
import { useProjectStore } from '../../state/projectStore'
import { useProRun, useProRunApi } from '../../state/proRun'
import { type ClassicDockTab, useUIStore } from '../../state/uiStore'
import { useStudioConfig } from '../../studio/config'
import { useT } from '../../studio/i18n'
import { useStudioTutor } from '../../studio/tutor'
import { ConsolePanel } from '../console/ConsolePanel'
import { SectionErrorFallback } from './ErrorViews'

type OpenTab = Exclude<ClassicDockTab, 'closed'>

/**
 * A gaveta de baixo do Estúdio clássico (blocos e Ponte, JavaScript e Python; redesenho de
 * 11/2026, D4): sempre à vista, fechada só com as abas e os contadores. Duas abas, com as
 * classes da gaveta do Pro: **Mensagens do jogo** (o console, sem os erros: eles moram nos
 * Problemas) e **Problemas** (o erro que parou o jogo, o código da Ponte que não vira blocos,
 * os avisos dos blocos e os rascunhos soltos).
 *
 * O erro segue UM caminho: o palco avisa ("Opa, o jogo parou"), a aba Problemas conta e o bloco
 * ganha o sinal vermelho; "Mostrar o bloco" rola até ele e abre o balão.
 *
 * `variant="tab"`: no estreito a gaveta vira a aba "Mensagens" (sempre aberta, sem o
 * Abrir/Fechar), e `onRevealBlock` traz a aba dos blocos depois do "Mostrar o bloco".
 */
export function ClassicDock({
  variant = 'drawer',
  onRevealBlock,
}: {
  variant?: 'drawer' | 'tab'
  onRevealBlock?: () => void
}): JSX.Element {
  const t = useT()
  const config = useStudioConfig()
  const tutor = useStudioTutor()
  const highlight = useHighlightStoreApi()
  const proRun = useProRunApi()
  const python = useProjectStore((s) => Boolean(s.project && isPythonProject(s.project)))
  const selected = useUIStore((s) => s.classicDock)
  const setSelected = useUIStore((s) => s.setClassicDock)
  // No Python as Mensagens são também o "Experimentar comandos": o erro de um comando digitado
  // tem de aparecer ali, então só o JavaScript tira os erros das Mensagens.
  const messageCount = useLogsStore(
    // Conta o que as Mensagens mostram: no JavaScript, tudo menos o erro que parou o jogo (que
    // mora em Problemas); o `console.error` do aluno continua contando aqui.
    (s) =>
      s.entries.filter(
        (entry) => python || (entry.kind !== 'runtimeError' && entry.kind !== 'unhandledRejection'),
      ).length,
  )
  const runError = useProRun(
    useShallow((s) =>
      s.state?.phase === 'error' && s.state.errorKind === 'runtime'
        ? {
            hint: s.state.errorHint ?? null,
            technical: s.state.error ?? null,
            located: Boolean(s.state.errorAt),
            canRun: Boolean(s.actions && s.state.canRun),
          }
        : null,
    ),
  )
  const { drafts, issues, codeIssue } = useDiagnosticsStore(
    useShallow((s) => ({
      drafts: s.draftBlockIds,
      issues: s.semanticIssues,
      codeIssue: s.codeIssue,
    })),
  )
  const subject = python ? 'program' : 'game'
  const tabs: OpenTab[] = [...(config.console ? (['console'] as const) : []), 'problems']
  const tabMode = variant === 'tab'
  // No estreito a aba "Mensagens" está sempre aberta: a escolhida, ou a primeira.
  const active: ClassicDockTab = tabs.includes(selected as OpenTab)
    ? selected
    : tabMode
      ? (tabs[0] ?? 'problems')
      : 'closed'
  const open = active !== 'closed'
  const problemCount = (runError ? 1 : 0) + (codeIssue ? 1 : 0) + issues.length
  const id = useId()
  // O console só monta depois de aberto a primeira vez (como na gaveta do Pro), e fica montado.
  const [consoleVisited, setConsoleVisited] = useState(active === 'console')
  const choose = (tab: OpenTab) => {
    if (tab === 'console') setConsoleVisited(true)
    setSelected(!tabMode && active === tab ? 'closed' : tab)
  }
  const reveal = (target: { kind: 'runtime' } | { kind: 'block'; blockId: string }) => {
    highlight.getState().revealBlock(target)
    onRevealBlock?.()
  }
  const label = (tab: OpenTab) =>
    tab === 'console' ? t(`pro.dock.messages.${subject}`) : t('pro.dock.problems')

  return (
    <section
      className="sz-pro-dock sz-classic-dock"
      data-variant={variant}
      aria-label={t('pro.dock.label')}
    >
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
              onClick={() => choose(tab)}
            >
              <span>{label(tab)}</span>
              {tab === 'problems' && problemCount ? (
                <span className="sz-pro-badge">{problemCount}</span>
              ) : null}
              {tab === 'console' && messageCount ? (
                <span className="sz-pro-badge sz-pro-badge--quiet">{messageCount}</span>
              ) : null}
            </button>
          ))}
        </div>
        {!tabMode ? (
          <button
            type="button"
            className="sz-pro-btn sz-pro-btn--sm"
            aria-expanded={open}
            aria-label={open ? t('pro.dock.close') : t('pro.dock.open')}
            onClick={() => (open ? setSelected('closed') : choose(tabs[0] ?? 'problems'))}
          >
            {open ? <IconChevronDown /> : <IconChevronUp />}
            <span className="sz-pro-dock__toggle-label">
              {open ? t('pro.dock.close') : t('pro.dock.open')}
            </span>
          </button>
        ) : null}
      </div>
      <div hidden={!open} className="sz-pro-dock__body">
        <div
          id={`${id}-problems`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-problems`}
          hidden={active !== 'problems'}
          className="h-full space-y-2 overflow-auto p-3"
        >
          {!problemCount && !drafts.length ? (
            <p className="m-0 text-sm">{t('dock.problems.none')}</p>
          ) : null}
          {runError ? (
            <article className="sz-pro-card flex flex-col gap-2 p-3 text-sm">
              <p className="m-0 text-xs font-bold text-sz-error">
                {t(`pro.problems.runtime.${subject}`)}
              </p>
              <p className="m-0 font-bold leading-snug">
                {runError.hint ??
                  t(runError.located ? 'stage.error.stopped.hint' : 'pro.problems.runtimeFallback')}
              </p>
              <div className="flex flex-wrap gap-2">
                {runError.located ? (
                  <button
                    type="button"
                    className="sz-pro-btn sz-pro-btn--sm sz-pro-btn--primary"
                    onClick={() => reveal({ kind: 'runtime' })}
                  >
                    {t('stage.showBlock')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="sz-pro-btn sz-pro-btn--sm"
                  disabled={!runError.canRun}
                  onClick={() => {
                    // Como a barra: roda e traz o jogo à vista (no estreito, a aba do jogo).
                    const { actions, revealStage } = proRun.getState()
                    actions?.run()
                    revealStage?.()
                  }}
                >
                  <IconRefresh />
                  {t('run.runAgain')}
                </button>
                {tutor.config ? (
                  <button
                    type="button"
                    className="sz-pro-btn sz-pro-btn--sm"
                    onClick={() => tutor.setOpen(true)}
                  >
                    {t('pro.problems.askZappy')}
                  </button>
                ) : null}
              </div>
              {runError.technical ? (
                <details className="text-xs">
                  <summary className="cursor-pointer text-sz-fg-soft">
                    {t('stage.error.technical')}
                  </summary>
                  <pre className="m-0 whitespace-pre-wrap break-words">{runError.technical}</pre>
                </details>
              ) : null}
            </article>
          ) : null}
          {codeIssue ? (
            <article className="sz-pro-card flex flex-col gap-2 p-3 text-sm">
              <p className="m-0 text-xs font-bold text-sz-error">
                {t(
                  codeIssue.kind === 'semantic'
                    ? 'dock.problems.code.semantic'
                    : 'dock.problems.code.syntax',
                )}
              </p>
              <p className="m-0 font-bold leading-snug">{t('dock.problems.code.hint')}</p>
              <details className="text-xs">
                <summary className="cursor-pointer text-sz-fg-soft">
                  {t('stage.error.technical')}
                </summary>
                <pre className="m-0 whitespace-pre-wrap break-words">{codeIssue.message}</pre>
              </details>
            </article>
          ) : null}
          {issues.map((issue) => (
            <article
              key={`${issue.blockId ?? ''}:${issue.message}`}
              className="sz-pro-card flex flex-col gap-2 p-3 text-sm"
            >
              <p className="m-0 text-xs font-bold text-sz-warn">{t('dock.problems.block')}</p>
              <p className="m-0 font-bold leading-snug">{issue.message}</p>
              {issue.blockId ? (
                <div>
                  <button
                    type="button"
                    className="sz-pro-btn sz-pro-btn--sm"
                    onClick={() =>
                      issue.blockId && reveal({ kind: 'block', blockId: issue.blockId })
                    }
                  >
                    {t('stage.showBlock')}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {drafts.length ? (
            <article className="sz-pro-card flex flex-col gap-2 p-3 text-sm">
              <p className="m-0 text-xs font-bold text-sz-fg-soft">{t('dock.problems.drafts')}</p>
              <p className="m-0 leading-snug">
                {t(drafts.length === 1 ? 'dock.problems.drafts.one' : 'dock.problems.drafts.many', {
                  count: drafts.length,
                })}
              </p>
              <div>
                <button
                  type="button"
                  className="sz-pro-btn sz-pro-btn--sm"
                  onClick={() => {
                    const first = drafts[0]
                    if (first) reveal({ kind: 'block', blockId: first })
                  }}
                >
                  {t('dock.problems.drafts.show')}
                </button>
              </div>
            </article>
          ) : null}
        </div>
        {config.console ? (
          <div
            id={`${id}-console`}
            role="tabpanel"
            aria-labelledby={`${id}-tab-console`}
            hidden={active !== 'console'}
            className="h-full"
          >
            {consoleVisited || active === 'console' ? (
              <ErrorBoundary
                label="console"
                fallback={(props) => (
                  <SectionErrorFallback {...props} title="O console falhou ao carregar" />
                )}
              >
                <ConsolePanel variant={python ? 'repl' : 'messages'} omitErrors={!python} />
              </ErrorBoundary>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
