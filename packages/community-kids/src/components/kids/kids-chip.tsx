import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Pílula. Serve a dois papéis: FILTRO clicável (o Mural) e ETIQUETA de leitura.
 *
 * Filtro (com `onClick`), no desenho das telas-modelo (11/09/2026): o escolhido é a
 * pílula azul cheia da marca e os outros são brancos com o fio da borda. O par da
 * marca dá 5,53:1 no claro e 7:1 no escuro, sem tocar em cor nenhuma.
 *
 * Etiqueta (sem `onClick`): a cor sai do `--unit` da unidade em volta, o mesmo
 * mecanismo de indireção do resto do kids — quem escolhe é a classe `.kids-unit-*` do
 * container, então o chip não precisa saber de cor nenhuma.
 */
export function KidsChip({
  icon: Icon,
  children,
  selected = false,
  onClick,
  className,
}: {
  icon?: LucideIcon
  children: ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}) {
  if (!onClick) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border-2 border-transparent px-3 py-1.5 font-bold text-sm',
          selected && 'kids-marca',
          className,
        )}
        style={
          selected
            ? undefined
            : {
                backgroundColor: 'color-mix(in oklab, var(--unit) 12%, var(--card))',
                borderColor: 'color-mix(in oklab, var(--unit) 28%, transparent)',
                // Não `var(--unit)` cru: as cores de unidade são de FUNDO e a tinta miúda
                // nelas reprova AA. Misturar com o texto do tema mantém o matiz e o contraste.
                color: 'color-mix(in oklab, var(--unit) 55%, var(--foreground))',
              }
        }
      >
        {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        // 44px: é alvo de toque de mão pequena, a régua da casa para todo controle.
        'inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-bold text-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        selected ? 'kids-marca' : 'bg-card text-foreground ring-1 ring-border hover:bg-muted',
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  )
}
