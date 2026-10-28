import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { CourseCatalogClient } from '@/components/community/course-catalog-client'
import { TrackCard } from '@/components/community/courses/track-card'
import {
  AdultCreatorNextStep,
  AdultCreatorStepper,
  AdultMasteriesOpen,
} from '@/components/community/journey/creator'
import { PageBand, PageBody } from '@/components/community/page'
import { summarizeTrack, TRACKS } from '@/lib/course-levels'
import type { CourseProgress } from '@/lib/types'
import { listCatalog, listMyCourses } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Cursos (direção de arte de 18/10/2026): as trilhas que têm curso publicado e "Todos os cursos".
 * O catálogo traz o acesso, o nível, o eixo e os marcos; Meus cursos traz as aulas feitas da
 * barra. Sem acesso → a página de vendas (`metadata.salesPageUrl`, senão a oferta de continuidade
 * da Comunidade, `lockedCourseLink`).
 */
export default async function CatalogPage() {
  const [catalog, mine, gamification, session] = await Promise.all([
    listCatalog(),
    listMyCourses().catch(() => null),
    shell.members.getGamificationReadonly({ withRanking: true }).catch(() => null),
    getSession(),
  ])
  // A equipe abre todas as etapas da régua; numa sessão de suporte o papel é o da pessoa.
  const staff = isPrivilegedRole(session?.role)
  const curriculum =
    gamification?.status === 200 ? gamification.body?.journey?.curriculum : undefined
  const courses = catalog.status === 200 ? (catalog.body?.courses ?? []) : []
  const myCourses = mine?.status === 200 ? (mine.body?.courses ?? []) : []
  const progressBySlug: Record<string, CourseProgress> = Object.fromEntries(
    myCourses.map((course) => [course.courseSlug, course.progress]),
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
            ? 'Sete etapas até a Lenda. Em cada uma, os cursos da trilha em 2D e 3D, uma missão para criar um jogo seu e os Poderes para ampliá-lo.'
            : 'Cada curso termina com um jogo seu, pronto para jogar e mostrar. Comece por uma trilha e avance um nível de cada vez.'
        }
      >
        {/* As trilhas no palco: é por elas que se descobre o caminho (Estúdio à noite). */}
        {curriculum ? (
          <section aria-labelledby="jornada-do-criador" className="mt-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="jornada-do-criador" className="sz-h3">
                Jornada do Criador
              </h2>
              <Link
                href="/progresso"
                prefetch={false}
                className="sz-link inline-flex min-h-11 items-center"
              >
                Ver seu progresso
              </Link>
            </div>
            <AdultCreatorStepper view={curriculum} staff={staff} />
            <AdultCreatorNextStep view={curriculum} catalog={courses} mine={myCourses} />
            <AdultMasteriesOpen view={curriculum} />
          </section>
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
