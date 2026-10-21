import {
  isKidsStaffPreview,
  kidsJourneyAccess,
} from '@sistemazero/member-shell/lib/kids-journey-access'
import { Sparkles } from 'lucide-react'
import { CatalogCourseCard } from '@/components/kids/catalog-course-card'
import { JourneyMap } from '@/components/kids/journey-map'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
import { KidsMascot } from '@/components/kids/mascot'
import { accessibleJourneyLevels, coursesForLevel, tierCompletionByLevel } from '@/lib/journey-map'
import { canonicalJourneyProgress, canonicalPendingCourses } from '@/lib/journey-presentation'
import { levelInfo } from '@/lib/level-info'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import {
  checkStudioAccessReadonly,
  getGamificationReadonly,
  getStudioUnlocksReadonly,
  listCatalog,
  listMyCourses,
} from '@/server/members'

export const dynamic = 'force-dynamic'

/** Map and trails read the canonical published view; curricular counters remain separate. */
export default async function CatalogPage() {
  const [{ status, body }, gamification, studioRes, mineRes, unlocksRes] = await Promise.all([
    listCatalog(),
    getGamificationReadonly(),
    // Posse do Estúdio Completo (produto vendido à parte): só com ela o estado
    // "em dia" oferece criar um jogo. Best-effort — soluço só esconde o atalho.
    checkStudioAccessReadonly().catch(() => null),
    // O progresso das aventuras (aulas feitas) mora em "Meus cursos"; o catálogo é vitrine.
    // Best-effort: sem ele, o cartão cai no "Liberado" + "Acessar aventura".
    listMyCourses().catch(() => null),
    // Os blocos conquistados: sem nenhum, o Estúdio livre está trancado e o atalho some.
    getStudioUnlocksReadonly().catch(() => null),
  ])
  if (status !== 200) throw new Error('Falha ao carregar o catálogo')
  const courses = body?.courses ?? []
  /**
   * O contador "N de M aventuras prontas" de cada medalhão.
   *
   * ⭐ Os marcos vêm DENTRO de cada curso do catálogo (`milestones`), então não há uma
   * segunda busca a fazer nem um "progresso desconhecido" a tratar: se o catálogo carregou,
   * o contador é confiável; se não carregou, a página inteira já falhou acima.
   */
  const journey = kidsJourneyAccess(gamification.status === 200 ? gamification.body : null)
  if (!journey)
    return (
      <KidsBand tone="creme">
        <p role="status">
          Sua jornada está indisponível agora. Suas conquistas continuam guardadas. Tente novamente
          daqui a pouco.
        </p>
      </KidsBand>
    )
  const completionByLevel = tierCompletionByLevel(courses, journey)
  // ⚠️ POSSE não basta: o Estúdio LIVRE só abre no Construtor (`freeStudio`) e com algum
  // bloco conquistado. Sem isso o "em dia" → "Criar um jogo meu" cairia na tela de Estúdio
  // trancado. Clique morto: por isso o atalho exige as três (ver `canOpenFreeStudio`).
  const studioOwned = canOpenFreeStudio(
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true,
    journey,
    unlocksRes,
  )

  if (!isKidsStaffPreview(journey)) {
    const level = journey.earned.level
    const current = levelInfo(level)
    const CurrentIcon = current.icon
    const progress = canonicalJourneyProgress(journey)
    const aventuras = coursesForLevel(level, courses, journey)
    const trailIds = new Set(aventuras.map((course) => course.courseId))
    const coursesById = new Map(courses.map((course) => [course.courseId, course]))
    const requiredOutsideTrail = canonicalPendingCourses(journey).flatMap((requirement) => {
      const course = coursesById.get(requirement.courseId)
      return course && !trailIds.has(course.courseId)
        ? [{ course, milestone: requirement.milestone }]
        : []
    })
    const trilha = completionByLevel[level]
    const mine = new Map(
      (mineRes?.status === 200 ? (mineRes.body?.courses ?? []) : []).map((c) => [c.courseSlug, c]),
    )
    const titleBySlug = new Map(courses.map((c) => [c.courseSlug, c.title]))

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
            {progress.hint ? (
              <p className="mt-4 max-w-2xl font-extrabold text-[0.9375rem]">{progress.hint}</p>
            ) : null}
          </div>
        </KidsBand>
        {/* O mapa é a tela inteira: faixa azul-céu do começo ao fim, como na
            referência, com a fita e os medalhões por cima dela. */}
        <KidsBand tone={aventuras.length > 0 ? 'ceu' : 'lilas'}>
          {/* O cliente recebe a política e os postos com aventuras acessíveis, sem todo o catálogo. */}
          <JourneyMap
            journey={journey}
            accessibleLevels={accessibleJourneyLevels(journey, courses)}
            completionByLevel={completionByLevel}
            studioOwned={studioOwned}
          />
        </KidsBand>
        {requiredOutsideTrail.length > 0 ? (
          <KidsBand tone="lilas">
            <section aria-labelledby="proximas-aventuras">
              <KidsSectionHeader
                id="proximas-aventuras"
                title="Próximos cursos"
                subtitle="Estes cursos fazem parte do seu próximo passo."
              />
              <ul className="grid gap-4">
                {requiredOutsideTrail.map(({ course, milestone }) => (
                  <li key={course.courseId}>
                    <p className="mb-2 font-semibold text-sm">
                      {milestone === 'complete'
                        ? 'Termine este curso.'
                        : 'Termine e publique o seu jogo no Mural.'}
                    </p>
                    <CatalogCourseCard
                      layout="linha"
                      course={course}
                      mine={mine.get(course.courseSlug) ?? null}
                      salesUrl={course.salesPageUrl}
                      foundationTitle={
                        course.careerLock?.foundationCourseSlug
                          ? (titleBySlug.get(course.careerLock.foundationCourseSlug) ?? null)
                          : null
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          </KidsBand>
        ) : null}
        {aventuras.length > 0 ? (
          <KidsBand tone="lilas">
            <section aria-labelledby="aventuras-da-trilha">
              <KidsSectionHeader
                id="aventuras-da-trilha"
                title={`Cursos da trilha ${current.label}`}
                subtitle="Toque num curso para abrir."
                actions={
                  trilha && trilha.total > 0 ? (
                    <span className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 font-extrabold text-sm">
                      <Sparkles className="size-4 text-primary" aria-hidden />
                      {trilha.done} de {trilha.total}{' '}
                      {trilha.total === 1 ? 'curso pronto' : 'cursos prontos'}
                    </span>
                  ) : undefined
                }
              />
              <ul className="grid gap-4">
                {aventuras.map((course) => (
                  <li key={course.courseSlug}>
                    <CatalogCourseCard
                      layout="linha"
                      course={course}
                      mine={mine.get(course.courseSlug) ?? null}
                      salesUrl={course.salesPageUrl}
                      foundationTitle={
                        course.careerLock?.foundationCourseSlug
                          ? (titleBySlug.get(course.careerLock.foundationCourseSlug) ?? null)
                          : null
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          </KidsBand>
        ) : null}
      </>
    )
  }

  return (
    <>
      <KidsBand tone="creme">
        <h1 className="sz-display text-[clamp(2rem,3.4vw,2.8125rem)]">Prévia dos cursos</h1>
        <p className="mt-2.5 max-w-3xl font-medium text-[1.0625rem] text-muted-foreground">
          Visualização da equipe. Esta prévia não concede postos ou conquistas.
        </p>
      </KidsBand>
      <KidsBand tone="lilas">
        {courses.length === 0 ? (
          <div className="kids-carta flex flex-col items-center gap-4 px-6 py-12 text-center">
            <KidsMascot expression="thinking" className="kid-float size-16" />
            <p className="sz-display text-xl">Os cursos estão a caminho! Volte daqui a pouco.</p>
          </div>
        ) : (
          <CatalogGrid courses={courses} />
        )}
      </KidsBand>
    </>
  )
}

/** Explicit, authorized staff preview, without a virtual child rank. */
function CatalogGrid({
  courses,
}: {
  courses: NonNullable<Awaited<ReturnType<typeof listCatalog>>['body']>['courses']
}) {
  const titleBySlug = new Map(courses.map((c) => [c.courseSlug, c.title]))
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {courses.map((course) => (
        <CatalogCourseCard
          key={course.courseSlug}
          course={course}
          salesUrl={course.salesPageUrl}
          foundationTitle={
            course.careerLock?.foundationCourseSlug
              ? (titleBySlug.get(course.careerLock.foundationCourseSlug) ?? null)
              : null
          }
        />
      ))}
    </div>
  )
}
