import type { JSX } from 'react'
import { Button } from '#ui'
import { useActivityRunner } from '../../activity/useActivityRunner'
import type { ActivityCheck } from '../../studio/activity'
import { useStudioActivity } from '../../studio/activity'
import { useStudioLayout } from '../../studio/layoutContext'
import { renderLessonMarkdown } from './lessonMarkdown'

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
 *
 * Responsivo: no WIDE é uma coluna lateral (`w-80`, à esquerda do modo); no NARROW
 * (kids no celular/embed estreito) vira uma faixa horizontal NO TOPO, com altura
 * limitada — sem ela, o aluno em tela estreita ficava sem o "Verificar" e o gate
 * reprovava em silêncio toda checagem não-estrutural (6º review, achado A).
 */
export function ActivityPanel(): JSX.Element | null {
  const activity = useStudioActivity()
  const runner = useActivityRunner(activity ?? { instructions: '', checks: [] })
  const isNarrow = useStudioLayout().isNarrow
  if (!activity) return null

  const checkById = new Map<string, ActivityCheck>(activity.checks.map((c) => [c.id, c]))
  const result = runner.result

  return (
    <aside
      className={
        isNarrow
          ? 'flex max-h-[45%] w-full shrink-0 flex-col overflow-y-auto border-b border-sz-border bg-sz-panel'
          : 'flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-sz-border bg-sz-panel'
      }
    >
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

      {/* Enunciado em markdown (autorado no admin via TipTap). renderLessonMarkdown
          escapa todo HTML do autor e só reintroduz um subconjunto seguro — é
          seguro para dangerouslySetInnerHTML (ver lessonMarkdown.ts). */}
      <div
        className="flex flex-col gap-2 px-4 py-3 text-sm text-sz-fg-soft"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML saneado por renderLessonMarkdown (escape-first + subconjunto seguro)
        dangerouslySetInnerHTML={{ __html: renderLessonMarkdown(activity.instructions) }}
      />

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

      {/* Micro-celebração (07/2026): a vitória acontece AQUI, onde o esforço
          acontece — antes a lista sóbria de checks era o único feedback. */}
      {result && result.results.length > 0 && result.results.every((r) => r.passed) ? (
        <output className="sz-activity-pop mx-4 mb-2 block rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600">
          <span aria-hidden>🎉✨ </span>
          Você conseguiu! Todas as checagens passaram.
        </output>
      ) : null}

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
