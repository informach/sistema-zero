import { moduleRiveSrc } from '@sistemazero/core/course/module-rive'
import { Check, Lock, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { CourseDetailView } from '@/lib/types'
import { KidsMascot } from './mascot'
import { TrailChest } from './trail-chest'
import { balloonLabel, buildTrail, type TrailNode, type TrailUnit } from './trail-layout'
import { TrailRive } from './trail-rive'
import { UNIT_THEME_CLASS } from './unit-theme'

/** Mapa LITERAL (nunca montar classe por template string). */
const NODE_STATE_CLASS: Record<TrailNode['state'], string> = {
  done: 'kids-node--done',
  current: 'kids-node--current',
  todo: 'kids-node--todo',
  locked: 'kids-node--locked',
}

/** A arte atravessa duas linhas; escolhe o par de nós mais distante do seu lado. */
function trailArtRow(unit: TrailUnit, side: 'left' | 'right'): number {
  const offsets = [...unit.nodes.map((node) => node.offset), unit.chest.offset]
  const direction = side === 'left' ? 1 : -1
  let bestRow = 0
  let bestSpace = -Infinity
  for (let row = 0; row < offsets.length - 1; row++) {
    const space = direction * ((offsets[row] ?? 0) + (offsets[row + 1] ?? 0))
    if (space > bestSpace) {
      bestSpace = space
      bestRow = row
    }
  }
  return bestRow
}

function nodeAria(node: TrailNode): string {
  const status =
    node.state === 'done'
      ? 'concluída'
      : node.state === 'current'
        ? 'aula atual'
        : node.state === 'locked'
          ? // Descritivo, não imperativo: a aula anterior pode estar "em breve" (não
            // concluível), e mandar concluí-la seria pedir o impossível. Sem travessão,
            // que é regra de voz da casa e ainda por cima o leitor de tela soletra.
            'bloqueada, abre quando a anterior for concluída'
          : 'disponível'
  const minutes = node.lesson.estimatedMinutes ? `, ${node.lesson.estimatedMinutes} min` : ''
  return `${node.lesson.title} (${status})${minutes}`
}

/**
 * Trilha estilo Duolingo: módulo = unidade com banner colorido (temas
 * alternando nas cores da marca), aula = nó circular serpenteante e fim de
 * unidade = BAÚ. Desde 09/2026 o baú é CLICÁVEL: a criança abre e AÍ ganha o XP
 * (antes ele caía sozinho ao concluir a última aula do módulo). Por isso o baú é
 * a única ilha `'use client'` daqui — ver `trail-chest.tsx`. O resto segue Server
 * Component puro, com as animações no CSS do globals.
 *
 * Sem ícone por TIPO de aula (quiz/vídeo): LessonOutlineView não expõe os
 * blocos — seria mudança de backend, fora desta fatia.
 */
export function CourseTrail({ course }: { course: CourseDetailView }) {
  const units = buildTrail(course)
  const label = balloonLabel(course)
  const lessonHref = (id: string) =>
    `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(id)}`

  // Curso sem NENHUMA aula publicada: antes de esconder os módulos vazios, aqui
  // apareciam os banners deles (com "0/0 aulas"); agora não sobra nada, e uma
  // área em branco depois da capa lê como página quebrada. O recado é curto e
  // diz o que fazer: voltar depois.
  if (units.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-10 text-center">
        <KidsMascot expression="sleeping" className="size-20" />
        <h2 className="mt-4 sz-display text-xl">As aulas estão sendo preparadas</h2>
        <p className="mt-2 text-muted-foreground">
          Este curso ainda não tem aulas prontas para você. Volte daqui a pouco para ver as
          novidades!
        </p>
      </section>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-10">
      {units.map((unit, unitIndex) => {
        const doneCount = unit.module.lessons.filter((l) => l.completed).length
        const art = moduleRiveSrc(unit.module.riveUrl)
        const artSide = unitIndex % 2 === 0 ? 'left' : 'right'
        const artRow = trailArtRow(unit, artSide)
        const artTop = Math.round(((artRow + 0.65) / (unit.nodes.length + 1)) * 10_000) / 100
        return (
          <section key={unit.module.id} className={UNIT_THEME_CLASS[unit.theme]}>
            <header className="kids-unit-banner px-5 py-4 md:px-6">
              {/* Sem `opacity-*` no texto da faixa: a tinta a 80% caía para 4,04:1 no azul e
                  3,45:1 na laranja (medido na paleta do Pen, 11/09/2026). */}
              <p className="[font-family:var(--font-display)] font-bold text-xs uppercase tracking-widest">
                Unidade {unitIndex + 1}
              </p>
              <div className="flex items-end justify-between gap-3">
                <h2 className="sz-display text-lg md:text-xl">{unit.module.title}</h2>
                <span className="sz-display whitespace-nowrap text-sm">
                  {doneCount}/{unit.module.lessons.length} aulas
                </span>
              </div>
              {unit.module.summary ? <p className="mt-1 text-sm">{unit.module.summary}</p> : null}
            </header>

            <div className="relative mt-10">
              {art ? (
                <div
                  data-trail-art
                  aria-hidden="true"
                  className={cn(
                    'kids-trail-art',
                    artSide === 'left' ? 'kids-trail-art--left' : 'kids-trail-art--right',
                  )}
                  style={{ top: `${artTop}%` }}
                >
                  <TrailRive src={art} />
                </div>
              ) : null}
              <ol className="relative z-10">
                {unit.nodes.map((node) => {
                  return (
                    <li
                      key={node.lesson.id}
                      className="relative"
                      style={{ height: 'var(--trail-row)' }}
                    >
                      {(() => {
                        const inner = (
                          <>
                            {node.state === 'current' ? (
                              <span className="kids-balloon">{label}</span>
                            ) : null}
                            <span className={cn('kids-node', NODE_STATE_CLASS[node.state])}>
                              {node.state === 'done' ? (
                                <Check className="size-7" strokeWidth={3.5} />
                              ) : node.state === 'locked' ? (
                                <Lock className="size-6" strokeWidth={2.5} />
                              ) : (
                                <Star className="size-7 fill-current" />
                              )}
                            </span>
                            <span
                              className={cn(
                                'line-clamp-2 max-w-24 text-center font-semibold text-xs leading-tight',
                                node.state === 'done' || node.state === 'current'
                                  ? 'text-foreground'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {node.lesson.title}
                            </span>
                          </>
                        )
                        const className =
                          'kids-node-link -ml-14 absolute top-0 flex w-28 flex-col items-center gap-1.5'
                        const style = { left: `calc(50% + ${node.offset} * var(--trail-step))` }
                        // Aula travada: nó NÃO clicável (a regra de acesso é do backend).
                        return node.state === 'locked' ? (
                          <div
                            role="img"
                            aria-label={nodeAria(node)}
                            className={cn(className, 'cursor-not-allowed')}
                            style={style}
                          >
                            {inner}
                          </div>
                        ) : (
                          <Link
                            href={lessonHref(node.lesson.id)}
                            aria-label={nodeAria(node)}
                            className={className}
                            style={style}
                          >
                            {inner}
                          </Link>
                        )
                      })()}
                    </li>
                  )
                })}

                <li className="relative" style={{ height: 'var(--trail-row)' }}>
                  <TrailChest
                    courseSlug={course.slug}
                    moduleId={unit.module.id}
                    unitNumber={unitIndex + 1}
                    // Sem `chest` do servidor (curso adulto, ou resposta de um
                    // deploy anterior) o baú fica DECORATIVO: prometer "ganhe 0 XP"
                    // num botão seria pior que não ter botão.
                    chest={unit.module.chest}
                    offset={unit.chest.offset}
                  />
                </li>
              </ol>
            </div>
          </section>
        )
      })}
    </div>
  )
}
