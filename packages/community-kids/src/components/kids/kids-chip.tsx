import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Pílula tintada. Serve a dois papéis que a referência trata igual: filtro
 * clicável (o Mural) e etiqueta de leitura (o rodapé dos cards de fechamento).
 *
 * A cor do estado NORMAL sai do `--unit` da unidade em volta, o mesmo mecanismo de
 * indireção do resto do kids: quem escolhe é a classe `.kids-unit-*` do container,
 * então o chip não precisa saber de cor nenhuma.
 *
 * ⚠️ O estado SELECIONADO é da marca (`.kids-marca`), e não da unidade — como na
 * referência, onde o filtro ativo é uma pílula azul cheia. A razão não é só
 * estética: preenchido com `--unit` + `--unit-fg`, o rótulo de 14px media 4,37:1
 * na unidade rosa, 4,49 na lima e 4,51 na verde, ou seja, três das quatro
 * reprovavam AA no tema claro. O par da marca dá 5,53:1 no claro e 7:1 no escuro,
 * e nenhuma cor precisou mudar de valor.
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
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-sm',
    'border-2 border-transparent transition-colors',
    selected && 'kids-marca',
    className,
  )
  const estilo = selected
    ? undefined
    : {
        backgroundColor: 'color-mix(in oklab, var(--unit) 12%, var(--card))',
        borderColor: 'color-mix(in oklab, var(--unit) 28%, transparent)',
        // Não `var(--unit)` cru: as cores de unidade são de FUNDO e a tinta miúda
        // nelas reprova AA. Misturar com o texto do tema mantém o matiz e o contraste.
        color: 'color-mix(in oklab, var(--unit) 55%, var(--foreground))',
      }

  if (!onClick) {
    return (
      <span className={classes} style={estilo}>
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
      className={cn(classes, 'cursor-pointer hover:brightness-95')}
      style={estilo}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  )
}
