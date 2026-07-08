'use client'

import { InfoTooltip } from '@sistemazero/ui/info-tooltip'
import { lintLightCopy } from '@/lib/lightcopy'

/**
 * Feedback passivo do Light Copy: mostra ao vivo os erros mecânicos do texto
 * (travessão, exclamação, pergunta no gancho…). Não bloqueia nada — é dica de
 * estilo da casa. Some quando o texto está limpo ou vazio.
 */
export function LightCopyHints({ text }: { text: string }) {
  const issues = lintLightCopy(text)
  if (issues.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Light Copy:</span>
      {issues.map((issue) => (
        <span
          key={issue.rule}
          className="inline-flex items-center gap-1 rounded-full bg-chart-5/15 px-2 py-0.5 text-xs text-chart-5"
        >
          {issue.label}
          <InfoTooltip text={issue.fix} />
        </span>
      ))}
    </div>
  )
}
