import { CANVAS_BLOCKS } from '../../blockly/blocks/canvas'
import { CSS_BLOCKS } from '../../blockly/blocks/css'
import { HTML_BLOCKS } from '../../blockly/blocks/html'
import { SVG_BLOCKS } from '../../blockly/blocks/svg'
import type { BlockDefinition } from '../../blockly/blocks/types'

export type WebBlockCategory = 'html' | 'css' | 'svg' | 'canvas'

export type WebCodecDirection = 'block-to-ir' | 'ir-to-block' | 'ir-to-code' | 'code-to-ir'

export type WebCodecCompatibility = 'bidirectional' | 'forward-only' | 'legacy-hidden'
export type WebCodecIRKind = 'html' | 'css' | 'statement' | 'expression'

export interface WebBlockCodec {
  readonly blockType: string
  readonly category: WebBlockCategory
  readonly irKind: WebCodecIRKind
  readonly directions: readonly WebCodecDirection[]
  readonly compatibility: WebCodecCompatibility
}

const ALL_DIRECTIONS = Object.freeze<WebCodecDirection[]>([
  'block-to-ir',
  'ir-to-block',
  'ir-to-code',
  'code-to-ir',
])

const FORWARD_DIRECTIONS = Object.freeze<WebCodecDirection[]>(['block-to-ir', 'ir-to-code'])

/**
 * Atalhos pedagógicos que expandem para IR/CSS genérico. O código continua
 * voltando para blocos editáveis, mas não para o mesmo atalho visual; declarar
 * uma volta específica aqui seria um contrato falso.
 */
export const FORWARD_ONLY_WEB_BLOCK_TYPES = Object.freeze([
  'sz_css_use_font',
  'sz_css_transition',
  'sz_css_hover',
  'sz_css_focus_visible',
  'sz_css_grid',
  'sz_css_apply_animation',
  'sz_css_var',
  'sz_css_transform',
  'sz_css_perspective',
  'sz_css_grid_template',
  'sz_css_fill',
  'sz_css_stroke',
  'sz_css_stroke_width',
  'sz_css_stroke_dasharray',
  'sz_css_stroke_linecap',
  'sz_css_text_anchor',
] as const)

const FORWARD_ONLY_WEB_BLOCK_TYPE_SET: ReadonlySet<string> = new Set(FORWARD_ONLY_WEB_BLOCK_TYPES)

function codecForDefinition(
  category: WebBlockCategory,
  definition: BlockDefinition,
): WebBlockCodec {
  const compatibility =
    definition.type === 'sz_canvas_keyboard'
      ? 'legacy-hidden'
      : FORWARD_ONLY_WEB_BLOCK_TYPE_SET.has(definition.type)
        ? 'forward-only'
        : 'bidirectional'
  return {
    blockType: definition.type,
    category,
    irKind: definition.type.startsWith('sz_css_')
      ? 'css'
      : definition.type.startsWith('sz_html_') || definition.type.startsWith('sz_svg_')
        ? 'html'
        : definition.output
          ? 'expression'
          : 'statement',
    directions: compatibility === 'forward-only' ? FORWARD_DIRECTIONS : ALL_DIRECTIONS,
    compatibility,
  }
}

export function createWebBlockRegistry(codecs: readonly WebBlockCodec[]): readonly WebBlockCodec[] {
  const seen = new Set<string>()
  const frozen = codecs.map((codec) => {
    if (seen.has(codec.blockType)) {
      throw new Error(`Codec web duplicado para o bloco ${codec.blockType}.`)
    }
    if (codec.directions.length === 0) {
      throw new Error(`Codec web sem direção declarada para o bloco ${codec.blockType}.`)
    }
    const directions = new Set(codec.directions)
    if (directions.size !== codec.directions.length) {
      throw new Error(`Codec web com direção duplicada para o bloco ${codec.blockType}.`)
    }
    if (!directions.has('block-to-ir') || !directions.has('ir-to-code')) {
      throw new Error(`Codec web incompleto para o bloco ${codec.blockType}.`)
    }
    const hasAnyReverseDirection = directions.has('ir-to-block') || directions.has('code-to-ir')
    const hasAllReverseDirections = directions.has('ir-to-block') && directions.has('code-to-ir')
    if (
      codec.compatibility === 'forward-only' ? hasAnyReverseDirection : !hasAllReverseDirections
    ) {
      throw new Error(`Compatibilidade divergente para o bloco ${codec.blockType}.`)
    }
    seen.add(codec.blockType)
    return Object.freeze({ ...codec, directions: Object.freeze([...codec.directions]) })
  })
  return Object.freeze(frozen)
}

const DEFINITIONS_BY_CATEGORY = {
  html: HTML_BLOCKS,
  css: CSS_BLOCKS,
  svg: SVG_BLOCKS,
  canvas: CANVAS_BLOCKS,
} as const satisfies Record<WebBlockCategory, readonly BlockDefinition[]>

export const WEB_BLOCK_TYPES_BY_CATEGORY = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFINITIONS_BY_CATEGORY).map(([category, definitions]) => [
      category,
      Object.freeze(definitions.map((definition) => definition.type)),
    ]),
  ),
) as Readonly<Record<WebBlockCategory, readonly string[]>>

export const WEB_BLOCK_CODECS = createWebBlockRegistry(
  (
    Object.entries(DEFINITIONS_BY_CATEGORY) as Array<[WebBlockCategory, readonly BlockDefinition[]]>
  ).flatMap(([category, definitions]) =>
    definitions.map((definition) => codecForDefinition(category, definition)),
  ),
)

const WEB_CODEC_BY_BLOCK_TYPE = new Map(
  WEB_BLOCK_CODECS.map((codec) => [codec.blockType, codec] as const),
)

export function webCodecForBlockType(blockType: string): WebBlockCodec | undefined {
  return WEB_CODEC_BY_BLOCK_TYPE.get(blockType)
}

export function webCodecSupports(codec: WebBlockCodec, direction: WebCodecDirection): boolean {
  return codec.directions.includes(direction)
}
