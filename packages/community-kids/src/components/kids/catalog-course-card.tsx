import { Card } from '@sistemazero/ui/card'
import { ArrowRight, BookOpen, Lock, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { CatalogCourseView } from '@/lib/types'
import { CourseLevelChip } from './course-level-chip'
import { UNIT_THEME_CLASS, type UnitTheme } from './unit-theme'

interface CatalogCourseCardProps {
  course: CatalogCourseView
  /** Página de vendas do curso (`metadata.salesPageUrl`); `null` = card não-clicável. */
  salesUrl: string | null
  /** Título do curso-base da etapa (resolvido pelo pai por `foundationCourseSlug`). */
  foundationTitle?: string | null
  /** Tema da unidade (o grid alterna por índice); bloqueado fica neutro. */
  theme?: UnitTheme
}

/**
 * Card de "Todos os cursos": desbloqueado → entra no curso (vestindo o tema
 * da unidade); bloqueado → cadeado, card neutro e clique leva à página de
 * vendas do curso (sem `salesPageUrl` fica não-clicável — kids não tem funil).
 * Rodapé: "Liberado" (side-by-side) quando aberto; bloqueado pela carreira usa
 * um CTA único de largura total (curso-base → clicável; etapa futura → rótulo
 * muted não-tocável).
 */
export function CatalogCourseCard({
  course,
  salesUrl,
  foundationTitle,
  theme = 'cyan',
}: CatalogCourseCardProps) {
  const careerLocked = course.hasAccess && course.careerLock?.locked === true
  const available = course.hasAccess && !careerLocked
  const foundationFirst = careerLocked && course.careerLock?.reason === 'foundation-first'
  const body = (
    <Card
      className={cn(
        'h-full overflow-hidden p-0 dark:group-hover:brand-glow',
        available
          ? cn('kids-card kid-pop', UNIT_THEME_CLASS[theme])
          : 'transition-shadow group-hover:shadow-lg',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {course.coverImageUrl ? (
          // Capa pode ser URL externa arbitrária (autoria) → <img> simples,
          // sem `next/image` (evita configurar remotePatterns por domínio).
          // `loading=lazy`: o catálogo "Todos os cursos" é uma lista longa — sem
          // isto, um mobile de criança baixa todas as capas de uma vez. O wrapper
          // `aspect-video` já reserva o espaço (sem CLS).
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
        {!available ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
            <span className="flex size-12 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm">
              <Lock className="size-5 text-muted-foreground" />
            </span>
          </div>
        ) : null}
        <CourseLevelChip
          level={course.level}
          track={course.track}
          className="absolute top-2 left-2"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="sz-display text-base">{course.title}</h3>
          {course.subtitle ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
          ) : null}
        </div>
        {careerLocked ? (
          // Bloqueado pela carreira: um CTA único de largura total na linha de
          // baixo (sem status duplicado do lado). Curso-base → CTA clicável que
          // NOMEIA o curso a fazer; etapa futura → rótulo muted não-tocável (o
          // card é um <div>, não pode parecer botão).
          <div className="mt-auto border-t border-border pt-3">
            {foundationFirst ? (
              <span className="sz-btn-gradient-block">
                <span className="font-normal text-[11px] opacity-90">Ir para o curso-base:</span>
                <span className="flex items-center gap-1.5">
                  <span className="line-clamp-1 flex-1 font-semibold text-sm">
                    {foundationTitle ?? 'Curso-base da etapa'}
                  </span>
                  <ArrowRight className="size-4 shrink-0" />
                </span>
              </span>
            ) : (
              <span className="flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2 text-muted-foreground text-xs">
                <Lock className="size-3.5" />
                Em breve na sua carreira
              </span>
            )}
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
            {available ? (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Liberado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Lock className="size-4" />
                Bloqueado
              </span>
            )}
            <span className="sz-btn-gradient h-8 px-3 text-xs">
              {available ? 'Acessar curso' : 'Quero acesso'}
            </span>
          </div>
        )}
      </div>
    </Card>
  )

  if (available) {
    return (
      <Link
        href={`/cursos/${encodeURIComponent(course.courseSlug)}`}
        className="group block h-full"
      >
        {body}
      </Link>
    )
  }
  if (careerLocked && course.careerLock?.foundationCourseSlug) {
    return (
      <Link
        href={`/cursos/${encodeURIComponent(course.careerLock.foundationCourseSlug)}`}
        className="group block h-full"
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
