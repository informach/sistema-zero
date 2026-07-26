/**
 * Contrato central dos elementos HTML que o Studio representa com blocos.
 *
 * Este módulo não importa DOM, Blockly nem a IR. Parser, schema, Blockly e
 * curadoria podem consumi-lo sem criar ciclos ou aumentar o bundle inicial.
 */

export const HTML_TAGS = [
  'h1',
  'h2',
  'h3',
  'p',
  'span',
  'strong',
  'em',
  'button',
  'div',
  'header',
  'nav',
  'section',
  'footer',
  'main',
  'ul',
  'li',
  'a',
  'img',
  'form',
  'input',
  'textarea',
  'label',
  'svg',
  'title',
  'desc',
  'defs',
  'symbol',
  'g',
  'path',
  'circle',
  'ellipse',
  'line',
  'rect',
  'polyline',
  'polygon',
  'text',
  'use',
] as const

export type StudioHTMLTag = (typeof HTML_TAGS)[number]
export type HTMLParserShape = 'container' | 'inline-text' | 'leaf' | 'void'
export type HTMLContentModel = 'flow' | 'phrasing' | 'list-items' | 'svg' | 'none'
export type HTMLContentCategory = 'flow' | 'phrasing' | 'list-item' | 'svg'
export type HTMLLearningLevel = 'iniciante-2d' | 'intermediario-2d' | 'avancado-2d'

export interface HTMLElementDescriptor {
  tag: StudioHTMLTag
  blockType: string
  parserShape: HTMLParserShape
  contentModel: HTMLContentModel
  categories: readonly HTMLContentCategory[]
  modeledAttributes: readonly string[]
  level: HTMLLearningLevel
}

const FLOW = ['flow'] as const
const PHRASING = ['phrasing'] as const
const SVG_ROOT = ['phrasing', 'svg'] as const
const SVG_CHILD = ['svg'] as const

