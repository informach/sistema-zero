import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Card } from '@sistemazero/ui/card'
import { BookOpen, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { MyCourseView } from '@/lib/types'
import { CourseLevelChip } from './course-level-chip'
import { UNIT_THEME_CLASS, type UnitTheme } from './unit-theme'

interface CourseCardProps {
  course: MyCourseView
  /** Tema da unidade (o grid alterna cyan → lime → grad por índice). */
  theme?: UnitTheme
}

/** Card de curso da home ("Meus cursos"): capa + progresso + CTA, vestindo o tema. */
export function CourseCard({ course, theme = 'cyan' }: CourseCardProps) {
  const { progress } = course
  const started = progress.completedLessons > 0
  const done = progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons
  const careerLocked = course.careerLock?.locked === true

  const card = (
    <Card
      className={cn(
        'kids-card kid-pop overflow-hidden p-0 dark:group-hover:brand-glow',
        UNIT_THEME_CLASS[theme],
        careerLocked && 'opacity-75',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {course.coverImageUrl ? (
          // Capa pode ser URL externa arbitrária (autoria) → <img> simples,
          // sem `next/image` (evita configurar remotePatterns por domínio).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <BookOpen className="size-10 text-muted-foreground" />
          </div>
        )}
        <CourseLevelChip
          level={course.level}
          track={course.track}
          className="absolute top-2 left-2"
        />
        {careerLocked ? (
          <div className="absolute inset-0 grid place-items-center bg-background/55 backdrop-blur-[2px]">
            <span className="grid size-12 place-items-center rounded-full bg-background/90 shadow-sm">
              <Lock className="size-5 text-primary" />
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="sz-display text-base">{course.title}</h3>
          {course.subtitle ? (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">{course.subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>
              {progress.completedLessons} de {progress.totalLessons} aulas
            </span>
            <span className="sz-display">{progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} />
        </div>
        <span className="sz-btn-gradient mt-1 w-full">
          {careerLocked
            ? course.careerLock?.reason === 'foundation-first'
              ? 'Faça primeiro o curso-base'
              : 'Continue sua carreira'
            : done
              ? 'Revisar curso'
              : started
                ? 'Continuar'
                : 'Começar agora'}
        </span>
      </div>
    </Card>
  )

  if (careerLocked) {
    const foundation = course.careerLock?.foundationCourseSlug
    return foundation ? (
      <Link href={`/cursos/${encodeURIComponent(foundation)}`} className="group block">
        {card}
      </Link>
    ) : (
      <div className="group block">{card}</div>
    )
  }
  return (
    <Link href={`/cursos/${encodeURIComponent(course.courseSlug)}`} className="group block">
      {card}
    </Link>
  )
}
