import { BookOpen } from 'lucide-react'
import { CourseCatalogClient } from '@/components/community/course-catalog-client'
import { NciContinuityCard } from '@/components/community/courses/continuity-card'
import { TrackCard } from '@/components/community/courses/track-card'
import { PageBand, PageBody } from '@/components/community/page'
import { showNciContinuityCard } from '@/lib/continuity'
import { summarizeTrack, TRACKS } from '@/lib/course-levels'
import type { CourseProgress } from '@/lib/types'
import { listCatalog, listMyCourses } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Cursos (direção de arte de 18/10/2026): as trilhas que têm curso publicado e "Todos os cursos".
 * O catálogo traz o acesso, o nível, o eixo e os marcos; Meus cursos traz as aulas feitas da
 * barra. Sem acesso → a página de vendas (`metadata.salesPageUrl`, senão a oferta de continuidade
 * da Comunidade, `lockedCourseLink`). Quem tem o No Comando da IA e não tem a Comunidade vê o
 * cartão de continuidade no topo (`showNciContinuityCard`; falha fechada, sem cartão em erro).
 */
export default async function CatalogPage() {
  const [catalog, mine, continuity] = await Promise.all([
    listCatalog(),
    listMyCourses().catch(() => null),
    shell.members.checkCommunityContinuityAccessReadonly().catch(() => null),
  ])
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

  return (
    <>
      <PageBand
        kicker="Catálogo da comunidade"
        title="Cursos"
        lead="Os cursos que já são seus e os que você ainda pode conhecer, organizados por trilha."
      />
      <PageBody>
        {showNciContinuityCard(continuity) ? <NciContinuityCard /> : null}
        {courses.length === 0 ? (
          <section className="sz-card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <BookOpen className="size-9 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">Nenhum curso publicado ainda.</p>
          </section>
        ) : (
          <>
            {tracks.length > 0 ? (
              <section aria-labelledby="trilhas" className="flex flex-col gap-5">
                <h2 id="trilhas" className="sz-h2">
                  Trilhas
                </h2>
                {tracks.map((summary) => (
                  <TrackCard key={summary.track} summary={summary} />
                ))}
              </section>
            ) : null}
            {/* Busca/filtros client-side persistidos na URL (?q=&acesso=&ordem=). */}
            <CourseCatalogClient courses={courses} progressBySlug={progressBySlug} />
          </>
        )}
      </PageBody>
    </>
  )
}