export const HTML_ELEMENT_CATALOG: readonly HTMLElementDescriptor[] = [
  {
    tag: 'h1',
    blockType: 'sz_html_h1',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'h2',
    blockType: 'sz_html_h2',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'h3',
    blockType: 'sz_html_h3',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'p',
    blockType: 'sz_html_p',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'span',
    blockType: 'sz_html_span',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: PHRASING,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'strong',
    blockType: 'sz_html_strong',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: PHRASING,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'em',
    blockType: 'sz_html_em',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: PHRASING,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'button',
    blockType: 'sz_html_button',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['type'],
    level: 'iniciante-2d',
  },
  {
    tag: 'div',
    blockType: 'sz_html_div',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'header',
    blockType: 'sz_html_header',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    // Tags semânticas de layout são avancado-2d (26/07): estrutura de página "na
    // unha". O essencial (título/parágrafo/imagem/caixa) fica no iniciante.
    level: 'avancado-2d',
  },
  {
    tag: 'nav',
    blockType: 'sz_html_nav',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'avancado-2d',
  },
  {
    tag: 'section',
    blockType: 'sz_html_section',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'avancado-2d',
  },
  {
    tag: 'footer',
    blockType: 'sz_html_footer',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'avancado-2d',
  },
  {
    tag: 'main',
    blockType: 'sz_html_main',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'avancado-2d',
  },
  {
    tag: 'ul',
    blockType: 'sz_html_ul',
    parserShape: 'container',
    contentModel: 'list-items',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'li',
    blockType: 'sz_html_li',
    parserShape: 'inline-text',
    contentModel: 'flow',
    categories: ['list-item'],
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'a',
    blockType: 'sz_html_link',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['href'],
    level: 'iniciante-2d',
  },
  {
    tag: 'img',
    blockType: 'sz_html_image',
    parserShape: 'void',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['src', 'alt', 'width', 'height', 'loading'],
    level: 'iniciante-2d',
  },
  {
    tag: 'form',
    blockType: 'sz_html_form',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    // Formulários/campos são avancado-2d (26/07): interatividade de página "na unha".
    level: 'avancado-2d',
  },
  {
    tag: 'input',
    blockType: 'sz_html_input',
    parserShape: 'void',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['type', 'placeholder', 'name', 'value', 'checked', 'autocomplete'],
    level: 'avancado-2d',
  },
  {
    tag: 'textarea',
    blockType: 'sz_html_textarea',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['placeholder', 'name', 'autocomplete'],
    level: 'avancado-2d',
  },
  {
    tag: 'label',
    blockType: 'sz_html_label',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: PHRASING,
    modeledAttributes: ['for'],
    level: 'avancado-2d',
  },
  {
    tag: 'svg',
    blockType: 'sz_html_svg',
    parserShape: 'container',
    contentModel: 'svg',
    categories: SVG_ROOT,
    modeledAttributes: ['width', 'height', 'viewBox'],
    // SVG inteiro é intermediario-2d (26/07): o primitivo VISUAL gentil — desenhar
    // formas declarando, um degrau antes do Canvas imperativo no avançado.
    level: 'intermediario-2d',
  },
  {
    tag: 'title',
    blockType: 'sz_svg_title',
    parserShape: 'inline-text',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'desc',
    blockType: 'sz_svg_desc',
    parserShape: 'inline-text',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'defs',
    blockType: 'sz_svg_defs',
    parserShape: 'container',
    contentModel: 'svg',
    categories: SVG_CHILD,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'symbol',
    blockType: 'sz_svg_symbol',
    parserShape: 'container',
    contentModel: 'svg',
    categories: SVG_CHILD,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'g',
    blockType: 'sz_svg_group',
    parserShape: 'container',
    contentModel: 'svg',
    categories: SVG_CHILD,
    modeledAttributes: ['transform'],
    level: 'intermediario-2d',
  },
  {
    tag: 'path',
    blockType: 'sz_svg_path',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['d', 'fill', 'stroke', 'transform'],
    level: 'intermediario-2d',
  },
  {
    tag: 'circle',
    blockType: 'sz_svg_circle',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['cx', 'cy', 'r', 'fill'],
    level: 'intermediario-2d',
  },
  {
    tag: 'ellipse',
    blockType: 'sz_svg_ellipse',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['cx', 'cy', 'rx', 'ry', 'fill'],
    level: 'intermediario-2d',
  },
  {
    tag: 'line',
    blockType: 'sz_svg_line',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['x1', 'y1', 'x2', 'y2', 'stroke'],
    level: 'intermediario-2d',
  },
  {
    tag: 'rect',
    blockType: 'sz_svg_rect',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['x', 'y', 'width', 'height', 'fill'],
    level: 'intermediario-2d',
  },
  {
    tag: 'polyline',
    blockType: 'sz_svg_polyline',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['points', 'fill', 'stroke'],
    level: 'intermediario-2d',
  },
  {
    tag: 'polygon',
    blockType: 'sz_svg_polygon',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['points', 'fill', 'stroke'],
    level: 'intermediario-2d',
  },
  {
    tag: 'text',
    blockType: 'sz_svg_text',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['x', 'y', 'fill'],
    level: 'intermediario-2d',
  },
  {
    tag: 'use',
    blockType: 'sz_svg_use',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['href', 'transform'],
    level: 'intermediario-2d',
  },
]

const ELEMENT_BY_TAG: ReadonlyMap<string, HTMLElementDescriptor> = new Map(
  HTML_ELEMENT_CATALOG.map((entry) => [entry.tag, entry]),
)
const ELEMENT_BY_BLOCK: ReadonlyMap<string, HTMLElementDescriptor> = new Map(
  HTML_ELEMENT_CATALOG.map((entry) => [entry.blockType, entry]),
)

export function htmlElementForTag(tag: string): HTMLElementDescriptor | undefined {
  return ELEMENT_BY_TAG.get(tag)
}

/** Verdade única para decidir se um elemento participa de texto corrido. */
export function isPhrasingHTMLTag(tag: string): boolean {
  return htmlElementForTag(tag)?.categories.includes('phrasing') === true
}

export function htmlElementForBlock(blockType: string): HTMLElementDescriptor | undefined {
  return ELEMENT_BY_BLOCK.get(blockType)
}

