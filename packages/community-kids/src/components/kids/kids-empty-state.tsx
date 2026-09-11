import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Estado vazio de verdade: círculo amarelo grande, título, frase e um caminho de
 * saída. Substitui a caixa tracejada cinza que se repetia em umas quinze telas do
 * kids e que, para a criança, lia como erro.
 *
 * Desenho das telas-modelo (11/09/2026): o círculo é o AMARELO da marca (96px) com o
 * ícone em tinta escura, dentro de uma carta branca de canto grande. O amarelo é cor
 * de fundo e não segue o tema; a tinta escura dá 8,73:1 nele.
 */
export function KidsEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'kids-carta flex flex-col items-center rounded-[2rem] px-6 py-12 text-center md:py-16',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-24 place-items-center rounded-full bg-(--sz-kids-amarelo)"
      >
        <Icon className="size-11 text-(--sz-kids-tinta)" />
      </span>
      <h3 className="sz-display mt-6 text-2xl md:text-[1.75rem]">{title}</h3>
      {description ? (
        <p className="mt-3 max-w-md font-medium text-base text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
