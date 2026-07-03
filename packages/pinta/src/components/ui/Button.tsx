/**
 * Botão base do Pinta: alvos ≥44px (público kids), variantes por token
 * `pin-*`. Sem dependência externa.
 */
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, JSX } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-pin-accent text-pin-accent-fg hover:brightness-110 disabled:hover:brightness-100 shadow-sm',
  ghost: 'text-pin-text hover:bg-pin-border/40',
  outline: 'border-2 border-pin-border bg-pin-surface text-pin-text hover:border-pin-accent',
  danger: 'bg-pin-danger text-white hover:brightness-110',
}

export function Button({
  variant = 'outline',
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  )
}

/** Botão quadrado só-ícone (toolbar), mesmo alvo mínimo de 44px. */
export function IconButton({
  active = false,
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'bg-pin-accent text-pin-accent-fg shadow-sm'
          : 'text-pin-text hover:bg-pin-border/40',
        className,
      )}
      {...props}
    />
  )
}
