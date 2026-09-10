import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * O card que FECHA a página. Aparece nas cinco telas de referência, sempre na
 * última faixa: carta branca, ladrilho amarelo, título, uma frase e ou um botão,
 * ou uma fileira de chips.
 *
 * Existe para a página ter um fim. Hoje toda rota do kids simplesmente para —
 * a última seção acaba e sobra fundo, o que é boa parte da sensação de "sério".
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
  /** Alternativa ao botão: uma fileira de `KidsChip` de leitura. */
  chips?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'kids-carta flex flex-col gap-4 p-6 md:flex-row md:items-center md:gap-6',
        className,
      )}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-(--sz-kids-amarelo)">
        {/* Tinta escura no ouro (medido 8,73:1). Branco daria 1,48 e sumiria. */}
        <Icon className="size-6 text-(--sz-kids-tinta)" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="sz-display text-lg leading-tight">{title}</h3>
        {description ? (
          <p className="mt-1 font-semibold text-muted-foreground text-sm">{description}</p>
        ) : null}
        {chips ? <div className="mt-3 flex flex-wrap gap-2">{chips}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
