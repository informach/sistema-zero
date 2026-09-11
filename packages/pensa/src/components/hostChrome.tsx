/**
 * Chrome do HOST dentro do Pensa (07/09/2026): o botão de esconder o menu lateral da
 * comunidade entra nos dois cabeçalhos (home e detalhe do plano), com a receita compartilhada
 * das ferramentas (`.sz-tool-btn-menu`). Desde 11/09 o contrato também traz a seta da home
 * de volta à seção do host. O host (community-kids) só manda DADOS pelo
 * `PensaHostChromeProvider`; sem Provider (os testes, o playground sem `?host=1`) nada aparece.
 *
 * Os cabeçalhos rolam com o conteúdo (o `.pensa-planner` é o rolável), como nas galerias
 * do Pinta e do Molda — esconder o menu é ação rara; consistência entre as ferramentas vence.
 */
import { createContext, type MouseEvent, useContext } from 'react'
import type { PensaHostChrome, PensaHostChromeBack, PensaHostChromeMenu } from '../core/types'
import { ArrowLeftIcon, PanelIcon } from './icons'

const PensaHostChromeContext = createContext<PensaHostChrome | null>(null)

export const PensaHostChromeProvider = PensaHostChromeContext.Provider

/** O chrome do host (`null` fora do community-kids). */
export function usePensaHostChrome(): PensaHostChrome | null {
  return useContext(PensaHostChromeContext)
}

// O "voltar" do detalhe usa a mesma seta.
export { ArrowLeftIcon }

/**
 * Esconder/mostrar o menu lateral: a receita COMPARTILHADA `.sz-tool-btn-menu` de
 * `@sistemazero/ui/tool-chrome.css` (o quadrado de cantos de 12px das telas-modelo, 40px no
 * mouse e 44px no toque; "menu escondido" = borda e tinta suaves do acento via
 * `[aria-pressed]`), a MESMA do Pinta e do Estúdio. Sem `title` (com `aria-label` viraria
 * descrição).
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

/**
 * A seta da HOME de volta à seção do host (11/09/2026: "Voltar para Criar"): o MESMO quadrado do
 * menu, ao lado dele, com o nome no `aria-label`. É um link de verdade: o clique simples chama
 * `onNavigate` (o host troca de rota sem recarregar) e o clique com Ctrl/Cmd/Shift/Alt ou com o
 * botão do meio fica com o navegador. Espelho do `HostBackLink` do Estúdio e do Pinta.
 */
export function HostBackLink({ back }: { back: PensaHostChromeBack }) {
  return (
    <a
      href={back.href}
      aria-label={back.label}
      className="sz-tool-back"
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        back.onNavigate()
      }}
    >
      <ArrowLeftIcon />
    </a>
  )
}

function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}
