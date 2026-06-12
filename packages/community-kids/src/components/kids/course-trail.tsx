import { Check, Gift, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { CourseDetailView } from '@/lib/types'
import { balloonLabel, buildTrail, type TrailNode } from './trail-layout'
import { UNIT_THEME_CLASS } from './unit-theme'

/** Mapa LITERAL (nunca montar classe por template string). */
const NODE_STATE_CLASS: Record<TrailNode['state'], string> = {
  done: 'kids-node--done',
  current: 'kids-node--current',
  todo: 'kids-node--todo',
}

/** Posições (0..1) dos conectores entre os centros de nós consecutivos. */
const DOT_STEPS = [0.55, 0.78] as const

function nodeAria(node: TrailNode): string {
  const status =
    node.state === 'done' ? 'concluída' : node.state === 'current' ? 'aula atual' : 'disponível'
  const minutes = node.lesson.estimatedMinutes ? ` — ${node.lesson.estimatedMinutes} min` : ''
  return `${node.lesson.title} (${status})${minutes}`
}

/** Conectores pontilhados entre dois centros consecutivos do serpenteado. */
function TrailDots({ from, to, done }: { from: number; to: number; done: boolean }) {
  return DOT_STEPS.map((t) => (
    <span
      key={t}
      className={cn('kids-trail-dot', done && 'kids-trail-dot--done')}
      style={{
        left: `calc(50% + ${from + (to - from) * t} * var(--trail-step) - 0.25rem)`,
        top: `calc(var(--trail-node) / 2 + ${t} * var(--trail-row))`,
      }}
    />
  ))
}

/**
 * Trilha estilo Duolingo: módulo = unidade com banner colorido (temas
 * alternando nas cores da marca), aula = nó circular serpenteante e fim de
 * unidade = BAÚ (abre com o módulo 100% — o +25 XP é do backend). Trilha
 * LIVRE: os nós de aula são clicáveis — o estado é só visual; o baú não é
 * clicável. Server Component puro (as animações são CSS do globals).
 *
 * Sem ícone por TIPO de aula (quiz/vídeo): LessonOutlineView não expõe os
 * blocos — seria mudança de backend, fora desta fatia.
 */
export function CourseTrail({ course }: { course: CourseDetailView }) {
  const units = buildTrail(course)
  const label = balloonLabel(course)
  const lessonHref = (id: string) =>
    `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(id)}`

  return (
    <div className="flex flex-col gap-10">
      {units.map((unit, unitIndex) => {
        const doneCount = unit.module.lessons.filter((l) => l.completed).length
        return (
          <section key={unit.module.id} className={UNIT_THEME_CLASS[unit.theme]}>
            <header className="kids-unit-banner px-5 py-4 md:px-6">
              <p className="[font-family:var(--font-display)] font-bold text-xs uppercase tracking-widest opacity-80">
                Unidade {unitIndex + 1}
              </p>
              <div className="flex items-end justify-between gap-3">
                <h2 className="sz-display text-lg md:text-xl">{unit.module.title}</h2>
                <span className="sz-display whitespace-nowrap text-sm">
                  {doneCount}/{unit.module.lessons.length} aulas
                </span>
              </div>
              {unit.module.summary ? (
                <p className="mt-1 text-sm opacity-85">{unit.module.summary}</p>
              ) : null}
            </header>

            <ol className="relative mt-10">
              {unit.nodes.map((node, nodeIndex) => {
                const next = unit.nodes[nodeIndex + 1]
                // Último nó da unidade conecta no BAÚ (mesma diagonal).
                const nextOffset = next?.offset ?? unit.chest?.offset
                return (
                  <li
                    key={node.lesson.id}
                    className="relative"
                    style={{ height: 'var(--trail-row)' }}
                  >
                    {nextOffset !== undefined ? (
                      <TrailDots from={node.offset} to={nextOffset} done={node.state === 'done'} />
                    ) : null}
                    <Link
                      href={lessonHref(node.lesson.id)}
                      aria-label={nodeAria(node)}
                      className="kids-node-link -ml-14 absolute top-0 flex w-28 flex-col items-center gap-1.5"
                      style={{ left: `calc(50% + ${node.offset} * var(--trail-step))` }}
                    >
                      {node.state === 'current' ? (
                        <span className="kids-balloon">{label}</span>
                      ) : null}
                      <span className={cn('kids-node', NODE_STATE_CLASS[node.state])}>
                        {node.state === 'done' ? (
                          <Check className="size-7" strokeWidth={3.5} />
                        ) : (
                          <Star className="size-7 fill-current" />
                        )}
                      </span>
                      <span
                        className={cn(
                          'line-clamp-2 max-w-24 text-center font-semibold text-xs leading-tight',
                          node.state === 'todo' ? 'text-muted-foreground' : 'text-foreground',
                        )}
                      >
                        {node.lesson.title}
                      </span>
                    </Link>
                  </li>
                )
              })}

              {unit.chest ? (
                <li className="relative" style={{ height: 'var(--trail-row)' }}>
                  <div
                    role="img"
                    aria-label={`Baú da unidade ${unitIndex + 1} (${unit.chest.opened ? 'aberto — você completou a unidade' : 'fechado — complete a unidade para abrir'})`}
                    className="-ml-14 absolute top-0 flex w-28 flex-col items-center gap-1.5"
                    style={{ left: `calc(50% + ${unit.chest.offset} * var(--trail-step))` }}
                  >
                    <span
                      className={cn(
                        'kids-node',
                        unit.chest.opened ? 'kids-node--chest-open' : 'kids-node--chest-closed',
                      )}
                    >
                      <Gift
                        className={cn('size-7', unit.chest.opened && 'kid-float')}
                        strokeWidth={2.5}
                      />
                    </span>
                    <span
                      className={cn(
                        'text-center font-semibold text-xs leading-tight',
                        unit.chest.opened ? 'sz-display-grad' : 'text-muted-foreground',
                      )}
                    >
                      {unit.chest.opened ? 'Baú aberto! +25 XP' : 'Baú da unidade'}
                    </span>
                  </div>
                </li>
              ) : null}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
