import { cn } from '@/lib/cn'
import type { CourseLevelSlug } from '@/lib/types'

/**
 * Dificuldade do curso (≠ do nível do ALUNO): rótulo + a cor vive no PONTINHO.
 * O texto fica em `text-foreground` (sempre AA em claro/escuro) — a cor saturada
 * de cada nível falharia o contraste como texto pequeno, sobretudo no dark.
 */
const INFO: Record<CourseLevelSlug, { label: string; dot: string }> = {
  iniciante: { label: 'Iniciante', dot: 'bg-(--kids-lime)' },
  intermediario: { label: 'Intermediário', dot: 'bg-(--sz-hot)' },
  avancado: { label: 'Avançado', dot: 'bg-(--level-elite)' },
}

/**
 * Chip da DIFICULDADE do curso (Iniciante/Intermediário/Avançado). Distinto do
 * nível do aluno — este descreve o curso. Ausente/desconhecido → não renderiza.
 * A cor é só o pontinho; o texto (o nome) já distingue sem depender de cor.
 */
export function CourseLevelChip({
  level,
  className,
}: {
  level?: CourseLevelSlug
  className?: string
}) {
  const info = level ? INFO[level] : null
  if (!info) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 font-semibold text-foreground text-xs shadow-sm backdrop-blur',
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', info.dot)} aria-hidden />
      {info.label}
    </span>
  )
}
