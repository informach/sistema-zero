import { Check, Rocket } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  COURSE_BADGE_LABEL,
  type CourseBadge,
  type CourseBadgeInput,
  courseBadge,
} from '@/lib/course-badge'

/**
 * Selo de estado sobre a capa do curso. A régua (quem ganha qual selo, e por quê)
 * vive em `lib/course-badge.ts`; aqui é só a pintura.
 *
 * Curso pendente de Mural usa o chip SÓLIDO (é uma ação a fazer, não um troféu) e o
 * pronto usa o vidro discreto — a criança precisa varrer a trilha e achar o que falta,
 * não celebrar oito vezes. O par `bg-primary`/`text-primary-foreground` garante o
 * contraste sem depender de cor solta.
 *
 * ⚠️ NÃO é clicável: os dois cards já são um `<Link>` inteiro e âncora não aninha em
 * âncora. Virar atalho para publicar exigiria refazer a raiz do card.
 */
export function CourseBadgeChip({
  course,
  className,
  only,
}: {
  course: CourseBadgeInput
  className?: string
  /** Mostra só este estado (a home usa `publicar`: lá "pronta" já é dito pela barra). */
  only?: CourseBadge
}) {
  const badge = courseBadge(course)
  if (!badge || (only && badge !== only)) return null
  const pendente = badge === 'publicar'
  const Icon = pendente ? Rocket : Check
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-[11px] shadow-sm',
        pendente
          ? 'bg-primary text-primary-foreground'
          : 'bg-card/90 text-foreground backdrop-blur',
        className,
      )}
    >
      <Icon className={cn('size-3.5', pendente ? '' : 'text-primary')} aria-hidden />
      {COURSE_BADGE_LABEL[badge]}
    </span>
  )
}
