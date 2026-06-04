'use client'

import { Star } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '../../lib/cn'

const SIZES = { sm: 'size-4', md: 'size-6', lg: 'size-9' } as const

export type StarRatingValue = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5

/** Valores selecionáveis: 1–5 em passos de 0.5 (não existe meia da 1ª estrela). */
const INPUT_VALUES: StarRatingValue[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

function formatStars(value: number): string {
  return `${String(value).replace('.', ',')} de 5 estrelas`
}

/** Estrela com preenchimento inteiro/meio/vazio (overlay com clip de 50%). */
function StarGlyph({ fill, sizeClass }: { fill: 'full' | 'half' | 'empty'; sizeClass: string }) {
  return (
    <span aria-hidden className={cn('relative inline-block shrink-0', sizeClass)}>
      <Star className={cn(sizeClass, 'text-foreground/25')} />
      {fill !== 'empty' ? (
        <span className={cn('absolute inset-0 overflow-hidden', fill === 'half' && 'w-1/2')}>
          <Star className={cn(sizeClass, 'fill-amber-400 text-amber-400')} />
        </span>
      ) : null}
    </span>
  )
}

/**
 * Nota em estrelas (1–5, meia estrela). Sem `onChange` = display read-only;
 * com `onChange` = input acessível: radios NATIVOS (sr-only) sobre as metades
 * das estrelas (setas ±0.5 e foco grátis), hover com preview. O 1º alvo cobre
 * a estrela 1 INTEIRA (mínimo é 1).
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: {
  /** 0 = nenhuma seleção; senão 1–5 em passos de 0.5. */
  value: number
  onChange?: (value: StarRatingValue) => void
  size?: keyof typeof SIZES
  className?: string
  'aria-label'?: string
}) {
  const name = useId()
  const [hover, setHover] = useState<number | null>(null)
  const sizeClass = SIZES[size]
  const shown = hover ?? value

  const stars = [1, 2, 3, 4, 5].map((i) => (
    <StarGlyph
      key={i}
      fill={shown >= i ? 'full' : shown === i - 0.5 ? 'half' : 'empty'}
      sizeClass={sizeClass}
    />
  ))

  if (!onChange) {
    return (
      <span
        role="img"
        aria-label={ariaLabel ?? formatStars(value)}
        className={cn('inline-flex items-center', className)}
      >
        {stars}
      </span>
    )
  }

  return (
    <span
      className={cn('relative inline-flex items-center', className)}
      onMouseLeave={() => setHover(null)}
    >
      {stars}
      {/* Alvos invisíveis: 1ª estrela inteira (2/10) + 8 metades (1/10 cada). */}
      <span
        role="radiogroup"
        className="absolute inset-0 flex"
        aria-label={ariaLabel ?? 'Selecionar classificação'}
      >
        {INPUT_VALUES.map((v, idx) => (
          <label
            key={v}
            className={cn(
              'cursor-pointer rounded has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              idx === 0 ? 'flex-[2]' : 'flex-1',
            )}
            onMouseEnter={() => setHover(v)}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === v}
              onChange={() => onChange(v)}
            />
            <span className="sr-only">{formatStars(v)}</span>
          </label>
        ))}
      </span>
    </span>
  )
}
