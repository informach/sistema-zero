// Compatibilidade para os consumidores existentes da camada Blockly. A regra
// vive fora dela para também ser usada por IR e parser sem dependência reversa.
export {
  isGuidedDomAttributeName,
  isGuidedDomElementTag,
  isGuidedDomProperty,
} from '../domSafety'
