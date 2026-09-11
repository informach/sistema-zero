import { Lock, Map as MapIcon } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsBackButton } from '@/components/kids/back-button'
import { CatalogCourseCard } from '@/components/kids/catalog-course-card'
import { KidsBand } from '@/components/kids/kids-band'
import { KidsMascot } from '@/components/kids/mascot'
import { careerHorizon, nextLevelHintWithin, promisedNextLevel } from '@/lib/career-horizon'
import { coursesForLevel, LEVEL_TIER, tierCompletionByLevel, trilhaLocked } from '@/lib/career-map'
import { CAREER_REWARD_INFO } from '@/lib/career-rewards'
import { cn } from '@/lib/cn'
import { LEVEL_ORDER, levelInfo } from '@/lib/level-info'
import { canOpenFreeStudio } from '@/lib/studio-cta'
import type { StudentLevelSlug } from '@/lib/types'
import { checkStudioAccessReadonly, getGamificationReadonly, listCatalog } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * O MEDALHÃO do nível (a mesma arte do mapa da carreira, `/carreira/<slug>.webp`), e não um
 * ícone genérico: é assim que a criança reconhece a trilha. O ícone fica POR BAIXO e a arte
 * por cima; o mapa faz o mesmo com um `onError` em estado de cliente, aqui a página é de
 * SERVIDOR e empilhar resolve sem JS: se o .webp não existir no deploy, a imagem com
 * `alt=""` não desenha nada e o ícone aparece.
 */
