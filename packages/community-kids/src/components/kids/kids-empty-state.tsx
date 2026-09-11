import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Estado vazio de verdade: círculo amarelo grande, título, frase e um caminho de
 * saída. Substitui a caixa tracejada cinza que se repetia em umas quinze telas do
 * kids e que, para a criança, lia como erro.
 *
 * Desenho das telas-modelo (11/09/2026, medido a 1440px nos Recados): o círculo é o
 * AMARELO da marca (96px) com o ícone de 40px no navy, título de 32px 19px abaixo do
 * círculo, frase de 17px numa coluna de ~560px e o botão logo embaixo. O amarelo é cor
 * de fundo e não segue o tema, e o navy também não: a dupla fica igual nos dois temas.
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
        <Icon className="size-10 text-(--sz-kids-navy)" />
      </span>
      <h3 className="sz-display mt-4 text-2xl md:text-[2rem]">{title}</h3>
      {description ? (
        <p className="mt-4 max-w-xl font-medium text-[1.0625rem] text-muted-foreground leading-[1.6]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
