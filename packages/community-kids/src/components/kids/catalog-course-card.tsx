import { courseJourneyState } from '@sistemazero/core/career'
import { ArrowRight, BookOpen, CircleCheck, Gift, Lock, Play } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { CatalogCourseView, MyCourseView } from '@/lib/types'
import { CourseBadgeChip } from './course-badge-chip'

interface CatalogCourseCardProps {
  course: CatalogCourseView
  /** Página de vendas do curso (`metadata.salesPageUrl`); `null` = card não-clicável. */
  salesUrl: string | null
  /** Título do curso-base da etapa (resolvido pelo pai por `foundationCourseSlug`). */
  foundationTitle?: string | null
  /**
   * `grade` = o cartão grande da trilha (capa em cima, duas colunas); `linha` = o cartão
   * deitado das "Aventuras da trilha" na Carreira (capa à esquerda, progresso à direita).
   */
  layout?: 'grade' | 'linha'
  /**
   * O mesmo curso em "Meus cursos", quando a página o tem: com ele o cartão mostra as aulas
   * feitas, a barra e o PRÓXIMO passo ("Continuar", "Começar agora") no lugar do
   * "Liberado". O catálogo sozinho não sabe o progresso: é vitrine, não matrícula.
   */
  mine?: MyCourseView | null
}

/** A pílula apagada dos estados em que não há o que tocar ("Em breve", o prêmio). */
const PILULA_APAGADA =
  'flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2.5 font-bold text-muted-foreground text-xs'

/**
 * Card de curso do catálogo (a trilha de um nível, as aventuras na Carreira e a grade sem
 * gamificação): desbloqueado → entra no curso; bloqueado pela carreira → recado sem
 * cadeado agressivo (curso-base → CTA clicável que NOMEIA o curso a fazer; bônus → prêmio;
 * etapa futura → "Em breve"); sem matrícula → página de vendas em nova aba (sem
 * `salesPageUrl` fica não-clicável — kids não tem funil).
 *
 * Desenho das telas-modelo (11/09/2026, Trilha e Carreira): cartão branco de cantos de
 * 24px, sem borda nem cor de unidade; na trilha, a capa larga em cima, título em Baloo,
 * a frase, e embaixo o selo menta "Liberado" com a pílula azul "Acessar curso".
 */
export function CatalogCourseCard({
  course,
  salesUrl,
  foundationTitle,
  layout = 'grade',
  mine = null,
}: CatalogCourseCardProps) {
  const careerLocked = course.hasAccess && course.careerLock?.locked === true
  const available = course.hasAccess && !careerLocked
  const foundationFirst = careerLocked && course.careerLock?.reason === 'foundation-first'
  // Bônus = recompensa da etapa: abre sozinho quando os obrigatórios completam.
  const tierReward = careerLocked && course.careerLock?.reason === 'tier-reward'
  const linha = layout === 'linha'
  // ⚠️ Sem "etapa" e sem nome de degrau: é vocabulário de quem MONTA o curso. Para a
  // criança basta saber que é prêmio e o que destrava.
  // ⚠️ E sem QUANTIDADE, nem implícita: "os outros cursos" ficou errado quando a trilha da
  // Faísca virou um degrau de UM curso só (14/08). "A trilha" vale para 1, 7 ou 8.
  const rewardLabel = 'Prêmio! Abre quando você terminar a trilha'

  const cover = (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-muted',
        linha ? 'aspect-[5/3] w-full rounded-2xl md:w-40' : 'aspect-[2/1] w-full',
      )}
    >
      {course.coverImageUrl ? (
        // Capa pode ser URL externa arbitrária (autoria) → <img> simples,
        // sem `next/image` (evita configurar remotePatterns por domínio).
        // `loading=lazy`: a lista pode ser longa — sem isto, um celular de criança baixa
        // todas as capas de uma vez. O wrapper com `aspect-*` reserva o espaço (sem CLS).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.coverImageUrl}
          alt=""
          width={16}
          height={9}
          loading="lazy"
          decoding="async"
          className={cn(
            'h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]',
            !available && 'opacity-60 grayscale',
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <BookOpen className={linha ? 'size-8' : 'size-10'} strokeWidth={1.75} aria-hidden />
        </div>
      )}
      {!available ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="grid size-12 place-items-center rounded-full bg-card text-muted-foreground shadow-sm">
            {tierReward ? (
              <Gift className="size-5" aria-hidden />
            ) : (
              <Lock className="size-5" aria-hidden />
            )}
          </span>
        </div>
      ) : null}
      {/* DEPOIS do círculo de bloqueado, de propósito: o selo conta o que a criança já fez
          e não pode sumir se o acesso vencer depois de ela ter concluído. */}
      <CourseBadgeChip course={course} className="absolute top-2 left-2" />
    </div>
  )

  const text = (
    <div className="min-w-0">
      {linha ? (
        <p className="font-bold text-muted-foreground text-xs">
          {course.careerSlot === 1
            ? 'Primeiro da trilha'
            : typeof course.careerSlot === 'number'
              ? 'Curso da carreira'
              : 'Curso bônus'}
        </p>
      ) : null}
      <h3
        className={cn(
          'sz-display',
          linha ? 'mt-1 text-xl md:text-[1.375rem]' : 'text-xl md:text-2xl',
        )}
      >
        {course.title}
      </h3>
      {course.subtitle ? (
        <p
          className={cn(
            'mt-1.5 font-medium text-muted-foreground',
            linha ? 'line-clamp-2 text-[0.8125rem]' : 'line-clamp-2 text-[0.9375rem]',
          )}
        >
          {course.subtitle}
        </p>
      ) : null}
    </div>
  )

  const footer = careerLocked ? (
    // Bloqueado pela carreira: um CTA único de largura total (sem status duplicado do
    // lado). Curso-base → CTA clicável que NOMEIA o curso a fazer; etapa futura → rótulo
    // apagado não-tocável (o card é um <div>, não pode parecer botão).
    foundationFirst ? (
      <span className="sz-btn-gradient-block">
        <span className="font-normal text-[11px] opacity-90">Comece por este:</span>
        <span className="flex items-center gap-1.5">
          <span className="line-clamp-1 flex-1 font-semibold text-sm">
            {foundationTitle ?? 'O primeiro curso'}
          </span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </span>
    ) : tierReward ? (
      <span className={PILULA_APAGADA}>
        <Gift className="size-3.5" aria-hidden />
        {rewardLabel}
      </span>
    ) : (
      <span className={PILULA_APAGADA}>
        <Lock className="size-3.5" aria-hidden />
        Em breve na sua carreira
      </span>
    )
  ) : available && linha && mine ? (
    <MyProgress mine={mine} />
  ) : (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {available ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-(--band-menta) px-3 py-1.5 font-extrabold text-[0.8125rem]">
          <CircleCheck className="size-4 text-(--success-foreground)" aria-hidden />
          Liberado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 font-bold text-[0.8125rem] text-muted-foreground">
          <Lock className="size-4" aria-hidden />
          Bloqueado
        </span>
      )}
      <span className="sz-btn-gradient gap-2 px-5">
        {available ? (
          <>
            <Play className="size-4" aria-hidden /> Acessar curso
          </>
        ) : (
          'Quero acesso'
        )}
      </span>
    </div>
  )

  const body = linha ? (
    <div className="kids-carta flex h-full flex-col gap-4 p-4 md:flex-row md:items-center md:gap-6 md:p-5">
      {cover}
      <div className="min-w-0 flex-1">{text}</div>
      <div className="w-full shrink-0 md:w-56">{footer}</div>
    </div>
  ) : (
    <div className="kids-carta flex h-full flex-col overflow-hidden">
      {cover}
      <div className="flex flex-1 flex-col gap-5 p-6">
        {text}
        <div className="mt-auto">{footer}</div>
      </div>
    </div>
  )

  return <CardShell course={course} available={available} salesUrl={salesUrl} body={body} />
}

