import * as Blockly from 'blockly/core'

/**
 * Os portais globais do Blockly precisam estar dentro do diálogo modal.
 * O plano fixo mantém as coordenadas da janela usadas pelos menus. Restaurar
 * os portais e o parent evita afetar outro Estúdio aberto na mesma página.
 */
export function portaisBlocklyNoDialogo(dialog: HTMLDialogElement): () => void {
  const anterior = Blockly.common.getParentContainer() ?? document.body
  const plano = document.createElement('div')
  plano.className = 'sz-lumi-portais'
  dialog.append(plano)
  Blockly.DropDownDiv.hideWithoutAnimation()
  Blockly.WidgetDiv.hide()
  Blockly.Tooltip.hide()
  const pais = new Map<Element, Element>()
  for (const portal of document.querySelectorAll(
    '.blocklyWidgetDiv, .blocklyDropDownDiv, .blocklyTooltipDiv',
  )) {
    if (portal.parentElement) pais.set(portal, portal.parentElement)
    plano.append(portal)
  }
  Blockly.common.setParentContainer(plano)
  return () => {
    Blockly.DropDownDiv.hideWithoutAnimation()
    Blockly.WidgetDiv.hide()
    Blockly.Tooltip.hide()
    Blockly.common.setParentContainer(anterior.isConnected ? anterior : document.body)
    for (const portal of Array.from(plano.children)) {
      const pai = pais.get(portal) ?? anterior
      ;(pai.isConnected ? pai : document.body).append(portal)
    }
    plano.remove()
  }
}
