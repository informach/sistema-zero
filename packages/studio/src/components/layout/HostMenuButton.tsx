import type { JSX } from 'react'
import { IconPanelLeftClose, IconPanelLeftOpen } from '#ui'
import type { StudioHostChromeMenu } from '../../studio/host-chrome'

/**
 * Esconder/mostrar o menu da comunidade (host kids): a receita COMPARTILHADA
 * `.sz-tool-btn-menu` de `@sistemazero/ui/tool-chrome.css` (o QUADRADO das telas-modelo:
 * 40px no mouse, 44px no toque, cantos de 12px, dentro do conteúdo; pressionado = borda e
 * tinta suaves do acento via `[aria-pressed]`), a mesma do Pinta e do Pensa. Sem `title`: com
 * `aria-label` ele viraria descrição e o leitor repetiria. Mora aqui (e não em
 * `studio/host-chrome.ts`) porque aquele é o contrato de DADOS que o kids consome; este é o
 * desenho, que vive com a Topbar e a lista.
 */
export function HostMenuButton({ menu }: { menu: StudioHostChromeMenu }): JSX.Element {
  return (
    <button
      type="button"
      aria-label={menu.label}
      aria-pressed={menu.hidden}
      onClick={menu.onToggle}
      className="sz-tool-btn-menu"
    >
      {menu.hidden ? <IconPanelLeftOpen size={20} /> : <IconPanelLeftClose size={20} />}
    </button>
  )
}
