/**
 * Chrome do HOST dentro do Pensa (07/09/2026): o botão de esconder o menu lateral da
 * comunidade entra nos dois cabeçalhos (home e detalhe do plano), com a receita compartilhada
 * das ferramentas (`.sz-tool-btn-menu`). O host (community-kids) só manda DADOS pelo
 * `PensaHostChromeProvider`; sem Provider (playground) nada aparece.
 *
 * Os cabeçalhos rolam com o conteúdo (o `.pensa-planner` é o rolável), como nas galerias
 * do Pinta e do Molda — esconder o menu é ação rara; consistência entre as ferramentas vence.
 */
import { createContext, useContext } from 'react'
import type { PensaHostChrome, PensaHostChromeMenu } from '../core/types'

const PensaHostChromeContext = createContext<PensaHostChrome | null>(null)

export const PensaHostChromeProvider = PensaHostChromeContext.Provider

/** O chrome do host (`null` fora do community-kids). */
export function usePensaHostChrome(): PensaHostChrome | null {
  return useContext(PensaHostChromeContext)
}

/** Ícones inline (traço, estilo Lucide) — o Pensa não depende de lucide-react. */
function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      {open ? <path d="m14 9 3 3-3 3" /> : <path d="m16 15-3-3 3-3" />}
    </svg>
  )
}

/** Seta para a esquerda (o "voltar" do detalhe), no mesmo traço. */
export function ArrowLeftIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

/**
 * Esconder/mostrar o menu lateral: a receita COMPARTILHADA `.sz-tool-btn-menu` de
 * `@sistemazero/ui/tool-chrome.css` (44px, cantos xl, borda 2px, fundo de painel, sombra
 * dura; "menu escondido" = borda e tinta suaves do acento via `[aria-pressed]`), a MESMA do
 * Pinta e do Estúdio. Sem `title` (com `aria-label` viraria descrição).
 */
export function HostMenuButton({ menu }: { menu: PensaHostChromeMenu }) {
  return (
    <button
      type="button"
      aria-label={menu.label}
      aria-pressed={menu.hidden}
      onClick={menu.onToggle}
      className="sz-tool-btn-menu"
    >
      <PanelIcon open={menu.hidden} />
    </button>
  )
}
