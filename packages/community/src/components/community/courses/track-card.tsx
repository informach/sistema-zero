import { ArrowRight, Check, MapIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { levelLabel, type TrackSummary, trackLabel } from '@/lib/course-levels'
import { TrackPath } from './track-path'

/** O texto de apoio da trilha: a Primeiros passos só é citada quando existe na trilha. */
export function trackLead(summary: Pick<TrackSummary<unknown>, 'levels'>): string {
  const start =
    summary.levels[0]?.level === 'primeiros-passos'
      ? 'Comece pelos primeiros passos e avance nível por nível.'
      : 'Avance nível por nível, no seu ritmo.'
  return `${start} Cada curso termina com um jogo seu, pronto para jogar.`
}

/**
 * O cartão de uma trilha em Cursos (Estúdio à noite, 25/10/2026): o caminho desenhado no alto, com o
 * selo Trilha, depois o nome do eixo com a contagem, o texto de apoio, um selo por nível com os
 * concluídos e o botão. O cartão inteiro leva à página da trilha. As trilhas ficam lado a lado no
 * palco de Cursos; a trilha em que a pessoa está (`primary`) leva o botão amarelo.
 */
export function TrackCard({
  summary,
  primary = false,
}: {
  summary: TrackSummary<unknown>
  primary?: boolean
}) {
  const total = summary.courses.length
  const label = trackLabel(summary.track)
  return (
    <Link
      href={`/cursos/trilha/${summary.track}`}
      prefetch={false}
      className="sz-card group flex flex-col overflow-hidden text-foreground no-underline transition-colors hover:border-foreground/40"
    >
      <div className="relative h-[10rem] bg-(--topo)">
        <TrackPath
          stops={summary.levels.map((level) => ({
            label: levelLabel(level.level),
            state: level.state,
          }))}
        />
        <span className="sz-chip sz-chip-escuro absolute bottom-3 left-4">
          <MapIcon aria-hidden />
          Trilha
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 md:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="sz-h2 text-[1.55rem] md:text-[1.7rem]">{label}</h3>
          <span className="sz-kicker">
            {total} {total === 1 ? 'curso' : 'cursos'}
          </span>
        </div>
        <p className="text-muted-foreground">{trackLead(summary)}</p>
        <ul aria-label="Níveis da trilha" className="flex flex-wrap gap-2.5">
          {summary.levels.map((level) => (
            <li
              key={level.level}
              className={cn(
                'sz-chip',
                level.state === 'done' && 'sz-chip-ok',
                level.state === 'current' && 'sz-chip-acao',
              )}
            >
              {level.state === 'done' ? <Check aria-hidden /> : null}
              {levelLabel(level.level)} · {level.done} de {level.courses.length}
            </li>
          ))}
        </ul>
        <span
          className={cn(
            'mt-auto self-start',
            primary ? 'sz-btn' : 'sz-btn-outline group-hover:bg-(--carta-2)',
          )}
        >
          Ver a trilha {summary.track.toUpperCase()}
          <ArrowRight aria-hidden />
        </span>
      </div>
    </Link>
  )
}
