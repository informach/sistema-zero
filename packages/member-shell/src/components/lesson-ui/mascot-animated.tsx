'use client'
import { BUILTIN_ART } from '@sistemazero/edisvg/builtins'
import { EdiAnimation } from '@sistemazero/edisvg/react'
import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { useZappyFala } from '../zappy-fala-context'
import { tocandoDoZappy, type ZappyExpression } from './mascot'

/** Speech is controlled by the existing voice context. Other expressions retain their own clock. */
export function ZappyAnimated({
  expression = 'happy',
  className,
  stillClassName,
}: {
  expression?: ZappyExpression
  className?: string
  stillClassName?: string
}) {
  const speech = useZappyFala()
  const controlled = tocandoDoZappy(expression, speech)
  const art = BUILTIN_ART[expression]
  const inputs = useMemo(
    () => (expression === 'speaking' ? { falando: controlled !== false } : undefined),
    [expression, controlled],
  )
  return (
    <EdiAnimation
      src={art.url}
      poster={art.poster.url}
      width={48}
      height={48}
      className={cn('size-12 shrink-0 select-none', className)}
      posterClassName={stillClassName}
      playing={controlled !== false}
      inputs={inputs}
    />
  )
}
