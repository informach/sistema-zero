import { clsx } from 'clsx'

/** Campos editáveis não entregam seus atalhos ao editor global. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/** Aparência compartilhada dos chips selecionáveis dos editores. */
export function interactiveChipClass(active: boolean, padding = 'px-1'): string {
  return clsx(
    'min-h-11 rounded-lg border-2 text-xs font-bold transition',
    padding,
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
    active
      ? 'border-mld-accent bg-mld-accent text-mld-accent-fg'
      : 'border-mld-border bg-mld-surface text-mld-text hover:border-mld-accent',
  )
}
