import type { JSX, MouseEvent } from 'react'
import { IconArrowLeft } from '#ui'
import type { StudioHostChromeBack } from '../../studio/host-chrome'

/**
 * A seta da LISTA de projetos de volta à seção do host ("Voltar para Criar", pedido dela de
 * 11/09/2026: toda página interna volta para a principal da seção). É a receita COMPARTILHADA
 * `.sz-tool-back` de `@sistemazero/ui/tool-chrome.css`: o mesmo quadrado do botão do menu, ao
 * lado dele, como a seta da barra do editor do Pinta nas telas-modelo. O nome existe só para o
 * leitor (sem `title`: com `aria-label` ele viraria descrição e o leitor repetiria).
 *
 * É um LINK de verdade: o clique simples fica com a navegação do host (sem recarregar a página)
 * e Ctrl/Cmd/Shift/o botão do meio ficam com o navegador (abrir noutra aba continua valendo).
 */
export function HostBackLink({ back }: { back: StudioHostChromeBack }): JSX.Element {
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
      <IconArrowLeft size={20} />
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
