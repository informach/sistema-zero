import { ArrowRight, Check, Lock } from 'lucide-react'
import Link from 'next/link'
import type { LockedCourseLink } from '@/lib/continuity'
import { courseKicker, isCourseDone } from '@/lib/course-levels'
import type { CatalogCourseView, CourseProgress } from '@/lib/types'
import { CourseCover, ProgressBar } from './courses/course-cover'

interface CatalogCourseCardProps {
  course: CatalogCourseView
  /** Progresso de Meus cursos (aulas feitas); `null` quando o curso não é da pessoa. */
  progress: CourseProgress | null
  /** O botão de curso bloqueado (`lockedCourseLink`: a página do curso ou a oferta da Comunidade). */
  locked: LockedCourseLink
}

/**
 * O cartão deitado de "Todos os cursos" (direção de arte de 18/10/2026): capa à esquerda, o eixo e
 * o nível, o título e o estado com o botão: Concluído (Revisar curso), o progresso (Continuar),
 * Liberado para você (Começar agora) ou Bloqueado (Conhecer o curso, ou Conhecer a Comunidade quando
 * o curso não tem página própria, em OUTRA aba, avisado no próprio cartão).
 */
export function CatalogCourseCard({ course, progress, locked }: CatalogCourseCardProps) {
  const href = `/cursos/${encodeURIComponent(course.courseSlug)}`
  const done = course.hasAccess && isCourseDone({ milestones: course.milestones, progress })
  const started = !done && (progress?.completedLessons ?? 0) > 0

  return (
    <article className="sz-card flex h-full flex-col overflow-hidden sm:flex-row">
      <div className="relative aspect-video bg-(--topo) sm:aspect-auto sm:min-h-[12rem] sm:flex-[0_0_40%]">
        <div className="absolute inset-0">
          <CourseCover src={course.coverImageUrl} />
        </div>
        {!course.hasAccess ? (
          <span className="sz-chip sz-chip-escuro absolute top-3 left-3">
            <Lock aria-hidden />
            Bloqueado
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-5 md:p-6">
        <span className="sz-kicker">{courseKicker(course)}</span>
        <h3 className="sz-h3">{course.title}</h3>
        {!course.hasAccess ? (
          <>
            <span className="text-[0.85rem] text-muted-foreground">
              Ainda não faz parte do seu acesso.
            </span>
            {/* Página de vendas é EXTERNA (funil): nova aba, e o aviso fica à vista. */}
            <a
              href={locked.href}
              target="_blank"
              rel="noopener noreferrer"
              className="sz-btn-outline sz-btn-sm mt-auto self-start"
            >
              {locked.label}
              <ArrowRight aria-hidden />
            </a>
            <span className="text-[0.85rem] text-muted-foreground">{locked.note}</span>
          </>
        ) : done ? (
          <>
            <span className="sz-chip sz-chip-ok self-start">
              <Check aria-hidden />
              Concluído
            </span>
            <Link
              href={href}
              prefetch={false}
              className="sz-btn-outline sz-btn-sm mt-auto self-start"
            >
              Revisar curso
            </Link>
          </>
        ) : started && progress ? (
          <>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-[0.85rem] text-muted-foreground">
                <span>
                  {progress.completedLessons} de {progress.totalLessons} aulas
                </span>
                <span className="font-bold text-(--acao-texto)">{progress.percent}%</span>
              </div>
              <ProgressBar
                value={progress.percent}
                label={`Progresso em ${course.title}`}
                className="h-2.5"
              />
            </div>
            <Link href={href} prefetch={false} className="sz-btn sz-btn-sm mt-auto self-start">
              Continuar
            </Link>
          </>
        ) : (
          <>
            <span className="sz-chip sz-chip-acao self-start">Liberado para você</span>
            <Link
              href={href}
              prefetch={false}
              className="sz-btn-outline sz-btn-sm mt-auto self-start"
            >
              Começar agora
            </Link>
          </>
        )}
      </div>
    </article>
  )
}