export const HTML_INPUT_TYPE_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['texto', 'text'],
  ['automático do navegador', ''],
  ['e-mail', 'email'],
  ['senha', 'password'],
  ['número', 'number'],
  ['marcar opção', 'checkbox'],
  ['escolher uma opção', 'radio'],
  ['data', 'date'],
  ['hora', 'time'],
  ['data e hora', 'datetime-local'],
  ['mês', 'month'],
  ['semana', 'week'],
  ['cor', 'color'],
  ['controle deslizante', 'range'],
  ['arquivo', 'file'],
  ['telefone', 'tel'],
  ['endereço da internet', 'url'],
  ['busca', 'search'],
  ['botão', 'button'],
  ['enviar formulário', 'submit'],
  ['limpar formulário', 'reset'],
]

const HTML_INPUT_TYPES = new Set(HTML_INPUT_TYPE_OPTIONS.map(([, value]) => value))
const HTML_INPUT_TYPE_STATES = new Set([...HTML_INPUT_TYPES, 'hidden', 'image'])

export function normalizeHTMLInputType(value: string): string | undefined {
  const normalized = value.toLowerCase()
  return HTML_INPUT_TYPES.has(normalized) ? normalized : undefined
}

/** Resolve o estado real do atributo enumerado `type`; valores inválidos viram texto. */
export function resolveHTMLInputTypeState(value: string): string {
  const normalized = value.toLowerCase()
  if (!normalized) return 'text'
  return HTML_INPUT_TYPE_STATES.has(normalized) ? normalized : 'text'
}

export function isSupportedHTMLInputType(value: string): boolean {
  return normalizeHTMLInputType(value) !== undefined
}

export const HTML_IMAGE_LOADING_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['automático', 'auto'],
  ['quando precisar', 'lazy'],
  ['imediato', 'eager'],
]

const HTML_IMAGE_LOADING_VALUES = new Set(['lazy', 'eager'])

export function isSupportedHTMLImageLoading(value: string): boolean {
  return HTML_IMAGE_LOADING_VALUES.has(value)
}

/** `width` e `height` da imagem guiada precisam reservar uma área real. */
export function isValidHTMLImageDimension(value: string): boolean {
  return /^[0-9]+$/.test(value) && /[1-9]/.test(value)
}

const HTML_AUTOCOMPLETE_GENERAL_FIELDS = new Set([
  'name',
  'honorific-prefix',
  'given-name',
  'additional-name',
  'family-name',
  'honorific-suffix',
  'nickname',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
  'organization-title',
  'organization',
  'street-address',
  'address-line1',
  'address-line2',
  'address-line3',
  'address-level4',
  'address-level3',
  'address-level2',
  'address-level1',
  'country',
  'country-name',
  'postal-code',
  'cc-name',
  'cc-given-name',
  'cc-additional-name',
  'cc-family-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
  'language',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'url',
  'photo',
])

const HTML_AUTOCOMPLETE_CONTACT_FIELDS = new Set([
  'tel',
  'tel-country-code',
  'tel-national',
  'tel-area-code',
  'tel-local',
  'tel-local-prefix',
  'tel-local-suffix',
  'tel-extension',
  'email',
  'impp',
])

const HTML_AUTOCOMPLETE_CONTACT_HINTS = new Set(['home', 'work', 'mobile', 'fax', 'pager'])

/**
 * Valida a ordem dos tokens de autofill definida pelo HTML: seção, endereço,
 * contato/campo e, por último, a credencial opcional `webauthn`.
 */
export function isValidHTMLAutocomplete(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  const tokens = trimmed.toLowerCase().split(/[\t\n\f\r ]+/)
  if (tokens.length === 1 && (tokens[0] === 'on' || tokens[0] === 'off')) return true

  let index = 0
  const section = tokens[index]
  if (section?.startsWith('section-')) {
    if (section.length === 'section-'.length) return false
    index += 1
  }
  if (tokens[index] === 'shipping' || tokens[index] === 'billing') index += 1

  const hasContactHint = HTML_AUTOCOMPLETE_CONTACT_HINTS.has(tokens[index] ?? '')
  if (hasContactHint) index += 1
  const field = tokens[index]
  if (
    !field ||
    (hasContactHint
      ? !HTML_AUTOCOMPLETE_CONTACT_FIELDS.has(field)
      : !HTML_AUTOCOMPLETE_GENERAL_FIELDS.has(field) &&
        !HTML_AUTOCOMPLETE_CONTACT_FIELDS.has(field))
  ) {
    return false
  }
  index += 1
  if (tokens[index] === 'webauthn') index += 1
  return index === tokens.length
}

