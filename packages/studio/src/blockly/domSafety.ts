const BLOCKED_DOM_ATTRIBUTES = new Set([
  'action',
  'formaction',
  'href',
  'src',
  'srcdoc',
  'xlink:href',
])

const DOM_ATTRIBUTE_NAME = /^[A-Za-z_:][A-Za-z0-9:._-]*$/

/**
 * A categoria guiada aceita apenas atributos sem comportamento executável e
 * sem navegação. Atributos de evento e URL continuam disponíveis no código
 * avançado, onde a intenção fica explícita.
 */
export function isGuidedDomAttributeName(name: string): boolean {
  const normalized = name.trim().toLowerCase()
  return (
    DOM_ATTRIBUTE_NAME.test(name.trim()) &&
    !normalized.startsWith('on') &&
    !BLOCKED_DOM_ATTRIBUTES.has(normalized)
  )
}

export function isGuidedDomProperty(property: string): property is 'textContent' | 'value' {
  return property === 'textContent' || property === 'value'
}
