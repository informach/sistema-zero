import { courseJourneyState } from '@sistemazero/core/career'
import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Card } from '@sistemazero/ui/card'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { MyCourseView } from '@/lib/types'
import { CourseBadgeChip } from './course-badge-chip'
import { UNIT_THEME_CLASS, type UnitTheme } from './unit-theme'

interface CourseCardProps {
  course: MyCourseView
  /** Tema da unidade (o grid alterna cyan → lime → grad por índice). */
  theme?: UnitTheme
}

/**
 * Card de curso da home ("Meus cursos"): capa + progresso + CTA, vestindo o
 * tema. A home só lista cursos LIBERADOS pela carreira (24/07) — os travados
 * (futuro/recompensa) vivem no Mapa da Carreira, então o card não tem mais
 * estados de cadeado.
 */
export function CourseCard({ course, theme = 'cyan' }: CourseCardProps) {
  const { progress } = course
  const started = progress.completedLessons > 0
  const done = progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons
  const publishing = courseJourneyState(course) === 'publish'

  return (
    // `?de=inicio` diz à página do curso que a volta é para a HOME (senão ela
    // manda para a trilha do curso). Ver `lib/course-return.ts`.
    <Link
      href={`/cursos/${encodeURIComponent(course.courseSlug)}?de=inicio${publishing ? '#publicar' : ''}`}
      className="group block"
    >
      {/* ⚠️ Este card CALCULAVA o tema da unidade e jogava fora: aplicava a classe
          (que define `--unit`) e depois pintava `border-border` + `shadow-sm` por
          cima, então a cor nunca chegava à tela mais vista do app. O irmão do
          catálogo sempre usou `.kids-card`. Densidade não muda: a borda ganha 1px
          e a sombra difusa sai. */}
      <Card
        className={cn('kids-card kid-pop overflow-hidden rounded-2xl p-0', UNIT_THEME_CLASS[theme])}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
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
            <div className="kids-cover-fallback flex h-full w-full items-center justify-center">
              <BookOpen className="size-10" />
            </div>
          )}
          {/* Só o que FALTA: "pronta" aqui seria redundante com a barra em 100% e o
              "Revisar curso" logo abaixo. O que a home precisa dizer é o pendente. */}
          <CourseBadgeChip course={course} only="publicar" className="absolute top-2 left-2" />
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div>
            <p className="mb-1 text-muted-foreground text-xs font-semibold">
              {course.careerSlot === 1
                ? 'Primeiro da trilha'
                : typeof course.careerSlot === 'number'
                  ? 'Curso da carreira'
                  : 'Curso bônus'}
            </p>
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
          {/* Era `bg-primary/10 text-primary`: um fantasma de botão no lugar do CTA
              que a marca já tem. Mesmo alvo de toque de 44px. */}
          <span className="sz-btn-gradient mt-1 w-full">
            {publishing
              ? 'Preparar publicação'
              : done
                ? 'Revisar curso'
                : started
                  ? 'Continuar'
                  : 'Começar agora'}
          </span>
        </div>
      </Card>
    </Link>
  )
}
