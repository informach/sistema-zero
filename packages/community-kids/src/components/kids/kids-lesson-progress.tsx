import type { SectionProgressView } from '@sistemazero/core/learning'
import { type AtividadeDaAula, type PosicaoNaAula, vistaProgressoAula } from '@/lib/lesson-progress'

/**
 * O progresso da AULA na barra de cima (telas-modelo de 11/09/2026): a barra verde e
 * o número em negrito. A régua de três degraus vive em `lib/lesson-progress.ts`.
 *
 * ⚠️ Ela não pode sumir: o esqueleto (`loading.tsx`) reserva o espaço dela, então uma
 * barra ausente vira um vão no cartão do topo. Foi o que aconteceu com a conta de
 * EQUIPE e com toda aula legada, para as quais o members não manda `sectionProgress`.
 * Sem NADA a medir (uma seção só e nenhuma atividade obrigatória) ela vira o
 * espaçador, porque inventar um número seria pior que não mostrar nenhum.
 */
export function KidsLessonProgress({
  progress,
  posicao,
  atividades,
}: {
  progress?: SectionProgressView
  posicao: PosicaoNaAula | null
  atividades?: readonly AtividadeDaAula[]
}) {
  const vista = vistaProgressoAula(progress, posicao, atividades)
  if (!vista.medivel) return <div className="flex-1" />
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div
        className="sz-progress flex-1"
        role="progressbar"
        aria-label="Progresso da aula"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(vista.percent)}
        aria-valuetext={vista.texto}
      >
        <span style={{ width: `${vista.percent}%` }} />
      </div>
      {vista.numero ? (
        <span
          aria-hidden="true"
          className="shrink-0 whitespace-nowrap font-extrabold text-[0.9375rem] tabular-nums"
        >
          {vista.numero}
        </span>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {vista.texto}
      </span>
    </div>
  )
}
