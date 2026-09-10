import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Estado vazio de verdade: círculo colorido grande, título, frase e um caminho de
 * saída. Substitui a caixa tracejada cinza que hoje se repete em umas quinze telas
 * do kids e que, para a criança, lê como erro.
 *
 * A cor sai do `--unit` da unidade em volta; sem uma, cai no default do `:root`
 * (a cor de borda), que é neutro e continua legível.
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
    <div className={cn('kids-carta flex flex-col items-center px-6 py-10 text-center', className)}>
      <span
        aria-hidden="true"
        className="grid size-20 place-items-center rounded-full"
        style={{ backgroundColor: 'color-mix(in oklab, var(--unit) 16%, var(--card))' }}
      >
        <Icon
          className="size-9"
          style={{ color: 'color-mix(in oklab, var(--unit) 62%, var(--foreground))' }}
        />
      </span>
      <h3 className="sz-display mt-4 text-xl">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm font-semibold text-muted-foreground text-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
