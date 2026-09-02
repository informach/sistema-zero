/**
 * Botão base do Pinta: alvos ≥44px (público kids), variantes por token
 * `pin-*`. CTA primário usa a pill "3D" de sombra dura (.pin-btn-3d, espelho
 * do .sz-btn-gradient do community-kids).
 */
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, JSX, Ref } from 'react'
import type { LucideIcon } from './icons'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'pin-btn-3d disabled:hover:brightness-100',
  ghost: 'rounded-xl text-pin-text hover:bg-pin-border/40',
  outline:
    'rounded-xl border-2 border-pin-border bg-pin-surface text-pin-text hover:border-pin-accent',
  danger: 'rounded-full bg-pin-danger text-white hover:brightness-110',
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
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'pin-tool-active bg-pin-accent text-pin-accent-fg'
          : 'text-pin-text hover:bg-pin-border/40',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Botão de FERRAMENTA (lucide): o componente único dos rails do pixel, do
 * vetor e do mapa. `active` liga o visual E o aria-pressed (toggle); ações
 * pontuais (espelhar bitmap, girar…) simplesmente não passam `active`.
 *
 * `shortcut` entra SÓ na dica de tela ("Lápis (P)") — o `aria-label` segue
 * sendo o rótulo puro, que é como o leitor de tela e os testes o encontram.
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
