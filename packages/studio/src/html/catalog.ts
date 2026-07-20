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
    level: 'intermediario-2d',
  },
  {
    tag: 'nav',
    blockType: 'sz_html_nav',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'section',
    blockType: 'sz_html_section',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'footer',
    blockType: 'sz_html_footer',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'intermediario-2d',
  },
  {
    tag: 'main',
    blockType: 'sz_html_main',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'intermediario-2d',
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
    modeledAttributes: ['src', 'alt'],
    level: 'iniciante-2d',
  },
  {
    tag: 'form',
    blockType: 'sz_html_form',
    parserShape: 'container',
    contentModel: 'flow',
    categories: FLOW,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'input',
    blockType: 'sz_html_input',
    parserShape: 'void',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['type', 'placeholder'],
    level: 'iniciante-2d',
  },
  {
    tag: 'textarea',
    blockType: 'sz_html_textarea',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: PHRASING,
    modeledAttributes: ['placeholder'],
    level: 'iniciante-2d',
  },
  {
    tag: 'label',
    blockType: 'sz_html_label',
    parserShape: 'inline-text',
    contentModel: 'phrasing',
    categories: PHRASING,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'svg',
    blockType: 'sz_html_svg',
    parserShape: 'container',
    contentModel: 'svg',
    categories: SVG_ROOT,
    modeledAttributes: ['width', 'height', 'viewBox'],
    level: 'iniciante-2d',
  },
  {
    tag: 'title',
    blockType: 'sz_svg_title',
    parserShape: 'inline-text',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: [],
    level: 'iniciante-2d',
  },
  {
    tag: 'desc',
    blockType: 'sz_svg_desc',
    parserShape: 'inline-text',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: [],
    level: 'iniciante-2d',
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
    level: 'avancado-2d',
  },
  {
    tag: 'circle',
    blockType: 'sz_svg_circle',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['cx', 'cy', 'r', 'fill'],
    level: 'iniciante-2d',
  },
  {
    tag: 'ellipse',
    blockType: 'sz_svg_ellipse',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['cx', 'cy', 'rx', 'ry', 'fill'],
    level: 'iniciante-2d',
  },
  {
    tag: 'line',
    blockType: 'sz_svg_line',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['x1', 'y1', 'x2', 'y2', 'stroke'],
    level: 'iniciante-2d',
  },
  {
    tag: 'rect',
    blockType: 'sz_svg_rect',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['x', 'y', 'width', 'height', 'fill'],
    level: 'iniciante-2d',
  },
  {
    tag: 'polyline',
    blockType: 'sz_svg_polyline',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['points', 'fill', 'stroke'],
    level: 'iniciante-2d',
  },
  {
    tag: 'polygon',
    blockType: 'sz_svg_polygon',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['points', 'fill', 'stroke'],
    level: 'iniciante-2d',
  },
  {
    tag: 'text',
    blockType: 'sz_svg_text',
    parserShape: 'leaf',
    contentModel: 'none',
    categories: SVG_CHILD,
    modeledAttributes: ['x', 'y', 'fill'],
    level: 'iniciante-2d',
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

export function isSupportedHTMLInputType(value: string): boolean {
  return HTML_INPUT_TYPES.has(value)
}

export const HTML_BUTTON_TYPE_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['ação comum', 'button'],
  ['automático do navegador', ''],
  ['enviar formulário', 'submit'],
  ['limpar formulário', 'reset'],
]

export const HTML_INTERMEDIATE_BLOCK_TYPES: ReadonlySet<string> = new Set([
  ...HTML_ELEMENT_CATALOG.filter((entry) => entry.level === 'intermediario-2d').map(
    (entry) => entry.blockType,
  ),
  'sz_html_text',
  'sz_html_comment',
])

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
