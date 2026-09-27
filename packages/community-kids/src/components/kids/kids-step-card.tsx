import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** As cores dos passos, na ordem das telas-modelo: azul, âmbar, roxo, coral. */
const TONS = [
  { fundo: 'var(--tool-estudio)', tinta: 'var(--tool-estudio-fg)' },
  { fundo: 'var(--tool-pensa)', tinta: 'var(--tool-pensa-fg)' },
  { fundo: 'var(--tool-molda)', tinta: 'var(--tool-molda-fg)' },
  { fundo: 'var(--tool-pinta)', tinta: 'var(--tool-pinta-fg)' },
] as const

/**
 * Card NUMERADO — os passos dos Recados e dos Combinados do Clube. Desenho das
 * telas-modelo (11/09/2026): o número num QUADRADO colorido no alto, o título e o
 * texto embaixo dele. Cada passo tem a sua cor, na ordem azul, âmbar, roxo; o par da
 * cor é o das oficinas, que já passa AA (tinta escura no âmbar).
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
  const tom = TONS[(Math.max(1, step) - 1) % TONS.length] ?? TONS[0]
  return (
    <div className={cn('kids-carta p-6', className)}>
      <span
        aria-hidden="true"
        className="sz-display grid size-11 place-items-center rounded-[0.625rem] text-xl"
        style={{ backgroundColor: tom.fundo, color: tom.tinta }}
      >
        {step}
      </span>
      <h3 className="sz-display mt-4 text-xl leading-tight">{title}</h3>
      {children ? (
        <div className="mt-2 font-medium text-muted-foreground text-sm">{children}</div>
      ) : null}
    </div>
  )
}
