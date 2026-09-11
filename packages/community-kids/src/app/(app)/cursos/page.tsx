import { Sparkles } from 'lucide-react'
import { CareerMap } from '@/components/kids/career-map'
import { CatalogCourseCard } from '@/components/kids/catalog-course-card'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsSectionHeader } from '@/components/kids/kids-section-header'
import { KidsMascot } from '@/components/kids/mascot'
import { careerProgress } from '@/lib/career-horizon'
import { coursesForLevel, tierCompletionByLevel } from '@/lib/career-map'
import { levelInfo } from '@/lib/level-info'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import type { StudentLevelSlug } from '@/lib/types'
import {
  checkStudioAccessReadonly,
  getGamificationReadonly,
  listCatalog,
  listMyCourses,
} from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Mapa da Carreira (24/07): a página de cursos É o mapa — serpentina com os
 * níveis (Faísca→Lenda); clicar num nível liberado abre `/cursos/trilha/[level]`
 * com a listagem daquela trilha. Sem busca/filtros aqui (decisão da usuária).
 * Gamificação fora (`level` nulo) → cai na grade clássica simples (o mapa
 * precisa do nível p/ pintar os nós). O mapa desenha até o HORIZONTE do catálogo
 * (ver `lib/career-horizon.ts`), por isso o `courses` vai junto.
 *
 * Desenho das telas-modelo (11/09/2026): o cabeçalho centralizado leva o chip amarelo
 * "Você é <posto>" e a frase do próximo marco (moravam dentro do mapa), e a página fecha
 * no lilás com as AVENTURAS da trilha atual em cartões deitados, com o progresso de cada
 * uma. O mapa continua com os medalhões de verdade (`public/carreira/*.webp`).
 */
export default async function CatalogPage() {
  const [{ status, body }, gamification, studioRes, session, mineRes] = await Promise.all([
    listCatalog(),
    getGamificationReadonly(),
    // Posse do Estúdio Completo (produto vendido à parte): só com ela o estado
    // "em dia" oferece criar um jogo. Best-effort — soluço só esconde o atalho.
    checkStudioAccessReadonly().catch(() => null),
    getSession(),
    // O progresso das aventuras (aulas feitas) mora em "Meus cursos"; o catálogo é vitrine.
    // Best-effort: sem ele, o cartão cai no "Liberado" + "Acessar curso".
    listMyCourses().catch(() => null),
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
  const level = gamification.status === 200 ? (gamification.body?.level ?? null) : null
  const completionByLevel = tierCompletionByLevel(courses)
  // ⚠️ POSSE não basta: o Estúdio LIVRE só abre no Construtor (`freeStudio`). Uma Faísca
  // com o produto comprado e o catálogo vazio cairia em "em dia" → "Criar um jogo meu" →
  // tela de Estúdio bloqueado pela carreira. Clique morto — por isso o atalho exige as duas.
  const studioOwned = canOpenFreeStudio(
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true,
    level?.slug,
    session?.role,
  )

  if (level) {
    const current = levelInfo(level.slug)
    const CurrentIcon = current.icon
    const progress = careerProgress(level, courses)
    const aventuras = coursesForLevel(level.slug, courses)
    const trilha = completionByLevel[level.slug as StudentLevelSlug]
    const mine = new Map(
      (mineRes?.status === 200 ? (mineRes.body?.courses ?? []) : []).map((c) => [c.courseSlug, c]),
    )
    const titleBySlug = new Map(courses.map((c) => [c.courseSlug, c.title]))

    return (
      <>
        <KidsBand tone="creme">
          <div className="flex flex-col items-center text-center">
            <h1 className="sz-display text-[clamp(2rem,3.4vw,2.8125rem)]">
              Cursos da Carreira de Criador
            </h1>
            <p className="mt-2.5 max-w-3xl font-medium text-[1.0625rem] text-muted-foreground">
              Sua jornada de Faísca a Lenda. Toque num nível para ver os cursos da trilha dele!
            </p>
            {/* O amarelo é cor de fundo e não segue o tema; a tinta escura dá 8,73:1 nele. */}
            <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-(--sz-kids-amarelo) px-4 py-2 font-extrabold text-(--sz-kids-tinta) text-[0.9375rem]">
              <CurrentIcon className="size-4" aria-hidden />
              Você é {current.label}
            </span>
            {progress.kind === 'pending' ? (
              <p className="mt-4 max-w-2xl font-extrabold text-[0.9375rem]">{progress.hint}</p>
            ) : null}
          </div>
        </KidsBand>
        {/* O mapa é a tela inteira: faixa azul-céu do começo ao fim, como na
            referência, com a fita e os medalhões por cima dela. */}
        <KidsBand tone={aventuras.length > 0 ? 'ceu' : 'lilas'}>
          {/* Recorte de 3 campos: o mapa é CLIENTE e a view inteira mandaria título,
              capa e URL de vendas de todos os cursos no payload para calcular o horizonte. */}
          <CareerMap
            level={level}
            courses={courses.map((c) => ({
              level: c.level,
              track: c.track,
              careerSlot: c.careerSlot,
            }))}
            completionByLevel={completionByLevel}
            studioOwned={studioOwned}
          />
        </KidsBand>
        {aventuras.length > 0 ? (
          <KidsBand tone="lilas">
            <section aria-labelledby="aventuras-da-trilha">
              <KidsSectionHeader
                id="aventuras-da-trilha"
                title={`Aventuras da trilha ${current.label}`}
                subtitle="Toque numa aventura para abrir o curso."
                actions={
                  trilha && trilha.total > 0 ? (
                    <span className="inline-flex h-10 items-center gap-2 rounded-full bg-card px-4 font-extrabold text-sm">
                      <Sparkles className="size-4 text-primary" aria-hidden />
                      {trilha.done} de {trilha.total}{' '}
                      {trilha.total === 1 ? 'aventura pronta' : 'aventuras prontas'}
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
        <h1 className="sz-display text-[clamp(2rem,3.4vw,2.8125rem)]">Todos os cursos</h1>
        <p className="mt-2.5 max-w-3xl font-medium text-[1.0625rem] text-muted-foreground">
          Suas aventuras de aprender: as que já são suas e as que você ainda pode ganhar.
        </p>
      </KidsBand>
      <KidsBand tone="lilas">
        {courses.length === 0 ? (
          <div className="kids-carta flex flex-col items-center gap-4 px-6 py-12 text-center">
            <KidsMascot expression="thinking" className="kid-float size-16" />
            <p className="sz-display text-xl">
              Os cursos estão a caminho! Volte daqui a pouquinho.
            </p>
          </div>
        ) : (
          <CatalogGrid courses={courses} />
        )}
      </KidsBand>
    </>
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
