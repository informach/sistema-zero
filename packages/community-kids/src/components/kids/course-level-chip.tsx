import {
  COURSE_TIER_LABELS,
  type CourseTierSlug,
  courseTierOf,
} from '@sistemazero/member-shell/lib/course-tier'
import { cn } from '@/lib/cn'
import type { CourseLevelSlug, CourseTrack } from '@/lib/types'

/**
 * DEGRAU do curso (dificuldade × eixo 2D/3D — ≠ do nível do ALUNO): rótulo + a
 * cor vive no PONTINHO. O texto fica em `text-foreground` (sempre AA em
 * claro/escuro) — a cor saturada de cada nível falharia o contraste como texto
 * pequeno, sobretudo no dark. A cor marca a DIFICULDADE (2D e 3D da mesma
 * dificuldade compartilham o pontinho; o "2D/3D" do rótulo distingue o eixo).
 */
const DOT: Record<CourseTierSlug, string> = {
  'iniciante-2d': 'bg-(--kids-lime)',
  'iniciante-3d': 'bg-(--kids-lime)',
  'intermediario-2d': 'bg-(--sz-hot)',
  'intermediario-3d': 'bg-(--sz-hot)',
  'avancado-2d': 'bg-(--level-elite)',
  'avancado-3d': 'bg-(--level-elite)',
}

/**
 * Chip do DEGRAU do curso ("Iniciante 2D" … "Avançado 3D"). Distinto do nível
 * do aluno — este descreve o curso. Ausente/desconhecido → não renderiza.
 * `track` ausente (members antigo) → 2D.
 */
export function CourseLevelChip({
  level,
  track,
  className,
}: {
  level?: CourseLevelSlug
  track?: CourseTrack
  className?: string
}) {
  // `lenda` é FORA da carreira (não é degrau) → chip próprio, ponto dourado da Lenda.
  if (level === 'lenda') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 font-semibold text-foreground text-xs shadow-sm backdrop-blur',
          className,
        )}
      >
        <span className="size-2 rounded-full bg-(--level-god)" aria-hidden />
        Lenda
      </span>
    )
  }
  const tier = courseTierOf(level, track)
  if (!tier) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 font-semibold text-foreground text-xs shadow-sm backdrop-blur',
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', DOT[tier])} aria-hidden />
      {COURSE_TIER_LABELS[tier]}
    </span>
  )
}
