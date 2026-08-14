import { CareerMap } from '@/components/kids/career-map'
import { CatalogCourseCard } from '@/components/kids/catalog-course-card'
import { KidsMascot } from '@/components/kids/mascot'
import { unitThemeAt } from '@/components/kids/unit-theme'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import { checkStudioAccessReadonly, getGamificationReadonly, listCatalog } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Mapa da Carreira (24/07): a página de cursos É o mapa — serpentina com os
 * níveis (Faísca→Lenda); clicar num nível liberado abre `/cursos/trilha/[level]`
 * com a listagem daquela trilha. Sem busca/filtros aqui (decisão da usuária).
 * Gamificação fora (`level` nulo) → cai na grade clássica simples (o mapa
 * precisa do nível p/ pintar os nós). O mapa desenha até o HORIZONTE do catálogo
 * (ver `lib/career-horizon.ts`), por isso o `courses` vai junto.
 */
export default async function CatalogPage() {
  const [{ status, body }, gamification, studioRes, session] = await Promise.all([
    listCatalog(),
    getGamificationReadonly(),
    // Posse do Estúdio Completo (produto vendido à parte): só com ela o estado
    // "em dia" oferece criar um jogo. Best-effort — soluço só esconde o atalho.
    checkStudioAccessReadonly().catch(() => null),
    getSession(),
  ])
  if (status !== 200) throw new Error('Falha ao carregar o catálogo')
  const courses = body?.courses ?? []
  const level = gamification.status === 200 ? (gamification.body?.level ?? null) : null
  // ⚠️ POSSE não basta: o Estúdio LIVRE só abre no Construtor (`freeStudio`). Uma Faísca
  // com o produto comprado e o catálogo vazio cairia em "em dia" → "Criar um jogo meu" →
  // tela de Estúdio bloqueado pela carreira. Clique morto — por isso o atalho exige as duas.
  const studioOwned = canOpenFreeStudio(
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true,
    level?.slug,
    session?.role,
  )

  if (level) {
    return (
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h1 className="sz-display text-2xl md:text-3xl">Cursos da Carreira de Criador</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Sua jornada de Faísca a Lenda. Toque num nível para ver os cursos da trilha dele!
          </p>
        </div>
        {/* Recorte de 3 campos: o mapa é CLIENTE e a view inteira mandaria título,
            capa e URL de vendas de todos os cursos no payload para calcular o horizonte. */}
        <CareerMap
          level={level}
          courses={courses.map((c) => ({
            level: c.level,
            track: c.track,
            careerSlot: c.careerSlot,
          }))}
          studioOwned={studioOwned}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="sz-display text-2xl md:text-3xl">Todos os cursos</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Suas aventuras de aprender: as que já são suas e as que você ainda pode ganhar.
        </p>
      </div>

      {courses.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border border-dashed px-6 py-16 text-center">
          <KidsMascot expression="thinking" className="size-16" />
          <p className="text-muted-foreground text-sm">
            Os cursos estão a caminho! Volte daqui a pouquinho. 🚀
          </p>
        </section>
      ) : (
        <CatalogGrid courses={courses} />
      )}
    </div>
  )
}

/** Grade clássica (fallback sem gamificação) — mesma dos cards do catálogo. */
function CatalogGrid({
  courses,
}: {
  courses: NonNullable<Awaited<ReturnType<typeof listCatalog>>['body']>['courses']
}) {
  const titleBySlug = new Map(courses.map((c) => [c.courseSlug, c.title]))
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, i) => (
        <CatalogCourseCard
          key={course.courseSlug}
          course={course}
          salesUrl={course.salesPageUrl}
          foundationTitle={
            course.careerLock?.foundationCourseSlug
              ? (titleBySlug.get(course.careerLock.foundationCourseSlug) ?? null)
              : null
          }
          theme={unitThemeAt(i)}
        />
      ))}
    </div>
  )
}
