import * as Blockly from 'blockly/core'

/**
 * Os portais globais do Blockly (o editor de campo, a lista de opções, o menu do botão direito e
 * a dica) moram no `document.body`. Dentro de um `<dialog>` aberto com `showModal()`, tudo o que
 * fica fora do diálogo é inerte: o campo abria sem aceitar digitação, a lista não respondia e o
 * botão direito não mostrava nada (retorno de quem testou o desafio do Arquipélago, 01/11/2026).
 *
 * Quando o host escolhe um contêiner de portais (`StudioPortalContainerProvider`), os editores de
 * blocos põem os portais num plano DENTRO dele. O plano é fixo no canto da janela e sem tamanho:
 * não cobre nada e mantém as coordenadas de página que o Blockly usa. Contagem por contêiner,
 * porque dois editores podem estar montados ao mesmo tempo (a troca entre largo e estreito); o
 * último a sair devolve os portais e o contêiner anterior.
 */
const planos = new Map<HTMLElement, { usos: number; restaurar: () => void }>()

export function blocklyPortalsInside(container: HTMLElement): () => void {
  const existente = planos.get(container)
  if (existente) {
    existente.usos++
    return () => soltar(container)
  }
  const anterior = Blockly.common.getParentContainer() ?? document.body
  const plano = document.createElement('div')
  plano.dataset.szBlocklyPortais = ''
  Object.assign(plano.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '0',
    height: '0',
    overflow: 'visible',
    zIndex: '60',
  })
  container.append(plano)
  esconderPortais()
  const pais = new Map<Element, Element>()
  for (const portal of document.querySelectorAll(
    '.blocklyWidgetDiv, .blocklyDropDownDiv, .blocklyTooltipDiv',
  )) {
    if (portal.parentElement) pais.set(portal, portal.parentElement)
    plano.append(portal)
  }
  Blockly.common.setParentContainer(plano)
  planos.set(container, {
    usos: 1,
    restaurar: () => {
      esconderPortais()
      Blockly.common.setParentContainer(anterior.isConnected ? anterior : document.body)
      for (const portal of Array.from(plano.children)) {
        const pai = pais.get(portal) ?? anterior
        ;(pai.isConnected ? pai : document.body).append(portal)
      }
      plano.remove()
    },
  })
  return () => soltar(container)
}

function soltar(container: HTMLElement): void {
  const registro = planos.get(container)
  if (!registro) return
  registro.usos--
  if (registro.usos > 0) return
  planos.delete(container)
  registro.restaurar()
}

function esconderPortais(): void {
  Blockly.DropDownDiv.hideWithoutAnimation()
  Blockly.WidgetDiv.hide()
  Blockly.Tooltip.hide()
}
