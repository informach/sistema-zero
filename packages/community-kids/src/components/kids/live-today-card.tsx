import type { LiveTodayView } from '@sistemazero/member-shell/lib/live/journey'
import { friendlyWhen, liveHour } from '@sistemazero/member-shell/lib/live/schedule'
import { ArrowRight, CalendarDays, Laptop } from 'lucide-react'
import { KidsEyebrow } from './kids-eyebrow'

/**
 * "Seu encontro é hoje" no alto da Início (proposta J de 23/10/2026). No celular "Oficinas" não
 * está na barra de abas, e sem este cartão a criança não tinha caminho até a sala. Só existe para
 * quem tem encontro hoje: sem ele, a Início fica exatamente como era.
 *
 * ⚠️ `<a>` e não `<Link>`: a sala libera câmera e microfone pelos cabeçalhos da PRÓPRIA rota.
 */
export function LiveTodayCard({ live }: { live: LiveTodayView }) {
  const { session, cohort, state } = live
  const start = session.occurrenceStartsAt ?? session.startsAt
  const lobby = new Date(Date.parse(start) - 15 * 60_000)
  const teacherId = cohort.teacherIds.find((id) => cohort.teacherNames?.[id])
  const teacher = teacherId ? cohort.teacherNames?.[teacherId] : null
  const open = state === 'live' || state === 'soon'
  return (
    <section
      aria-labelledby="live-today"
      className="kids-marca mb-6 flex flex-col gap-4 rounded-[1.75rem] p-6 md:mb-7 md:flex-row md:items-end md:justify-between md:p-7"
    >
      <div className="min-w-0 space-y-2">
        <KidsEyebrow icon={CalendarDays}>
          {state === 'live' ? 'Seu encontro está ao vivo' : 'Seu encontro é hoje'}
        </KidsEyebrow>
        <h2 id="live-today" className="sz-display text-[clamp(1.5rem,2.6vw,2rem)] leading-tight">
          {session.title}
        </h2>
        <p className="font-bold text-lg">
          {friendlyWhen(start, cohort.timeZone)} ·{' '}
          {state === 'live'
            ? 'já começou'
            : state === 'soon'
              ? 'a sala já abriu'
              : `a sala abre às ${liveHour(lobby, cohort.timeZone)}`}
        </p>
        <p className="kids-marca-suave font-medium">
          {cohort.title}
          {teacher ? ` · com ${teacher}` : ''}
        </p>
        <p className="kids-marca-tile flex items-start gap-2 rounded-2xl px-3 py-2 font-semibold text-sm md:hidden">
          <Laptop className="mt-0.5 size-4 shrink-0" aria-hidden />
          No celular você assiste e conversa com a turma. Para criar junto, entre pelo computador.
        </p>
      </div>
      <a
        href={`/oficinas/aulas/${session.id}`}
        className="sz-btn-inverso inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-7 font-extrabold text-lg"
      >
        {open ? 'Entrar na sala' : 'Ver o encontro'}
        <ArrowRight className="size-5" aria-hidden />
      </a>
    </section>
  )
}
