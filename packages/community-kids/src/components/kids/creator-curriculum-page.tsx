import type { CreatorJourneyView } from '@sistemazero/core/journey'
import {
  creatorCurrentStage,
  creatorEntryCard,
  creatorEntryNote,
  creatorJourneyHint,
  creatorStageChecklist,
  creatorStageOpen,
  creatorStageTodo,
} from '@sistemazero/member-shell/lib/creator-journey-presentation'
import { ArrowRight, Map as MapIcon, Trophy, WandSparkles } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { levelInfo } from '@/lib/level-info'
import type { CatalogCourseView, MyCourseView } from '@/lib/types'
import { KidsBackButton } from './back-button'
import { CatalogCourseCard } from './catalog-course-card'
import { CreatorJourneyMapKids } from './creator-journey/map'
import { MissionCard, WideCourseCard } from './creator-journey/parts'
import { KidsCreatorTrail, type TrailCapabilities } from './creator-journey/trail'
import { KidsBand } from './kids-band'
import { KidsSectionHeader } from './kids-section-header'
import { KidsMascot } from './mascot'

/**
 * `/cursos` no currículo da Jornada do Criador (telas aprovadas de 25/10/2026): o cabeçalho
 * com "Você é…" e o que falta, o mapa em fita, a trilha de agora (missão, Poderes e os cursos
 * da trilha com o progresso) e, no fim, todos os cursos com os acessos de cada um.
 */
export function KidsCreatorCatalog({
  view,
  courses,
  mine,
}: {
  view: CreatorJourneyView
  courses: CatalogCourseView[]
  mine: MyCourseView[]
}) {
  const owned = new Map(mine.map((course) => [course.courseId, course]))
  const stage = creatorCurrentStage(view)
  const index = stage ? view.stages.indexOf(stage) : -1
  const nextTitle = view.stages[index + 1]?.title ?? 'Lenda'
  const current = levelInfo(view.level)
  const CurrentIcon = current.icon
  const todo = stage ? creatorStageTodo(stage, 'kids') : null
  const hint = view.paused
    ? creatorJourneyHint(view)
    : !stage
      ? 'Você chegou ao topo da jornada! Agora é hora das Maestrias.'
      : todo
        ? `Para virar ${nextTitle}: ${todo}.`
        : creatorJourneyHint(view)
  const mission = stage ? creatorEntryCard(stage.mission, courses, mine) : null

  return (
    <>
      <KidsBand tone="creme">
        <div className="flex flex-col items-center text-center">
          <h1 className="sz-display text-[clamp(2rem,3.4vw,2.8125rem)]">
            Cursos da Jornada do Criador
          </h1>
          <p className="mt-2.5 max-w-3xl font-medium text-[1.0625rem] text-muted-foreground">
            De Faísca a Lenda. Toque num nível para ver os cursos da trilha dele!
          </p>
          {/* O amarelo é cor de fundo e não segue o tema; a tinta escura dá 8,73:1 nele. */}
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-(--sz-kids-amarelo) px-4 py-2 font-extrabold text-(--sz-kids-tinta) text-[0.9375rem]">
            <CurrentIcon className="size-4" aria-hidden />
            Você é {current.label}
          </span>
          <p className="mt-4 max-w-2xl font-extrabold text-[0.9375rem]">{hint}</p>
        </div>
      </KidsBand>
      <KidsBand tone="ceu">
        <CreatorJourneyMapKids view={view} missionLessons={mission?.lessons ?? null} />
      </KidsBand>
      <KidsBand tone="lilas">
        {stage ? <CurrentTrail view={view} courses={courses} mine={mine} /> : <LegendNow />}
        {/* Uma Maestria abre antes da Lenda (depois dos cursos de uma trilha): com o nó da Lenda
            trancado no mapa, este é o caminho até ela. */}
        {stage && view.masteries.some((area) => area.available) ? <MasteriesOpen /> : null}
      </KidsBand>
      <KidsBand tone="lilas">
        <details className="kids-carta group/todos p-5 md:p-7">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="sz-display block text-xl md:text-2xl">
                Todos os cursos e seus acessos
              </span>
              <span className="mt-1 block font-medium text-[0.9375rem] text-muted-foreground">
                Cursos avulsos e acessos já conquistados continuam aqui, com o mesmo progresso.
              </span>
            </span>
            <span className="sz-btn-gradient sz-btn-suave shrink-0 gap-2 px-5">
              <span className="group-open/todos:hidden">Mostrar</span>
              <span className="hidden group-open/todos:inline">Esconder</span>
            </span>
          </summary>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {courses.map((course) => (
              <CatalogCourseCard
                key={course.courseId}
                course={course}
                salesUrl={course.salesPageUrl}
                mine={owned.get(course.courseId) ?? null}
              />
            ))}
          </div>
        </details>
      </KidsBand>
    </>
  )
}

