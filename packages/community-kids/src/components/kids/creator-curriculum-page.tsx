import type { CreatorJourneyView } from '@sistemazero/core/journey'
import {
  CreatorJourneyMap,
  CreatorJourneySummary,
  CreatorPost,
} from '@sistemazero/member-shell/components/creator-journey'
import { creatorStageSummary } from '@sistemazero/member-shell/lib/creator-journey-presentation'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { CatalogCourseView, MyCourseView } from '@/lib/types'
import { CatalogCourseCard } from './catalog-course-card'
import { KidsBand } from './kids-band'

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
  return (
    <>
      <KidsBand tone="creme">
        <div className="mb-6 max-w-3xl">
          <p className="font-bold text-primary">Jornada do Criador</p>
          <h1 className="sz-display mt-2 text-3xl md:text-4xl">Seu próximo jogo começa aqui</h1>
          <p className="mt-3 text-muted-foreground">
            Aprenda uma lógica, crie em duas dimensões e transforme a ideia em algo seu.
          </p>
        </div>
        <CreatorJourneySummary view={view} skin="kids" catalog={courses} courses={mine} />
      </KidsBand>
      <KidsBand tone="ceu">
        <CreatorJourneyMap view={view} skin="kids" />
      </KidsBand>
      <KidsBand tone="lilas">
        <details className="kids-carta p-5 md:p-7">
          <summary className="sz-display min-h-11 cursor-pointer text-xl">
            Todos os cursos e seus acessos
          </summary>
          <p className="my-4 text-muted-foreground">
            Cursos avulsos e acessos já conquistados continuam aqui, com o mesmo progresso.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
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

export function KidsCreatorPost({
  view,
  level,
  courses,
}: {
  view: CreatorJourneyView
  level: string
  courses: CatalogCourseView[]
}) {
  const stage = view.stages.find((item) => item.level === level)
  // Maestrias include historical submissions/admissions and must use their canonical endpoint.
  if (!stage) redirect('/maestrias')
  return (
    <>
      <KidsBand tone="creme">
        <Link href="/cursos" className="inline-flex min-h-11 items-center font-bold text-primary">
          ← Voltar ao mapa
        </Link>
        <p className="mt-5 font-bold text-primary">
          {view.level === stage.level ? 'Seu posto atual' : 'Jornada do Criador'}
        </p>
        <h1 className="sz-display mt-2 text-3xl md:text-4xl">{stage.title}</h1>
        <p className="mt-3 font-semibold text-muted-foreground">{creatorStageSummary(stage)}</p>
      </KidsBand>
      <KidsBand tone="lilas">
        <CreatorPost stage={stage} catalog={courses} skin="kids" />
      </KidsBand>
    </>
  )
}
