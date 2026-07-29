const BLOCKED_DOM_ATTRIBUTES = new Set([
  'action',
  'formaction',
  'href',
  'src',
  'srcdoc',
  'xlink:href',
])

const BLOCKED_HTML_ELEMENT_TAGS = new Set([
  'base',
  'embed',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
])

const GUIDED_SVG_ELEMENT_TAGS = new Set([
  'circle',
  'clippath',
  'defs',
  'ellipse',
  'g',
  'image',
  'line',
  'lineargradient',
  'marker',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialgradient',
  'rect',
  'stop',
  'svg',
  'symbol',
  'text',
  'textpath',
  'tspan',
  'use',
])

const DOM_ATTRIBUTE_NAME = /^[A-Za-z_:][A-Za-z0-9:._-]*$/
const HTML_ELEMENT_TAG = /^[a-z][a-z0-9-]*$/

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

/**
 * Tags criadas pelos blocos guiados não podem abrir um novo contexto de
 * execução ou navegação. SVG usa uma lista positiva porque `script` e
 * `foreignObject` transformariam o desenho em outro caminho para HTML/JS.
 */
export function isGuidedDomElementTag(tag: string, namespace: 'html' | 'svg'): boolean {
  const normalized = tag.trim().toLowerCase()
  if (namespace === 'svg') return GUIDED_SVG_ELEMENT_TAGS.has(normalized)
  return HTML_ELEMENT_TAG.test(normalized) && !BLOCKED_HTML_ELEMENT_TAGS.has(normalized)
}

export function isGuidedDomProperty(property: string): property is 'textContent' | 'value' {
  return property === 'textContent' || property === 'value'
}
