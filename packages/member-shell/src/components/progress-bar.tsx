/** Barra de progresso com o gradiente da marca (`.sz-progress` do tema). */
export function ProgressBar({
  value,
  className,
  label,
}: {
  value: number
  className?: string
  label?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      className={className ? `sz-progress ${className}` : 'sz-progress'}
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  )
}
