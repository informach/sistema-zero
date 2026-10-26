import {
  CreatorJourneyMap,
  CreatorJourneySummary,
} from '@sistemazero/member-shell/components/creator-journey'
import { BookOpen } from 'lucide-react'
import { CourseCatalogClient } from '@/components/community/course-catalog-client'
import { TrackCard } from '@/components/community/courses/track-card'
import { PageBand, PageBody } from '@/components/community/page'
import { summarizeTrack, TRACKS } from '@/lib/course-levels'
import type { CourseProgress } from '@/lib/types'
import { listCatalog, listMyCourses } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Cursos (direção de arte de 18/10/2026): as trilhas que têm curso publicado e "Todos os cursos".
 * O catálogo traz o acesso, o nível, o eixo e os marcos; Meus cursos traz as aulas feitas da
 * barra. Sem acesso → a página de vendas (`metadata.salesPageUrl`, senão a oferta de continuidade
 * da Comunidade, `lockedCourseLink`).
 */
export default async function CatalogPage() {
  const [catalog, mine, gamification] = await Promise.all([
    listCatalog(),
    listMyCourses().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
  ])
  const curriculum =
    gamification?.status === 200 ? gamification.body?.journey?.curriculum : undefined
  const courses = catalog.status === 200 ? (catalog.body?.courses ?? []) : []
  const progressBySlug: Record<string, CourseProgress> = Object.fromEntries(
    (mine?.status === 200 ? (mine.body?.courses ?? []) : []).map((course) => [
      course.courseSlug,
      course.progress,
    ]),
  )
  const withProgress = courses.map((course) => ({
    ...course,
    progress: progressBySlug[course.courseSlug] ?? null,
  }))
  const tracks = TRACKS.map((track) => summarizeTrack(withProgress, track)).filter(
    (summary) => summary.courses.length > 0,
  )

  // O botão amarelo vai para a trilha em que a pessoa está (a primeira com nível em andamento).
  const primaryTrack = tracks.find((summary) =>
    summary.levels.some((level) => level.state === 'current'),
  )?.track

  return (
    <>
      <PageBand
        kicker="Catálogo da comunidade"
        title="Cursos"
        lead={
          curriculum
            ? 'Crie um jogo em 2D e 3D, transfira a lógica para uma missão e amplie sua criação com poderes.'
            : 'Cada curso termina com um jogo seu, pronto para jogar e mostrar. Comece por uma trilha e avance um nível de cada vez.'
        }
      >
        {/* As trilhas no palco: é por elas que se descobre o caminho (Estúdio à noite). */}
        {curriculum ? (
          <div className="mt-6 space-y-8">
            <CreatorJourneySummary
              view={curriculum}
              skin="adult"
              catalog={courses}
              courses={mine?.status === 200 ? mine.body.courses : []}
            />
            <CreatorJourneyMap view={curriculum} skin="adult" />
          </div>
        ) : tracks.length > 0 ? (
          <section aria-labelledby="trilhas" className="mt-6 flex flex-col gap-5">
            <h2 id="trilhas" className="sz-h3">
              Trilhas
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {tracks.map((summary) => (
                <TrackCard
                  key={summary.track}
                  summary={summary}
                  primary={summary.track === primaryTrack}
                />
              ))}
            </div>
          </section>
        ) : null}
      </PageBand>
      <PageBody>
        {courses.length === 0 ? (
          <section className="sz-card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <BookOpen className="size-9 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">Nenhum curso publicado ainda.</p>
          </section>
        ) : (
          <>
            {/* Busca/filtros client-side persistidos na URL (?q=&acesso=&ordem=). */}
            <CourseCatalogClient courses={courses} progressBySlug={progressBySlug} />
          </>
        )}
      </PageBody>
    </>
  )
}