/** "Sua trilha agora": o que dá para fazer já, na ordem que faz sentido para a criança. */
function CurrentTrail({
  view,
  courses,
  mine,
}: {
  view: CreatorJourneyView
  courses: CatalogCourseView[]
  mine: MyCourseView[]
}) {
  const stage = creatorCurrentStage(view)!
  const list = creatorStageChecklist(stage)
  const base2d = creatorEntryCard(stage.base2d, courses, mine)
  const base3d = creatorEntryCard(stage.base3d, courses, mine)
  const mission = creatorEntryCard(stage.mission, courses, mine)
  const trailCourses = (
    <>
      <li>
        <WideCourseCard
          card={base2d}
          note={creatorEntryNote(base2d.status)}
          eyebrow="Curso da trilha"
        />
      </li>
      <li>
        <WideCourseCard
          card={base3d}
          note={creatorEntryNote(base3d.status, { role: 'base3d' })}
          eyebrow="Curso da trilha"
        />
      </li>
    </>
  )
  const remaining = Math.max(0, list.powers.required - list.powers.done)
  const powersOpen = stage.pairCompleted
  return (
    <section aria-labelledby="trilha-agora">
      <KidsSectionHeader
        id="trilha-agora"
        title={`Sua trilha agora: ${stage.title}`}
        subtitle="Os cursos ensinam, a missão mostra o que você aprendeu e os Poderes trazem mecânicas novas."
        actions={
          <Link
            href={`/cursos/trilha/${stage.level}`}
            prefetch={false}
            className="sz-btn-gradient gap-2 px-5"
          >
            Abrir a trilha <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
      <ul className="flex flex-col gap-4">
        {stage.pairCompleted ? null : trailCourses}
        <li>
          <MissionCard
            card={mission}
            note={creatorEntryNote(mission.status, { role: 'after-pair' })}
          />
        </li>
        <li>
          <div className="kids-carta flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--band-ceu) text-(--sz-kids-azul-texto)">
              <WandSparkles className="size-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-muted-foreground text-xs">Poderes</p>
              <p className="sz-display mt-0.5 text-xl">
                {list.powers.complete
                  ? `Você já tem ${list.powers.required === 1 ? 'o Poder' : 'os Poderes'} desta trilha!`
                  : `Você já tem ${list.powers.done} de ${list.powers.required} ${list.powers.required === 1 ? 'Poder' : 'Poderes'}`}
              </p>
              <p className="mt-1 font-medium text-[0.9375rem] text-muted-foreground">
                {!powersOpen
                  ? 'Os Poderes abrem quando você termina os cursos da trilha.'
                  : list.powers.complete
                    ? `Quer mais? Ainda há ${stage.powers.length - list.powers.done} para explorar nesta trilha.`
                    : `Escolha ${list.powers.done > 0 ? 'mais ' : ''}${remaining} entre os ${stage.powers.length} desta trilha.`}
              </p>
            </div>
            <div className="w-full shrink-0 md:w-56">
              <div className="sz-progress" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.round((Math.min(list.powers.done, list.powers.required) / list.powers.required) * 100)}%`,
                  }}
                />
              </div>
              <Link
                href={`/cursos/trilha/${stage.level}#poderes`}
                prefetch={false}
                className="sz-btn-gradient sz-btn-suave mt-3.5 w-full gap-2"
              >
                {powersOpen ? 'Escolher Poderes' : 'Ver os Poderes'}
              </Link>
            </div>
          </div>
        </li>
        {stage.pairCompleted ? trailCourses : null}
      </ul>
    </section>
  )
}

