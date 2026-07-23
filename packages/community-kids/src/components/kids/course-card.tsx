import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Card } from '@sistemazero/ui/card'
import { ArrowRight, BookOpen, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { MyCourseView } from '@/lib/types'
import { CourseLevelChip } from './course-level-chip'
import { UNIT_THEME_CLASS, type UnitTheme } from './unit-theme'

interface CourseCardProps {
  course: MyCourseView
  /** Título do curso-base da etapa (resolvido pelo pai por `foundationCourseSlug`). */
  foundationTitle?: string | null
  /** Tema da unidade (o grid alterna cyan → lime → grad por índice). */
  theme?: UnitTheme
}

/** Card de curso da home ("Meus cursos"): capa + progresso + CTA, vestindo o tema. */
export function CourseCard({ course, foundationTitle, theme = 'cyan' }: CourseCardProps) {
  const { progress } = course
  const started = progress.completedLessons > 0
  const done = progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons
  const careerLocked = course.careerLock?.locked === true
  const foundationFirst = careerLocked && course.careerLock?.reason === 'foundation-first'

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
        {foundationFirst ? (
          // Bloqueado pelo curso-base: CTA de largura total que NOMEIA o curso a
          // fazer (o card inteiro leva a ele). Sem repetir "curso-base" solto.
          <span className="sz-btn-gradient-block mt-1">
            <span className="font-normal text-[11px] opacity-90">Ir para o curso-base:</span>
            <span className="flex items-center gap-1.5">
              <span className="line-clamp-1 flex-1 font-semibold text-sm">
                {foundationTitle ?? 'Curso-base da etapa'}
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </span>
          </span>
        ) : careerLocked ? (
          // Etapa futura: não é clicável → rótulo muted, sem cara de botão.
          <span className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2 text-muted-foreground text-xs">
            <Lock className="size-3.5" />
            Em breve na sua carreira
          </span>
        ) : (
          <span className="sz-btn-gradient mt-1 w-full">
            {done ? 'Revisar curso' : started ? 'Continuar' : 'Começar agora'}
          </span>
        )}
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
