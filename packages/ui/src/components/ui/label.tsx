import type * as React from 'react'
import { cloneElement, isValidElement } from 'react'
import { cn } from '../../lib/cn'
import { InfoTooltip } from './info-tooltip'

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
  // Associa a mensagem (erro/dica) ao controle via `aria-describedby` e marca `aria-invalid`
  // no erro — sem isso o leitor de tela anuncia "inválido" mas nunca O QUÊ (a11y de formulário).
  // O erro é uma `role="alert"` (live region) p/ ser lido assim que aparece.
  const msgId = htmlFor
    ? error
      ? `${htmlFor}-error`
      : hint
        ? `${htmlFor}-hint`
        : undefined
    : undefined
  const control =
    msgId && isValidElement<Record<string, unknown>>(children)
      ? cloneElement(children, {
          'aria-describedby':
            [children.props['aria-describedby'], msgId].filter(Boolean).join(' ') || undefined,
          ...(error ? { 'aria-invalid': true } : {}),
        })
      : children
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
      {control}
      {error ? (
        <p id={msgId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
