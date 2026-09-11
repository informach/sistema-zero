import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * O card que FECHA a página, sempre na última faixa (a lilás): carta branca,
 * ladrilho amarelo, título, uma frase e ou um botão, ou uma fileira de chips.
 *
 * Existe para a página ter um fim. Sem ele a última seção acaba e sobra fundo, o que
 * era boa parte da sensação de "sério". Desenho das telas-modelo de 11/09/2026: canto
 * maior que o do cartão comum (é a peça principal da faixa), ladrilho de 56px.
 */
export function KidsClosingCard({
  icon: Icon,
  title,
  description,
  action,
  chips,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Botão à direita no desktop, embaixo no celular. */
  action?: ReactNode
  /** Alternativa ao botão: uma fileira de chips logo abaixo do texto. */
  chips?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('kids-carta rounded-[2rem] p-6 md:p-8', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--sz-kids-amarelo)">
          {/* Tinta escura no ouro (medido 8,73:1). Branco daria 1,48 e sumiria. */}
          <Icon className="size-7 text-(--sz-kids-tinta)" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="sz-display text-xl leading-tight md:text-2xl">{title}</h3>
          {description ? (
            <p className="mt-1.5 font-medium text-[0.9375rem] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {chips ? <div className="mt-5 flex flex-wrap gap-3">{chips}</div> : null}
    </div>
  )
}
