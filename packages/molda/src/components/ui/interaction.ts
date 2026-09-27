import { clsx } from 'clsx'

/**
 * Campos que não recebem texto: com o foco neles, os atalhos do editor continuam valendo. O seletor
 * de cor nativo é o caso que importa: cancelado (Esc, Cancelar), ele não manda `change` e o foco
 * fica no campo escondido do "+ Nova cor", e os atalhos paravam até um clique fora.
 */
const NOT_TYPED = new Set([
  'color',
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'file',
  'image',
])

/** Campos editáveis não entregam seus atalhos ao editor global. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement) return !NOT_TYPED.has(target.type)
  const tag = target.tagName
  return tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
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

/**
 * Amostra de cor: a escolhida ganha um anel duplo (um vão claro e um anel escuro). Só a borda
 * escura sumia nas cores escuras (1,6:1 contra o preto); o vão claro separa o anel de qualquer cor.
 */
export function swatchClass(active: boolean): string {
  return clsx(
    'aspect-square min-h-11 min-w-11 rounded-md border-2 transition',
    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mld-accent',
    'disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'border-mld-surface ring-2 ring-mld-text ring-offset-2 ring-offset-mld-surface'
      : 'border-mld-border/60 hover:border-mld-text',
  )
}
