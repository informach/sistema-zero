import { courseJourneyState } from '@sistemazero/core/career'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { MyCourseView } from '@/lib/types'
import { CourseBadgeChip } from './course-badge-chip'

interface CourseCardProps {
  course: MyCourseView
}

/**
 * Card de curso da home ("Meus cursos"): capa + progresso + CTA. A home só lista cursos
 * LIBERADOS pela carreira (24/07) — os travados (futuro/recompensa) vivem no Mapa da
 * Carreira, então o card não tem estados de cadeado.
 *
 * Desenho das telas-modelo (11/09/2026): cartão branco de cantos de 24px, a capa em cima
 * (sem capa, a caixa clara com o livro), o sobretítulo, o título em Baloo, a frase, o
 * "N de M aulas" com a porcentagem em verde, a barra verde e o botão de largura toda:
 * azul para continuar, creme para começar ou revisar.
 */
export function CourseCard({ course }: CourseCardProps) {
  const { progress } = course
  const started = progress.completedLessons > 0
  const done = progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons
  const publishing = courseJourneyState(course) === 'publish'
  const cta = publishing
    ? 'Preparar publicação'
    : done
      ? 'Revisar curso'
      : started
        ? 'Continuar'
        : 'Começar agora'
  // O botão cheio da marca é para SEGUIR em frente (continuar, publicar); começar e
  // revisar são a pílula creme das telas-modelo.
  const primary = publishing || (started && !done)

  return (
    // `?de=inicio` diz à página do curso que a volta é para a HOME (senão ela
    // manda para a trilha do curso). Ver `lib/course-return.ts`.
    <Link
      href={`/cursos/${encodeURIComponent(course.courseSlug)}?de=inicio${publishing ? '#publicar' : ''}`}
      className="group kid-pop kids-carta flex h-full flex-col overflow-hidden"
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-muted">
        {course.coverImageUrl ? (
          // Capa pode ser URL externa arbitrária (autoria) → <img> simples,
          // sem `next/image` (evita configurar remotePatterns por domínio).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImageUrl}
            alt=""
            width={16}
            height={9}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <BookOpen className="size-10" strokeWidth={1.75} aria-hidden />
          </div>
        )}
        {/* Só o que FALTA: "pronta" aqui seria redundante com a barra em 100% e o
            "Revisar curso" logo abaixo. O que a home precisa dizer é o pendente. */}
        <CourseBadgeChip course={course} only="publicar" className="absolute top-2 left-2" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-bold text-muted-foreground text-xs">
          {course.careerSlot === 1
            ? 'Primeiro da trilha'
            : typeof course.careerSlot === 'number'
              ? 'Curso da carreira'
              : 'Curso bônus'}
        </p>
        <h3 className="sz-display mt-1.5 text-lg md:text-xl">{course.title}</h3>
        {course.subtitle ? (
          <p className="mt-1.5 line-clamp-3 font-medium text-[0.8125rem] text-muted-foreground leading-snug">
            {course.subtitle}
          </p>
        ) : null}
        {/* O resto do cartão desce para o pé: numa fileira de quatro, as barras e os
            botões alinham mesmo com títulos de tamanhos diferentes. */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between font-semibold text-muted-foreground text-xs">
            <span>
              {progress.completedLessons} de {progress.totalLessons} aulas
            </span>
            <span
              className={cn(
                'font-extrabold',
                progress.percent > 0 && 'text-(--success-foreground)',
              )}
            >
              {progress.percent}%
            </span>
          </div>
          {/* A barra é desenho: o "N de M aulas" e a porcentagem logo acima já dizem o
              progresso, e dentro do link um `progressbar` só alongaria o nome dele. */}
          <div className="sz-progress mt-2" aria-hidden="true">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <span className={cn('sz-btn-gradient mt-4 w-full', !primary && 'sz-btn-suave')}>
            {cta}
          </span>
        </div>
      </div>
    </Link>
  )
}
