import { COURSE_TIER_LABELS } from '@sistemazero/member-shell/lib/course-tier'
import { buttonVariants } from '@sistemazero/ui/button'
import { ArrowLeft, Map as MapIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CatalogCourseCard } from '@/components/kids/catalog-course-card'
import { KidsMascot } from '@/components/kids/mascot'
import { unitThemeAt } from '@/components/kids/unit-theme'
import { coursesForLevel, LEVEL_TIER, trilhaLocked } from '@/lib/career-map'
import { cn } from '@/lib/cn'
import { LEVEL_ORDER, levelInfo, nextLevelHint } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'
import { getGamificationReadonly, listCatalog } from '@/server/members'

export const dynamic = 'force-dynamic'

/** Subtítulo por NÍVEL: Faísca abre a etapa (curso-base), Construtor continua (resto + bônus). */
function trilhaSubtitle(slug: StudentLevelSlug, tierLabel: string, ownerLabel: string): string {
  if (slug === 'noob') return `Comece por aqui: o curso-base de ${tierLabel}.`
  if (slug === 'coder')
    return `Continue a trilha de ${tierLabel} — os próximos cursos e a recompensa.`
  return `A trilha de ${ownerLabel}.`
}

/**
 * Listagem da trilha de um NÍVEL do Mapa da Carreira (`/cursos/trilha/coder`): os
 * cursos daquele nível — Faísca vê só o curso-base, Construtor o resto + bônus, os
 * demais o degrau inteiro (`coursesForLevel`). Destino do clique num nível liberado
 * do mapa. Deep-link numa trilha ainda bloqueada mostra o recado gentil (a régua REAL
 * de acesso segue no members; aqui é apresentação). O segmento estático `trilha` não
 * colide com o detalhe `/cursos/[slug]`.
 */
export default async function TrilhaPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: raw } = await params
  const levelSlug = LEVEL_ORDER.find((candidate) => candidate === raw)
  if (!levelSlug) notFound()
  const tier = LEVEL_TIER[levelSlug]
  if (!tier) notFound() // Lenda (god) é o topo — não tem trilha própria.

  const [{ status, body }, gamification] = await Promise.all([
    listCatalog(),
    getGamificationReadonly(),
  ])
  if (status !== 200) throw new Error('Falha ao carregar o catálogo')
  const all = body?.courses ?? []
  const level = gamification.status === 200 ? (gamification.body?.level ?? null) : null

  if (trilhaLocked(level, levelSlug, all)) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
        <KidsMascot expression="thinking" className="size-24" />
        <h1 className="mt-4 sz-display text-2xl">Esta parte do mapa ainda está bloqueada</h1>
        {/* Nomeia o NÍVEL (não o degrau de curso): em `/trilha/coder` o degrau é o MESMO
            Iniciante 2D que a Faísca já estuda — dizer "complete e Iniciante 2D abre"
            soaria errado; "a trilha de Construtor(a)" é o que abre de fato. */}
        <p className="mt-4 text-muted-foreground">
          Complete as trilhas anteriores da sua carreira e a trilha de {levelInfo(levelSlug).label}{' '}
          vai abrir sozinha — com direito a recompensas!
        </p>
        <Link
          href="/cursos"
          className={cn(buttonVariants({ variant: 'default' }), 'mt-6 h-11 rounded-full px-6')}
        >
          <MapIcon className="size-4" /> Voltar ao mapa
        </Link>
      </section>
    )
  }

  const courses = coursesForLevel(levelSlug, all)
  const titleBySlug = new Map(all.map((c) => [c.courseSlug, c.title]))
  const owner = levelInfo(levelSlug)
  const OwnerIcon = owner.icon
  // O hint do próximo nível só aparece quando ESTA é a trilha que o aluno estuda agora.
  const hint = level && level.slug === levelSlug ? nextLevelHint(level) : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/cursos"
          className="inline-flex w-fit items-center gap-1.5 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao mapa
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-full border-2 bg-card shadow-sm"
            style={{ borderColor: owner.colorVar }}
          >
            <OwnerIcon className="size-6" style={{ color: owner.colorVar }} aria-hidden />
          </span>
          <div>
            <h1 className="sz-display text-2xl md:text-3xl">Trilha {COURSE_TIER_LABELS[tier]}</h1>
            <p className="text-muted-foreground text-sm">
              {trilhaSubtitle(levelSlug, COURSE_TIER_LABELS[tier], owner.label)}
            </p>
          </div>
        </div>
        {hint ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
      </div>

      {courses.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-border border-dashed px-6 py-16 text-center">
          <KidsMascot expression="thinking" className="size-16" />
          <p className="text-muted-foreground text-sm">
            Os cursos desta trilha estão a caminho! Volte daqui a pouquinho. 🚀
          </p>
        </section>
      ) : (
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
      )}
    </div>
  )
}
