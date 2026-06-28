import { cn } from '@/lib/cn'
import type { CourseLevelSlug } from '@/lib/types'

/** Dificuldade do curso (≠ do nível do ALUNO): rótulo + cor. */
const INFO: Record<CourseLevelSlug, { label: string; dot: string; text: string }> = {
  iniciante: { label: 'Iniciante', dot: 'bg-(--kids-lime)', text: 'text-(--kids-lime)' },
  intermediario: { label: 'Intermediário', dot: 'bg-(--sz-hot)', text: 'text-(--sz-hot)' },
  avancado: { label: 'Avançado', dot: 'bg-(--level-elite)', text: 'text-(--level-elite)' },
}

/**
 * Chip da DIFICULDADE do curso (Iniciante/Intermediário/Avançado). Distinto do
 * nível do aluno — este descreve o curso. Ausente/desconhecido → não renderiza.
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
        'inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 font-semibold text-xs shadow-sm backdrop-blur',
        info.text,
        className,
      )}
    >
      <span className={cn('size-2 rounded-full', info.dot)} aria-hidden />
      {info.label}
    </span>
  )
}
