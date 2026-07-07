'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/cn'

// Potencial da ideia é 1..3 (≠ do star-rating 1–5 com meia estrela do ui).
const LEVELS = [1, 2, 3] as const

/** Estrelas 1..3 somente leitura (lista de ideias). Sem valor, não renderiza. */
export function PotentialStars({ value }: { value: number | null }) {
  if (!value) return null
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Potencial ${value} de 3`}
    >
      {LEVELS.map((level) => (
        <Star
          key={level}
          className={cn(
            'size-3.5',
            level <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
          )}
          aria-hidden
        />
      ))}
    </span>
  )
}

/** Controle de potencial 1..3: clique marca; clicar de novo no valor atual limpa. */
export function PotentialStarsInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          disabled={disabled}
          onClick={() => onChange(level === value ? null : level)}
          aria-label={`Potencial ${level} de 3`}
          aria-pressed={value !== null && level <= value}
          className="rounded-md p-1 transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <Star
            className={cn(
              'size-5',
              value !== null && level <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/50',
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  )
}