function Medalhao({
  slug,
  ring,
  apagado = false,
  className,
}: {
  slug: StudentLevelSlug
  /** Cor do anel: o azul da marca na trilha atual, a cor do nível nas outras. */
  ring: string
  apagado?: boolean
  className?: string
}) {
  const info = levelInfo(slug)
  const Icon = info.icon
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full border-[3px]',
        apagado ? 'border-transparent bg-muted' : 'bg-card',
        className,
      )}
      style={apagado ? undefined : { borderColor: ring }}
    >
      <Icon
        className={cn('size-1/2', apagado && 'text-muted-foreground')}
        style={apagado ? undefined : { color: info.colorVar }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/carreira/${slug}.webp`}
        alt=""
        width={72}
        height={72}
        className={cn('absolute inset-0 size-full object-cover', apagado && 'opacity-45 grayscale')}
      />
    </span>
  )
}

/**
 * Listagem da trilha de um NÍVEL do Mapa da Carreira (`/cursos/trilha/coder`): os
 * cursos daquele nível — cada posto é dono de um degrau inteiro, bônus incluso
 * (`coursesForLevel`). Destino do clique num nível liberado
 * do mapa. Deep-link numa trilha ainda bloqueada mostra o recado gentil (a régua REAL
 * de acesso segue no members; aqui é apresentação). O segmento estático `trilha` não
 * colide com o detalhe `/cursos/[slug]`.
 *
 * Desenho das telas-modelo (11/09/2026): o medalhão com o anel e o "Trilha <posto>" no
 * creme, os cursos em cartões grandes de duas colunas no azul-claro e, na trilha que a
 * criança estuda agora, o cartão lilás do PRÓXIMO NÍVEL (o que ele libera e quanto falta).
 */
export default async function TrilhaPage({ params }: { params: Promise<{ level: string }> }) {
  const { level: raw } = await params
  const levelSlug = LEVEL_ORDER.find((candidate) => candidate === raw)
  if (!levelSlug) notFound()
  const tier = LEVEL_TIER[levelSlug]
  // A Lenda (god) não estuda um degrau, mas TEM trilha: os cursos bônus da formatura
  // (nível `lenda`). Os demais slugs sem tier não existem — 404.
  if (!tier && levelSlug !== 'god') notFound()

  const [{ status, body }, gamification, studioRes, session] = await Promise.all([
    listCatalog(),
    getGamificationReadonly(),
    checkStudioAccessReadonly().catch(() => null),
    getSession(),
  ])
  if (status !== 200) throw new Error('Falha ao carregar o catálogo')
  const all = body?.courses ?? []
  const level = gamification.status === 200 ? (gamification.body?.level ?? null) : null
  // ⚠️ Posse + `freeStudio`: o Estúdio livre só abre no Construtor, então uma Faísca com o
  // produto veria um atalho que cai na tela de bloqueio da carreira (clique morto).
  const studioOwned = canOpenFreeStudio(
    studioRes?.status === 200 && studioRes.body?.access?.['estudio-completo'] === true,
    level?.slug,
    session?.role,
  )
  // Posto acima do HORIZONTE do catálogo = os cursos dele ainda não foram gravados.
  // Não é a criança que está devendo, e a copy tem que dizer isso.
  const beyondHorizon = LEVEL_ORDER.indexOf(levelSlug) > LEVEL_ORDER.indexOf(careerHorizon(all))

  if (trilhaLocked(level, levelSlug, all)) {
    return (
      <KidsBand tone="creme">
        <KidsBackButton href="/cursos" label="Voltar ao mapa" showLabel className="mb-6" />
        <div className="kids-carta mx-auto flex w-full max-w-lg flex-col items-center px-6 py-10 text-center md:px-10">
          <KidsMascot expression="thinking" className="kid-float size-24" />
          <h1 className="sz-display mt-4 text-2xl md:text-[2rem]">
            {beyondHorizon
              ? 'Esta parte do mapa está sendo construída'
              : 'Esta parte do mapa ainda está bloqueada'}
          </h1>
          {/* Nomeia o NÍVEL (não o degrau de curso): em `/trilha/coder` o degrau é o MESMO
              Iniciante 2D que a Faísca já estuda — dizer "complete e Iniciante 2D abre"
              soaria errado; "a trilha de Construtor(a)" é o que abre de fato. */}
          <p className="mt-4 font-medium text-[1.0625rem] text-muted-foreground">
            {beyondHorizon
              ? `Os cursos da trilha de ${levelInfo(levelSlug).label} ainda estão sendo criados. Volte daqui a pouquinho!`
              : `Complete as trilhas anteriores da sua carreira e a trilha de ${levelInfo(levelSlug).label} vai abrir sozinha, com direito a recompensas!`}
          </p>
          <Link href="/cursos" className="sz-btn-gradient mt-6 gap-2 px-6">
            <MapIcon className="size-4" aria-hidden /> Voltar ao mapa
          </Link>
        </div>
      </KidsBand>
    )
  }

  const courses = coursesForLevel(levelSlug, all)
  const titleBySlug = new Map(all.map((c) => [c.courseSlug, c.title]))
  const owner = levelInfo(levelSlug)
  const isCurrent = level?.slug === levelSlug
  // O hint do próximo nível só aparece quando ESTA é a trilha que o aluno estuda agora.
  // Conta só os cursos que EXISTEM (horizonte do catálogo) — a mesma frase do mapa.
  const hint = level && isCurrent ? nextLevelHintWithin(level, all) : null
  // O cartão "Próximo nível" é da trilha ATUAL (é para onde ela leva) e só quando o catálogo
  // LEVA até lá: ver `promisedNextLevel`.
  const next = isCurrent ? promisedNextLevel(level, all) : null
  const trilha = tierCompletionByLevel(all)[levelSlug]

  return (
    <>
      <KidsBand tone="creme">
        <KidsBackButton href="/cursos" label="Voltar ao mapa" showLabel className="mb-6" />
        <div className="flex items-center gap-4">
          <Medalhao
            slug={levelSlug}
            ring={isCurrent ? 'var(--primary)' : owner.colorVar}
            className="size-16 md:size-[4.5rem]"
          />
          <div className="min-w-0">
            {/* ⚠️ A trilha se chama pelo POSTO do aluno ("Trilha Faísca"), nunca pelo degrau
                interno ("Iniciante 2D"), que é vocabulário de quem monta o curso. */}
            <h1 className="sz-display text-[clamp(2rem,3.6vw,3rem)]">
              {tier ? `Trilha ${owner.label}` : 'Cursos da Lenda 👑'}
            </h1>
          </div>
        </div>
        {tier ? null : (
          <p className="mt-4 max-w-3xl font-medium text-[1.0625rem] text-muted-foreground">
            A formatura! Cursos extras que abriram por você ter chegado ao topo da carreira.
          </p>
        )}
        {hint ? (
          <p className="mt-4 max-w-4xl font-medium text-[1.0625rem] text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </KidsBand>

      {/* A última faixa é sempre a lilás: sem o cartão do próximo nível, os cursos fecham a
          página nela. */}
      <KidsBand tone={next ? 'ceu' : 'lilas'}>
        {courses.length === 0 ? (
          <section className="kids-carta flex flex-col items-center gap-4 px-6 py-14 text-center">
            <KidsMascot expression="thinking" className="kid-float size-16" />
            <p className="sz-display text-xl">
              Os cursos desta trilha estão a caminho! Volte daqui a pouquinho.
            </p>
            {/* Trilha vazia não pode virar beco: quem tem o Estúdio já pode criar o
              que quiser enquanto os cursos não chegam. */}
            {studioOwned ? (
              <Link href="/estudio" className="sz-btn-gradient px-6">
                Criar um jogo meu
              </Link>
            ) : null}
          </section>
        ) : (
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
        )}
      </KidsBand>

      {next ? (
        <KidsBand tone="lilas">
          <section
            aria-label="Próximo nível"
            className="kids-carta flex flex-col gap-5 p-5 md:flex-row md:items-center md:gap-6 md:px-7 md:py-6"
          >
            <span className="relative w-fit shrink-0">
              <Medalhao slug={next} ring="" apagado className="size-16 md:size-[4.75rem]" />
              <span
                aria-hidden="true"
                className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full bg-card text-muted-foreground shadow-sm"
              >
                <Lock className="size-3.5" />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
                Próximo nível
              </p>
              <p className="sz-display mt-1 text-2xl md:text-[1.625rem]">{levelInfo(next).label}</p>
              <p className="mt-1.5 text-[0.9375rem]">
                <span className="font-bold">Ao chegar aqui: </span>
                <span className="text-muted-foreground">{CAREER_REWARD_INFO[next].title}</span>
              </p>
            </div>
            {trilha && trilha.total > 0 ? (
              <div className="w-full shrink-0 md:w-60">
                <p className="font-extrabold text-sm">
                  {trilha.done} de {trilha.total}{' '}
                  {trilha.total === 1 ? 'aventura pronta' : 'aventuras prontas'}
                </p>
                <div className="sz-progress mt-2.5" aria-hidden="true">
                  <span style={{ width: `${Math.round((trilha.done / trilha.total) * 100)}%` }} />
                </div>
              </div>
            ) : null}
          </section>
        </KidsBand>
      ) : null}
    </>
  )
}
