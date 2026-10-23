'use client'

import { EdgePanelHandle } from '@sistemazero/ui/edge-panel-handle'
import { useFocusMode } from './focus-mode'

/**
 * Alça que esconde/mostra UMA das barras laterais (os dois estados são independentes).
 * Some fora das telas/tamanhos em que o painel correspondente existe e enquanto
 * um projeto de criação está aberto (`available`).
 *
 * ⚠️ **SEM `title`** (mesma regra do `KidsBackButton`): com `aria-label` presente, o
 * `title` não vira NOME e sim DESCRIÇÃO — o leitor de tela diria "Esconder menu,
 * botão, Esconder menu". E no público tablet/celular tooltip nem aparece.
 *
 * É montada uma vez no shell Kids, como irmã dos painéis. Não mora em cabeçalhos:
 * a posição fechada continua visível mesmo quando o painel ganha largura zero.
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
  return (
    <EdgePanelHandle
      side={target === 'nav' ? 'left' : 'right'}
      open={!hidden}
      openOffset={target === 'nav' ? 'var(--kids-menu-width)' : 'var(--lesson-outline-width)'}
      label={label}
      controlsId={target === 'nav' ? 'kids-app-sidebar' : 'kids-lesson-outline'}
      onToggle={toggle}
      className={
        target === 'nav'
          ? 'border-(--menu-2) bg-(--menu) text-(--menu-texto)'
          : 'z-[62] border-border bg-card text-foreground lg:z-[42]'
      }
    />
  )
}
