import { type JSX, useMemo } from 'react'
import { createDictionaryTranslator } from '../../core/i18n/translator'
import type { ProjectTree } from '../../core/proProject'
import { isCurrentPageError, useLogsStore } from '../../state/logsStore'
import { useProRun } from '../../state/proRun'
import { useT } from '../../studio/i18n'
import { INVESTIGATE_COPY } from './investigateCopy'
import { proErrorSteps, proLineText } from './proInvestigation'

/**
 * A aba Investigar no Pro (proposta aprovada em 20/11/2026): o caminho até o erro que parou o
 * jogo, com o arquivo e a linha de cada passo e "Ir para a linha". Os passos vêm da pilha do erro
 * que a prévia já recebe (o `preview-message` do WebContainer, ou a ponte da prévia montada no
 * servidor); só os que são arquivos do projeto aparecem. Pausar e Valores não entram no Pro.
 */
export function ProInvestigatePanel({
  tree,
  navigate,
}: {
  tree: ProjectTree
  navigate: (path: string, line: number, column?: number) => void
}): JSX.Element {
  const base = useT()
  const t = useMemo(
    () => createDictionaryTranslator(INVESTIGATE_COPY, base.locale ?? 'pt-BR'),
    [base.locale],
  )
  const entries = useLogsStore((state) => state.entries)
  const pageLoadedAt = useProRun((state) => state.pageLoadedAt)
  const error = useMemo(
    () => [...entries].reverse().find((entry) => isCurrentPageError(entry, pageLoadedAt)) ?? null,
    [entries, pageLoadedAt],
  )
  const steps = useMemo(() => {
    if (!error?.errorStack) return []
    const raw = proErrorSteps(error.errorStack, (path) => tree[path]?.kind === 'file')
    // A pilha vem do erro para fora; a criança lê de onde o jogo veio até onde parou. A mesma
    // linha chamada de novo aparece uma vez só.
    const seen = new Set<string>()
    return raw.reverse().filter((step) => {
      const key = `${step.file}:${step.line}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [error, tree])

  if (!error)
    return (
      <p className="m-0 text-sm" data-sz-devtools="investigate">
        {t('inv.pro.none')}
      </p>
    )
  return (
    <div className="flex flex-col gap-2" data-sz-devtools="investigate">
      <p className="m-0 text-sm">
        <b>{t('inv.stopped.noFrame')}</b> {error.text.split('\n')[0]}
      </p>
      <article className="sz-pro-card px-3.5 pt-3 pb-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="m-0 font-bold">{t('inv.path')}</p>
          <span className="text-xs text-sz-fg-soft">{t('inv.path.from')}</span>
        </div>
        {steps.length === 0 ? <p className="m-0 py-1.5 text-sm">{t('inv.pro.noFiles')}</p> : null}
        {steps.map((step, index) => {
          const here = index === steps.length - 1
          const node = tree[step.file]
          const code = proLineText(node?.kind === 'file' ? node.content : undefined, step.line)
          return (
            <div
              key={`${step.file}:${step.line}`}
              className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-sz-border py-1.5"
            >
              <span className="text-xs font-bold text-sz-fg-soft">{index + 1}</span>
              <span className={`min-w-0 text-sm ${here ? 'font-bold' : ''}`}>
                {t('inv.pro.where', { file: step.file, line: step.line })}
                {here ? <span className="sz-pro-badge ml-1.5">{t('inv.path.here')}</span> : null}
                {code ? (
                  <code className="block truncate text-xs font-normal text-sz-fg-soft">{code}</code>
                ) : null}
              </span>
              <button
                type="button"
                className={`sz-pro-btn sz-pro-btn--sm ${here ? 'sz-pro-btn--primary' : ''}`}
                aria-label={t('inv.pro.goLabel', { file: step.file, line: step.line })}
                onClick={() => navigate(step.file, step.line, step.column)}
              >
                {t('inv.pro.go', { line: step.line })}
              </button>
            </div>
          )
        })}
      </article>
    </div>
  )
}
