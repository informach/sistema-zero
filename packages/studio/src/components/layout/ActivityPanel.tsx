import type { JSX } from 'react'
import { Button } from '#ui'
import { useActivityRunner } from '../../activity/useActivityRunner'
import type { ActivityCheck } from '../../studio/activity'
import { useStudioActivity } from '../../studio/activity'

/**
 * Painel da ATIVIDADE com auto-correção do `<StudioLesson>`.
 *
 * Self-gating: lê `useStudioActivity()` e retorna `null` quando não há atividade
 * (default `null` — sempre o caso do `<StudioEditor>`). Assim pode ficar montado
 * no layout wide sem perturbar o editor puro: sem atividade, não acrescenta DOM.
 *
 * Mostra o enunciado + botão "Verificar" (roda as checagens no cliente — structure
 * no IR, comportamento/teste/código no sandbox oculto) + o resultado por checagem
 * com a dica de como consertar. O resultado fica na `checksStore` para o host
 * anexar no envio (correção híbrida).
 */
export function ActivityPanel(): JSX.Element | null {
  const activity = useStudioActivity()
  const runner = useActivityRunner(activity ?? { instructions: '', checks: [] })
  if (!activity) return null

  const checkById = new Map<string, ActivityCheck>(activity.checks.map((c) => [c.id, c]))
  const result = runner.result

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-sz-border bg-sz-panel">
      <div className="flex items-center justify-between gap-2 border-b border-sz-border px-4 py-3">
        <h2 className="text-sm font-semibold text-sz-fg">Atividade</h2>
        {result ? (
          <span className="text-xs font-medium text-sz-fg-soft">
            {result.score}/100
            {activity.passingScore !== undefined ? (
              <span className={result.passed ? ' text-emerald-500' : ' text-red-500'}>
                {result.passed ? ' · aprovado' : ` · mín. ${activity.passingScore}`}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="whitespace-pre-wrap px-4 py-3 text-sm text-sz-fg-soft">
        {activity.instructions}
      </div>

      <div className="px-4 pb-3">
        <Button
          size="sm"
          variant="primary"
          onClick={() => void runner.run()}
          disabled={runner.running}
        >
          {runner.running ? 'Verificando…' : 'Verificar'}
        </Button>
      </div>

      {result ? (
        <ul className="flex flex-col gap-2 px-4 pb-4">
          {result.results.map((r) => {
            const check = checkById.get(r.checkId)
            return (
              <li
                key={r.checkId}
                className="rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span className={r.passed ? 'text-emerald-500' : 'text-red-500'} aria-hidden>
                    {r.passed ? '✓' : '✗'}
                  </span>
                  <span className="min-w-0 flex-1 text-sz-fg">{check?.label ?? r.checkId}</span>
                </div>
                {!r.passed ? (
                  <p className="mt-1 pl-5 text-xs text-sz-fg-soft">
                    {check?.hint ?? r.message ?? 'Ainda não passou.'}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </aside>
  )
}
