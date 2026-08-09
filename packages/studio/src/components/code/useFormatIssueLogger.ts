import { useCallback } from 'react'
import type { MonacoFormatIssue } from '#monaco'
import { PREVIEW_MESSAGE_SOURCE } from '#preview'
import { useLogsStore } from '../../state/logsStore'
import { useT } from '../../studio/i18n'

/**
 * Handler compartilhado do `onFormatIssue` do MonacoTabs (Ponte e PRO): leva a
 * falha de formatação ao CONSOLE da IDE — visível ao aluno/QA sem DevTools,
 * como já acontece com os erros de sintaxe da Ponte. `no-provider` ganha
 * mensagem própria ("ainda carregando, tente de novo"); o resto cai na
 * genérica.
 */
export function useFormatIssueLogger(): (issue: MonacoFormatIssue) => void {
  const t = useT()
  const pushLog = useLogsStore((s) => s.push)
  return useCallback(
    (issue: MonacoFormatIssue) => {
      const key =
        issue === 'no-provider' ? 'editor.formatIssue.noProvider' : 'editor.formatIssue.failed'
      pushLog({
        source: PREVIEW_MESSAGE_SOURCE,
        kind: 'warn',
        parts: [t(key)],
        timestamp: Date.now(),
      })
    },
    [pushLog, t],
  )
}
