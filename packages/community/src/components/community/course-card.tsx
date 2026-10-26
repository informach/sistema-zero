import { CourseCurriculumContext } from '@sistemazero/member-shell/components/course-curriculum-context'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { isCourseDone } from '@/lib/course-levels'
import type { MyCourseView } from '@/lib/types'
import { CourseCover, ProgressBar } from './courses/course-cover'

/**
 * O cartão de "Seus cursos" no Início (direção de arte de 18/10/2026): capa, título, aulas feitas
 * com a porcentagem (ou o selo Concluído), a barra e o botão Continuar, Revisar curso ou Começar
 * agora. O cartão inteiro é o link para o curso.
 */
export function CourseCard({ course }: { course: MyCourseView }) {
  const { progress } = course
  const done = isCourseDone(course)
  const started = progress.completedLessons > 0
  return (
    <Link
      href={`/cursos/${encodeURIComponent(course.courseSlug)}`}
      prefetch={false}
      className="group sz-card-sm flex h-full flex-col overflow-hidden text-foreground no-underline transition-colors hover:border-foreground/40"
    >
      <div className="aspect-video bg-(--topo)">
        <CourseCover src={course.coverImageUrl} />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4 md:p-5">
        <strong className="sz-h4">{course.title}</strong>
        <CourseCurriculumContext
          placement={course.curriculum}
          accessReason={course.accessReason}
          skin="adult"
          compact
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[0.85rem] text-muted-foreground">
          <span>
            {progress.completedLessons} de {progress.totalLessons} aulas
          </span>
          {done ? (
            <span className="sz-chip sz-chip-ok">
              <Check aria-hidden />
              Concluído
            </span>
          ) : (
            <span className={cn(started && 'font-bold text-(--acao-texto)')}>
              {progress.percent}%
            </span>
          )}
        </div>
        <ProgressBar
          value={done ? 100 : progress.percent}
          done={done}
          label={`Progresso em ${course.title}`}
          className="h-2.5"
        />
        <span className={cn('mt-auto', done || !started ? 'sz-btn-outline' : 'sz-btn')}>
          {done ? 'Revisar curso' : started ? 'Continuar' : 'Começar agora'}
        </span>
      </div>
    </Link>
  )
}
