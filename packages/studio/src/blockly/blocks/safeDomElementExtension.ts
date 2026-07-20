import * as Blockly from 'blockly/core'
import { isGuidedDomElementTag } from '../domSafety'

export const SAFE_DOM_HTML_ELEMENT_EXTENSION = 'sz_safe_dom_html_element'
export const SAFE_DOM_SVG_ELEMENT_EXTENSION = 'sz_safe_dom_svg_element'

function register(name: string, namespace: 'html' | 'svg'): void {
  if (Blockly.Extensions.isRegistered(name)) return
  Blockly.Extensions.register(name, function (this: Blockly.Block) {
    this.getField('TAG')?.setValidator((value) => {
      const normalized = String(value).trim()
      return isGuidedDomElementTag(normalized, namespace) ? normalized : null
    })
  })
}

/** Impede que criação guiada aceite tags executáveis ou navegáveis. */
export function registerSafeDomElementExtensions(): void {
  register(SAFE_DOM_HTML_ELEMENT_EXTENSION, 'html')
  register(SAFE_DOM_SVG_ELEMENT_EXTENSION, 'svg')
}
