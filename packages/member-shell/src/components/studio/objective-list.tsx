'use client'

import type { ProjectObjectiveView } from '@sistemazero/core/learning'
import { CheckCircle2, Circle, CircleDot, Lightbulb } from 'lucide-react'
import { useLessonCopy } from '../lesson-copy-context'

export type EstadoDoObjetivo = 'passed' | 'failed' | 'unchecked'

/**
 * A lista de objetivos com o estado de cada um (ícone, cor e o texto para o leitor de tela) e a
 * dica depois de uma verificação que não passou. Usada pelo cartão de objetivos das aulas e pelo
 * Estúdio de desafio do Arquipélago, que mostram os objetivos do mesmo jeito.
 */
export function ObjectiveList({
  items,
  estadoDe,
  stale,
  extra = false,
}: {
  items: ProjectObjectiveView[]
  estadoDe: (id: string) => EstadoDoObjetivo
  stale: boolean
  extra?: boolean
}) {
  const { verificacao } = useLessonCopy()
  return (
    <ul className="sz-lesson-objectives-list space-y-2">
      {items.map((objective) => {
        const estado = estadoDe(objective.id)
        const Icone = estado === 'passed' ? CheckCircle2 : estado === 'failed' ? CircleDot : Circle
        return (
          <li
            key={objective.id}
            className="sz-lesson-objective flex items-start gap-2.5 text-sm"
            data-state={estado}
            data-extra={extra ? 'true' : undefined}
            data-stale={stale && estado !== 'unchecked' ? 'true' : undefined}
          >
            <Icone
              className={`sz-lesson-objective-icon mt-0.5 size-5 shrink-0 ${
                estado === 'passed'
                  ? 'text-success'
                  : estado === 'failed'
                    ? 'text-primary'
                    : 'text-muted-foreground'
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span
                className={`sz-lesson-objective-label ${
                  stale && estado !== 'unchecked' ? 'text-muted-foreground' : ''
                }`}
              >
                {objective.label}
              </span>
              <span className="sr-only">
                {': '}
                {estado === 'passed'
                  ? verificacao.estadoCumprido
                  : estado === 'failed'
                    ? verificacao.estadoFalta
                    : verificacao.estadoNaoVerificado}
              </span>
              {/* A dica só aparece quando ajuda: depois de uma verificação em que o objetivo
                  ainda não passou. Antes disso ela tiraria a descoberta. */}
              {estado === 'failed' && objective.hint ? (
                <span className="sz-lesson-objective-hint mt-1 flex items-start gap-1.5 text-muted-foreground">
                  <Lightbulb className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    <b className="font-semibold">{verificacao.dica}:</b> {objective.hint}
                  </span>
                </span>
              ) : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
