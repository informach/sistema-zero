'use client'

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useFocusMode } from './focus-mode'

/**
 * Botão do cabeçalho da aula que esconde/mostra UMA das barras laterais (os dois são
 * independentes). O lado do ícone comunica qual barra ele controla; o estado "pressed"
 * (barra escondida) acende no tint da marca, como o item ativo da sidebar. Some fora de
 * página de aula/desktop (`available`). Estilo 3D coerente com o botão "voltar" do header.
 */
export function FocusModeToggle({ target }: { target: 'nav' | 'outline' }) {
  const { navAvailable, outlineAvailable, navHidden, outlineHidden, toggleNav, toggleOutline } =
    useFocusMode()
  const available = target === 'nav' ? navAvailable : outlineAvailable
  if (!available) return null

  const hidden = target === 'nav' ? navHidden : outlineHidden
  const toggle = target === 'nav' ? toggleNav : toggleOutline
  const label =
    target === 'nav'
      ? hidden
        ? 'Mostrar menu'
        : 'Esconder menu'
      : hidden
        ? 'Mostrar lista de aulas'
        : 'Esconder lista de aulas'
  const Icon =
    target === 'nav'
      ? hidden
        ? PanelLeftOpen
        : PanelLeftClose
      : hidden
        ? PanelRightOpen
        : PanelRightClose

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-full border-2 transition-all',
        'shadow-[0_3px_0_var(--border)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--border)]',
        hidden
          ? 'border-primary bg-(--kids-cyan-tint) text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
