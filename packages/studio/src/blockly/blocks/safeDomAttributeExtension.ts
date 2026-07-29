import * as Blockly from 'blockly/core'
import { isGuidedDomAttributeName } from '../domSafety'

export const SAFE_DOM_ATTRIBUTE_EXTENSION = 'sz_safe_dom_attribute'

/** Impede que o bloco infantil aceite atributos executáveis ou de navegação. */
export function registerSafeDomAttributeExtension(): void {
  if (Blockly.Extensions.isRegistered(SAFE_DOM_ATTRIBUTE_EXTENSION)) return
  Blockly.Extensions.register(SAFE_DOM_ATTRIBUTE_EXTENSION, function (this: Blockly.Block) {
    this.getField('NAME')?.setValidator((value) => {
      const normalized = String(value).trim()
      return isGuidedDomAttributeName(normalized) ? normalized : null
    })
  })
}
