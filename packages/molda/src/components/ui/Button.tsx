/**
 * Botão base do Molda: alvos ≥44px (público kids), variantes por token
 * `mld-*`. CTA primário usa a pill "3D" de sombra dura (.mld-btn-3d, espelho
 * do .sz-btn-gradient do community-kids). Cópia por valor do Pinta.
 */
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, JSX, Ref } from 'react'
import type { LucideIcon } from './icons'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'mld-btn-3d disabled:hover:brightness-100',
  ghost: 'rounded-xl text-mld-text hover:bg-mld-border/40',
  outline:
    'rounded-xl border-2 border-mld-border bg-mld-surface text-mld-text hover:border-mld-accent',
  danger: 'rounded-full bg-mld-danger text-white hover:brightness-110',
}

export function Button({
  variant = 'outline',
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  /** React 19 entrega o `ref` como prop: ele segue no spread até o `<button>`. */
  ref?: Ref<HTMLButtonElement>
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 px-4 text-base font-bold transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
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
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  ref?: Ref<HTMLButtonElement>
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'mld-tool-active bg-mld-accent text-mld-accent-fg'
          : 'text-mld-text hover:bg-mld-border/40',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Botão de FERRAMENTA (lucide). `active` liga o visual E o aria-pressed
 * (toggle); ações pontuais simplesmente não passam `active`. `shortcut` entra
 * SÓ na dica de tela ("Lápis (P)"): o `aria-label` segue sendo o rótulo puro.
 */
export function ToolButton({
  icon: Icon,
  label,
  active,
  shortcut,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  shortcut?: string
}): JSX.Element {
  return (
    <IconButton
      active={active ?? false}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </IconButton>
  )
}
