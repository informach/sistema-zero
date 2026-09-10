import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Card NUMERADO com selo colorido — os passos dos Recados e dos Combinados do
 * Clube. O número mora num selo circular da cor da unidade em volta, no lugar do
 * marcador de lista cinza que existe hoje.
 *
 * ⚠️ A palavra "etapa" é proibida na copy da plataforma (guarda
 * `copy-vocabulario`): aqui é "passo", e o número é decorativo — quem numera de
 * verdade é a ordem da lista, então o selo é `aria-hidden`.
 */
export function KidsStepCard({
  step,
  title,
  children,
  className,
}: {
  step: number
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('kids-carta flex gap-4 p-5', className)}>
      <span
        aria-hidden="true"
        className="sz-display grid size-9 shrink-0 place-items-center rounded-full text-base"
        style={{ backgroundColor: 'var(--unit)', color: 'var(--unit-fg)' }}
      >
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="sz-display text-base leading-tight">{title}</h3>
        {children ? (
          <div className="mt-1 font-semibold text-muted-foreground text-sm">{children}</div>
        ) : null}
      </div>
    </div>
  )
}
