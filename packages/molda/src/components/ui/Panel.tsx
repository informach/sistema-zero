/**
 * Painel com CABEÇALHO: faixa de título tonal (.mld-panel-head) e o corpo
 * embaixo. O `aria-label` da `<section>` é o `title` por padrão.
 */
import { clsx } from 'clsx'
import type { JSX, ReactNode } from 'react'

export interface PanelProps {
  title: string
  ariaLabel?: string
  /** Botões à direita do título. */
  actions?: ReactNode
  /** Layout EXTERNO do painel. */
  className?: string
  /** Padding e rolagem do CORPO. Default `flex flex-col gap-2 p-2`. */
  bodyClassName?: string
  children: ReactNode
}

export function Panel({
  title,
  ariaLabel,
  actions,
  className,
  bodyClassName,
  children,
}: PanelProps): JSX.Element {
  return (
    <section
      aria-label={ariaLabel ?? title}
      className={clsx('mld-panel flex min-h-0 flex-col overflow-hidden', className)}
    >
      <div className="mld-panel-head">
        <span className="mld-display min-w-0 flex-1 truncate text-left text-xs uppercase tracking-wide text-mld-text">
          {title}
        </span>
        {actions ? <div className="flex shrink-0 items-center gap-0.5">{actions}</div> : null}
      </div>
      <div className={bodyClassName ?? 'flex min-h-0 flex-col gap-2 p-2'}>{children}</div>
    </section>
  )
}
