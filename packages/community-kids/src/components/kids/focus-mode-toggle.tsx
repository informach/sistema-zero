'use client'

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useFocusMode } from './focus-mode'

/**
 * Botão que esconde/mostra UMA das barras laterais (os dois são independentes). O
 * lado do ícone comunica qual barra ele controla; o estado "pressed" (barra
 * escondida) acende no tint da marca, como o item ativo da sidebar. Some fora das
 * telas/tamanhos em que faz sentido (`available`).
 *
 * ⚠️ **SEM `title`** (mesma regra do `KidsBackButton`): com `aria-label` presente, o
 * `title` não vira NOME e sim DESCRIÇÃO — o leitor de tela diria "Esconder menu,
 * botão, Esconder menu". E no público tablet/celular tooltip nem aparece.
 *
 * Mora na barra de cima da AULA: o quadrado creme das telas-modelo (11/09/2026), ao lado
 * do "voltar" e do progresso. Nas quatro ferramentas o botão do menu é desenhado pela
 * PRÓPRIA ferramenta (contrato `hostChrome`, `use-host-chrome.tsx`); o puxador na borda
 * (a roupa `edge`), que o Molda usava por último, saiu no lote 6b.
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
      className={cn(
        // O QUADRADO creme de cantos redondos das telas-modelo (11/09/2026), sem borda nem
        // sombra dura. Escondido = o azul clarinho da marca.
        'grid size-11 shrink-0 place-items-center rounded-[0.875rem] border-2 border-transparent transition-[color,background-color,border-color,box-shadow,transform] active:translate-y-px',
        hidden
          ? 'bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))] text-primary'
          : 'bg-(--band-creme) text-(--tinta) hover:bg-[color-mix(in_oklab,var(--band-creme)_90%,var(--foreground))]',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