export const HTML_BUTTON_TYPE_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['ação comum', 'button'],
  ['automático do navegador', ''],
  ['enviar formulário', 'submit'],
  ['limpar formulário', 'reset'],
]

const HTML_BUTTON_TYPES = new Set(HTML_BUTTON_TYPE_OPTIONS.map(([, value]) => value))

/**
 * Atributos enumerados HTML comparam palavras-chave sem diferenciar maiúsculas
 * e minúsculas. Devolve a palavra canônica aceita pelo dropdown ou `undefined`
 * quando o código precisa permanecer como HTML avançado para não mudar de ação.
 */
export function normalizeHTMLButtonType(value: string): string | undefined {
  const normalized = value.toLowerCase()
  return HTML_BUTTON_TYPES.has(normalized) ? normalized : undefined
}

export const HTML_INTERMEDIATE_BLOCK_TYPES: ReadonlySet<string> = new Set(
  // Hoje = os elementos SVG (reclassificados p/ intermediario-2d em 26/07). O texto
  // solto e o comentário voltaram ao ESSENCIAL (iniciante-2d, default) — saíram daqui.
  HTML_ELEMENT_CATALOG.filter((entry) => entry.level === 'intermediario-2d').map(
    (entry) => entry.blockType,
  ),
)

export const HTML_ADVANCED_BLOCK_TYPES: ReadonlySet<string> = new Set(
  HTML_ELEMENT_CATALOG.filter((entry) => entry.level === 'avancado-2d').map(
    (entry) => entry.blockType,
  ),
)

export const HTML_STRUCTURE_ROOT = 'sz_frame_structure'

function contentCategoriesForBlock(blockType: string): readonly HTMLContentCategory[] {
  if (blockType === 'sz_html_text' || blockType === 'sz_html_canvas') return PHRASING
  if (blockType === 'sz_html_comment' || blockType === 'sz_adv_raw_html') {
    return ['flow', 'phrasing', 'list-item', 'svg']
  }
  return htmlElementForBlock(blockType)?.categories ?? []
}

export function htmlContentModelForBlock(blockType: string): HTMLContentModel | undefined {
  if (blockType === HTML_STRUCTURE_ROOT) return 'flow'
  return htmlElementForBlock(blockType)?.contentModel
}

/** Retorna se um bloco pode ser filho direto do contêiner informado. */
export function isHTMLBlockChildAllowed(parentType: string, childType: string): boolean {
  const model = htmlContentModelForBlock(parentType)
  if (!model || model === 'none') return false
  const categories = contentCategoriesForBlock(childType)
  if (model === 'flow') return categories.includes('flow') || categories.includes('phrasing')
  if (model === 'phrasing') return categories.includes('phrasing')
  if (model === 'list-items') return categories.includes('list-item')
  return categories.includes('svg')
}

/** Versão por tag usada pelo schema da IR. */
export function isHTMLElementChildAllowed(
  parentTag: string,
  child: { type: string; tag?: string },
): boolean {
  const parent = htmlElementForTag(parentTag)
  if (!parent || parent.contentModel === 'none') return false
  if (child.type === 'comment' || child.type === 'rawHTML') return true
  if (child.type === 'text' || child.type === 'canvas') {
    return parent.contentModel === 'flow' || parent.contentModel === 'phrasing'
  }
  if (child.type !== 'element' || !child.tag) return false
  const descriptor = htmlElementForTag(child.tag)
  if (!descriptor) return false
  if (parent.contentModel === 'flow') {
    return descriptor.categories.includes('flow') || descriptor.categories.includes('phrasing')
  }
  if (parent.contentModel === 'phrasing') return descriptor.categories.includes('phrasing')
  if (parent.contentModel === 'list-items') return descriptor.categories.includes('list-item')
  return descriptor.categories.includes('svg')
}
