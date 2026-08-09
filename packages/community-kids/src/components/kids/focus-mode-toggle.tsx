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
 * Duas roupas para o MESMO controle (mesmo rótulo, mesmo ícone, mesmo estado):
 * - **`header`** (padrão): círculo do cabeçalho da aula, no estilo 3D do
 *   `KidsBackButton`, ao lado do "voltar" e do progresso.
 * - **`edge`**: PUXADOR colado na borda esquerda, para as telas dos apps de criação
 *   (Estúdio/Pensa/Pinta), que não têm cabeçalho nenhum onde pendurar o círculo.
 *   ⚠️ Ele mora na CALHA de padding que o `MainContainer` reserva nessas rotas — não
 *   pode flutuar por cima do app: no Estúdio a borda esquerda é a caixa de blocos do
 *   Blockly, e o puxador cobriria uma categoria.
 */
export function FocusModeToggle({
  target,
  variant = 'header',
}: {
  target: 'nav' | 'outline'
  variant?: 'header' | 'edge'
}) {
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
        'grid shrink-0 place-items-center border-2 transition-[color,background-color,border-color,box-shadow,transform]',
        variant === 'edge'
          ? // Pílula vertical presa à borda esquerda da área de conteúdo, centrada na
            // altura. `z-30` basta: o puxador é IRMÃO do app (a raiz do Estúdio é uma
            // cerca `isolation: isolate`, então os z-index de dentro dele — a toolbox
            // é 70 — não escapam). O que é portalado p/ o `document.body` (menus da
            // Topbar, dropdowns do Blockly) segue passando por cima, que é o certo.
            //
            // ⚠️ O anel de foco é INSET (`inset ... var(--ring)`), não o de fora. O
            // puxador encosta EXATAMENTE na borda de recorte do `<main>` (que é
            // `overflow-hidden`), então qualquer indicador desenhado PARA FORA perde o
            // lado esquerdo — quem navega por teclado veria meio anel. A sombra dura
            // (2px 2px) cresce p/ a direita e p/ baixo, por isso sobrevive ao recorte.
            '-translate-y-1/2 absolute top-1/2 left-0 z-30 h-16 w-7 rounded-r-xl shadow-[2px_2px_0_var(--border)] focus-visible:shadow-[inset_0_0_0_3px_var(--ring),2px_2px_0_var(--border)] focus-visible:outline-none active:translate-x-[1px] active:shadow-[1px_2px_0_var(--border)]'
          : 'size-11 rounded-full shadow-[0_3px_0_var(--border)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--border)]',
        hidden
          ? 'border-primary bg-(--kids-cyan-tint) text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className={variant === 'edge' ? 'size-4' : 'size-5'} />
    </button>
  )
}
