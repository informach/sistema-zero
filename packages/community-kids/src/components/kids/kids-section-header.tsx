import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * O título de uma SEÇÃO dentro de uma faixa: H2 em Baloo e uma frase curta embaixo,
 * com o respiro das telas-modelo (11/09/2026, medido pixel a pixel a 1440px: título de
 * 32px, frase de 15px, ~24px até o conteúdo). Existe para as páginas pararem de
 * escrever o mesmo par à mão, cada uma com uma escala.
 */
export function KidsSectionHeader({
  id,
  title,
  subtitle,
  actions,
  className,
}: {
  /** Id do H2, para a `<section aria-labelledby>` que envolve a faixa. */
  id?: string
  title: ReactNode
  subtitle?: ReactNode
  /** Controles à direita do título no desktop ("Ver o mapa da carreira →"). */
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // `pt-3`: nas telas-modelo a tinta do título de seção começa 62-64px abaixo da
        // borda da faixa, mais que o cartão que abre uma faixa (48px). A `.sz-display`
        // trava a entrelinha em 1.1, então o respiro vem daqui e não de um `leading-*`.
        'mb-6 flex flex-col gap-3 pt-3 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={id} className="sz-display text-[clamp(1.5rem,2.6vw,2rem)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2.5 font-medium text-[0.9375rem] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