/** Na Lenda o mapa termina: o convite é para as Maestrias. */
function LegendNow() {
  return (
    <section
      aria-label="Maestrias"
      className="kids-carta flex flex-col items-center gap-4 px-6 py-10 text-center md:px-10"
    >
      <span className="grid size-16 place-items-center rounded-2xl bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)">
        <Trophy className="size-8" aria-hidden />
      </span>
      <h2 className="sz-display text-2xl md:text-[1.75rem]">Agora é a vez das Maestrias</h2>
      <p className="max-w-xl font-medium text-[0.9375rem] text-muted-foreground">
        Escolha no que quer ficar craque. Cada Maestria tem três níveis, e a equipe acompanha o seu
        projeto em cada um.
      </p>
      <Link href="/maestrias" prefetch={false} className="sz-btn-gradient gap-2 px-6">
        Ver as Maestrias <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

/** Uma Maestria já abriu antes da Lenda: o convite fica embaixo da trilha de agora. */
function MasteriesOpen() {
  return (
    <section
      aria-label="Maestrias abertas"
      className="kids-carta mt-6 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center md:p-6"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)">
        <Trophy className="size-7" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="sz-display text-xl">Você já pode começar uma Maestria</h2>
        <p className="font-medium text-[0.9375rem] text-muted-foreground">
          Os cursos que você fez abriram uma área para ficar craque. Dá para começar agora, sem
          esperar a Lenda.
        </p>
      </div>
      <Link
        href="/maestrias"
        prefetch={false}
        className="sz-btn-gradient sz-btn-suave shrink-0 gap-2 whitespace-nowrap px-5"
      >
        Ver as Maestrias <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  )
}

/** A trilha que a criança ainda não alcançou: o recado do mapa de sempre, sem os cursos. */
function KidsLockedTrail({ title }: { title: string }) {
  return (
    <KidsBand tone="creme">
      <KidsBackButton href="/cursos" label="Voltar ao mapa" showLabel className="mb-6" />
      <div className="kids-carta mx-auto flex w-full max-w-lg flex-col items-center px-6 py-10 text-center md:px-10">
        <KidsMascot expression="thinking" className="kid-float size-24" />
        <h1 className="sz-display mt-4 text-2xl md:text-[2rem]">
          Esta parte do mapa ainda está bloqueada
        </h1>
        <p className="mt-4 font-medium text-[1.0625rem] text-muted-foreground">
          Veja no mapa o que falta para abrir a Trilha {title}. Suas conquistas continuam guardadas.
        </p>
        <Link href="/cursos" prefetch={false} className="sz-btn-gradient mt-6 gap-2 px-6">
          <MapIcon className="size-4" aria-hidden /> Voltar ao mapa
        </Link>
      </div>
    </KidsBand>
  )
}

/** A trilha de um posto; a Lenda não é trilha, é o hub das Maestrias. */
export function KidsCreatorPost({
  view,
  level,
  courses,
  mine,
  capabilities,
}: {
  view: CreatorJourneyView
  level: string
  courses: CatalogCourseView[]
  mine: MyCourseView[]
  capabilities?: TrailCapabilities
}) {
  const stage = view.stages.find((item) => item.level === level)
  // Maestrias include historical submissions/admissions and must use their canonical endpoint.
  if (!stage) redirect('/maestrias')
  // A trava do mapa: posto não alcançado não abre pelo endereço também.
  if (!creatorStageOpen(stage)) return <KidsLockedTrail title={stage.title} />
  return (
    <KidsCreatorTrail
      view={view}
      level={stage.level}
      catalog={courses}
      mine={mine}
      capabilities={capabilities}
    />
  )
}
