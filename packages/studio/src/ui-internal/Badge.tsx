import type { JSX, ReactNode } from 'react'
import { cn } from './cn'

type Tone = 'neutral' | 'accent' | 'warn' | 'success' | 'error'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-sz-panel text-sz-fg-soft border-sz-border',
  accent: 'bg-sz-accent/15 text-sz-accent border-sz-accent/30',
  warn: 'bg-sz-warn/15 text-sz-warn border-sz-warn/30',
  success: 'bg-sz-success/15 text-sz-success border-sz-success/30',
  error: 'bg-sz-error/15 text-sz-error border-sz-error/30',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-xs',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
