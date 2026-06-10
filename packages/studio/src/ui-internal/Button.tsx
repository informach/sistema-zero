import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'ghost' | 'danger' | 'subtle'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-sz-accent text-sz-bg hover:bg-sz-accent-soft disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-sz-fg-soft hover:bg-sz-panel hover:text-sz-fg border border-sz-border',
  danger: 'bg-sz-error/20 text-sz-error hover:bg-sz-error/30 border border-sz-error/40',
  subtle: 'bg-sz-panel text-sz-fg hover:bg-sz-panel-soft',
}

const sizeClasses = {
  sm: 'h-8 px-3.5 py-1.5 text-sm gap-1.5',
  md: 'h-10 px-4 py-2 text-base gap-2',
}

export function Button({
  variant = 'subtle',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  return (
    <button
      type="button"
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sz-accent/60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
