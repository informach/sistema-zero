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
 * O cartão de uma trilha em Cursos (direção de arte de 18/10/2026): o selo Trilha com a contagem,
 * o nome do eixo, o texto de apoio, um selo por nível com os concluídos e o caminho desenhado.
 * O cartão inteiro leva à página da trilha.
 */
export function TrackCard({ summary }: { summary: TrackSummary<unknown> }) {
  const total = summary.courses.length
  return (
    <Link
      href={`/cursos/trilha/${summary.track}`}
      prefetch={false}
      className="sz-card group flex flex-col overflow-hidden text-foreground no-underline transition-colors hover:border-foreground/40 md:flex-row"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 md:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="sz-chip sz-chip-escuro">
            <MapIcon aria-hidden />
            Trilha
          </span>
          <span className="sz-kicker">
            {total} {total === 1 ? 'curso' : 'cursos'}
          </span>
        </div>
        <h3 className="sz-h2 text-[1.55rem] md:text-[1.7rem]">{trackLabel(summary.track)}</h3>
        <p className="text-muted-foreground">{trackLead(summary)}</p>
        <ul aria-label="Níveis da trilha" className="mt-1 flex flex-wrap gap-3">
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
        <span className="sz-btn mt-2 self-start group-hover:bg-(--primary-hover)">
          Ver a trilha
          <ArrowRight aria-hidden />
        </span>
      </div>
      <div className="relative hidden min-h-[15rem] bg-(--topo) md:block md:flex-[0_0_46%]">
        <TrackPath
          stops={summary.levels.map((level) => ({
            label: levelLabel(level.level),
            state: level.state,
          }))}
        />
      </div>
    </Link>
  )
}
