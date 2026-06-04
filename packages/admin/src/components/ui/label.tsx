import type * as React from 'react'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { cn } from '@/lib/cn'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
}

/** Campo de formulário: label + controle + erro/hint (+ tooltip "i" opcional). */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  tooltip,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  /** Explicação do campo, exibida num tooltip ao lado do label. */
  tooltip?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {tooltip ? (
        <span className="inline-flex items-center gap-1.5">
          <Label htmlFor={htmlFor}>{label}</Label>
          <InfoTooltip text={tooltip} />
        </span>
      ) : (
        <Label htmlFor={htmlFor}>{label}</Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
