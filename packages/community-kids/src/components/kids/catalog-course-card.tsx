import { Card } from '@sistemazero/ui/card'
import { BookOpen, Lock, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { CatalogCourseView } from '@/lib/types'
import { UNIT_THEME_CLASS, type UnitTheme } from './unit-theme'

interface CatalogCourseCardProps {
  course: CatalogCourseView
  /** URL final da página de vendas (metadata.salesPageUrl ?? FUNNEL_URL), resolvida no server. */
  salesUrl: string | null
  /** Tema da unidade (o grid alterna por índice); bloqueado fica neutro. */
  theme?: UnitTheme
}

/**
 * Card de "Todos os cursos": desbloqueado → entra no curso (vestindo o tema
 * da unidade); bloqueado → cadeado, card neutro e clique leva à página de
 * vendas (funil). Rodapé ShieldCheck "Liberado" / Lock "Bloqueado".
 */
export function CatalogCourseCard({ course, salesUrl, theme = 'cyan' }: CatalogCourseCardProps) {
  const body = (
    <Card
      className={cn(
        'h-full overflow-hidden p-0 dark:group-hover:brand-glow',
        course.hasAccess
          ? cn('kids-card kid-pop', UNIT_THEME_CLASS[theme])
          : 'transition-shadow group-hover:shadow-lg',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {course.coverImageUrl ? (
          // Capa pode ser URL externa arbitrária (autoria) → <img> simples,
          // sem `next/image` (evita configurar remotePatterns por domínio).
          <img
            src={course.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <BookOpen className="size-10 text-muted-foreground" />
          </div>
        )}
        {!course.hasAccess ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[2px]">
            <span className="flex size-12 items-center justify-center rounded-full border border-border bg-background/90 shadow-sm">
              <Lock className="size-5 text-muted-foreground" />
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="sz-display text-base">{course.title}</h3>
          {course.subtitle ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.subtitle}</p>
          ) : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          {course.hasAccess ? (
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
            {course.hasAccess ? 'Acessar curso' : 'Quero acesso'}
          </span>
        </div>
      </div>
    </Card>
  )

  if (course.hasAccess) {
    return (
      <Link
        href={`/cursos/${encodeURIComponent(course.courseSlug)}`}
        className="group block h-full"
      >
        {body}
      </Link>
    )
  }
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
