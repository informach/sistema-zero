import { cn } from '@/lib/cn'

/**
 * A barra de progresso da pele adulta, com `role="progressbar"`. ⚠️ Não usa a classe `sz-bar`: o
 * Estúdio tem uma `.sz-bar` própria (a barra de ferramentas, `display: flex` e 4,25rem de altura)
 * no mesmo pipeline de CSS, e as duas se somam.
 */
export function Meter({
  value,
  max,
  label,
  tone = 'acao',
  className,
}: {
  value: number
  max: number
  label: string
  tone?: 'acao' | 'ok'
  className?: string
}) {
  const current = Math.max(0, Math.min(value, max))
  const percent = max > 0 ? Math.round((current / max) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      data-feito={tone === 'ok' ? 'true' : undefined}
      className={cn('sz-hud', className)}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}