/** O "N de M aulas", a barra verde e o botão do próximo passo, no cartão deitado. */
function MyProgress({ mine }: { mine: MyCourseView }) {
  const { progress } = mine
  const state = courseJourneyState(mine)
  const started = progress.completedLessons > 0
  const cta =
    state === 'publish'
      ? 'Preparar publicação'
      : state === 'review'
        ? 'Revisar curso'
        : started
          ? 'Continuar'
          : 'Começar agora'
  // Seguir em frente é o azul da marca; começar e revisar, a pílula creme (a régua da home).
  const primary = state === 'publish' || (started && state !== 'review')
  return (
    <div>
      <div className="flex items-center justify-between font-semibold text-muted-foreground text-xs">
        <span>
          {progress.completedLessons} de {progress.totalLessons} aulas
        </span>
        <span
          className={cn('font-extrabold', progress.percent > 0 && 'text-(--success-foreground)')}
        >
          {progress.percent}%
        </span>
      </div>
      {/* Desenho: o número acima já diz o progresso, e dentro do link um `progressbar` só
          alongaria o nome dele. */}
      <div className="sz-progress mt-2" aria-hidden="true">
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <span className={cn('sz-btn-gradient mt-3.5 w-full gap-2', !primary && 'sz-btn-suave')}>
        {primary ? (
          <Play className="size-4" aria-hidden />
        ) : (
          <ArrowRight className="size-4" aria-hidden />
        )}
        {cta}
      </span>
    </div>
  )
}

/** Para onde o cartão leva: o curso, o curso-base a fazer antes, a página de vendas ou nada. */
function CardShell({
  course,
  available,
  salesUrl,
  body,
}: {
  course: CatalogCourseView
  available: boolean
  salesUrl: string | null
  body: ReactNode
}) {
  const careerLocked = course.hasAccess && course.careerLock?.locked === true
  if (available) {
    return (
      <Link
        href={`/cursos/${encodeURIComponent(course.courseSlug)}`}
        className="group kid-pop block h-full"
      >
        {body}
      </Link>
    )
  }
  if (careerLocked && course.careerLock?.foundationCourseSlug) {
    return (
      <Link
        href={`/cursos/${encodeURIComponent(course.careerLock.foundationCourseSlug)}`}
        className="group kid-pop block h-full"
      >
        {body}
      </Link>
    )
  }
  if (careerLocked) return <div className="group block h-full">{body}</div>
  if (salesUrl) {
    // Página de vendas é EXTERNA (funil) → <a> em NOVA aba (aluno não sai da plataforma).
    return (
      <a href={salesUrl} target="_blank" rel="noopener noreferrer" className="group block h-full">
        {body}
      </a>
    )
  }
  // Sem URL de vendas configurada → card informativo (não clicável).
  return <div className="group block h-full">{body}</div>
}
