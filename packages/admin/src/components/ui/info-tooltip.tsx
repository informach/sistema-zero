import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Tooltip leve (CSS puro, sem libs): ícone "i" que revela a explicação no
 * hover/focus. Acessível por teclado (botão focável + `aria-label`). Usado nos
 * cards do painel e nos labels dos formulários (via `Field.tooltip`).
 */
export function InfoTooltip({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('group relative inline-flex items-center', className)}>
      <button
        type="button"
        aria-label={text}
        tabIndex={0}
        className="inline-flex cursor-help items-center text-muted-foreground transition-colors hover:text-foreground focus:text-foreground focus:outline-none"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-64 -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-normal text-card-foreground shadow-md group-focus-within:visible group-hover:visible"
      >
        {text}
      </span>
    </span>
  )
}
