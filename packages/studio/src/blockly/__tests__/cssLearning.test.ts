import { describe, expect, it } from 'bun:test'
import { generateCSS } from '../../generators/css'
import { parseCSS } from '../../parsers/css'
import { BLOCK_CATALOG } from '../blockCatalog'
import { resolveBlockLevel } from '../blockLevels'
import { CSS_BLOCKS } from '../blocks/css'
import { categoryShades } from '../colorShades'
import { CATEGORY_COLORS } from '../theme'

type JsonArg = Record<string, unknown>

function isRecord(value: unknown): value is JsonArg {
  return typeof value === 'object' && value !== null
}

function cssBlock(type: string) {
  const definition = CSS_BLOCKS.find((block) => block.type === type)
  expect(definition, `bloco CSS ausente: ${type}`).toBeDefined()
  if (!definition) throw new Error(`bloco CSS ausente: ${type}`)
  return definition
}

function argsOf(type: string): JsonArg[] {
  const definition = cssBlock(type)
  return [definition.args0, definition.args1, definition.args2]
    .flatMap((args) => args ?? [])
    .filter(isRecord)
}

function argOf(type: string, name: string): JsonArg {
  const arg = argsOf(type).find((candidate) => candidate.name === name)
  expect(arg, `campo ${name} ausente em ${type}`).toBeDefined()
  if (!arg) throw new Error(`campo ${name} ausente em ${type}`)
  return arg
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
  const linear = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0)
}

function whiteContrast(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05)
}

describe('CSS para crianças — contrato pedagógico e funcional', () => {
  it('preserva media queries de largura E altura no round-trip', () => {
    for (const feature of ['max-width', 'min-width', 'max-height', 'min-height'] as const) {
      const original = [
        {
          type: 'mediaQuery' as const,
          feature,
          px: 600,
          rules: [{ selector: 'body', declarations: { color: 'red' } }],
        },
      ]
      expect(parseCSS(generateCSS(original))).toEqual(original)
    }
  })

  it('todo campo SELECTOR usa o seletor visual com texto livre', () => {
    const selectorArgs = CSS_BLOCKS.flatMap((block) =>
      [block.args0, block.args1, block.args2]
        .flatMap((args) => args ?? [])
        .filter(isRecord)
        .filter((arg) => arg.name === 'SELECTOR')
        .map((arg) => ({ block: block.type, arg })),
    )
    expect(selectorArgs.length).toBeGreaterThan(20)
    for (const { block, arg } of selectorArgs) {
      expect(arg.type, block).toBe('field_name_picker')
      expect(arg.kind, block).toBe('selector')
    }
  })

  it('os defaults genéricos formam uma regra CSS válida e visível', () => {
    expect(argOf('sz_css_rule', 'SELECTOR').text).toBe('body')
    expect(argOf('sz_css_decl', 'PROP').text).toBe('background-color')
    expect(argOf('sz_css_decl', 'VALUE').text).toBe('#7c3aed')
  })

  it('ensina os eixos corretos do Flex e a centralização completa', () => {
    expect(cssBlock('sz_css_justify').message0).toContain('eixo principal')
    expect(cssBlock('sz_css_align').message0).toContain('eixo transversal')
    expect(cssBlock('sz_css_justify').message0).not.toContain('horizontal')
    expect(cssBlock('sz_css_align').message0).not.toContain('vertical')
    expect(cssBlock('sz_css_offset').tooltip).toContain('translate(-50%, -50%)')
  })

  it('todo bloco tem ajuda curta em português', () => {
    for (const block of CSS_BLOCKS) {
      expect(block.tooltip?.trim().length, block.type).toBeGreaterThan(15)
    }
  })

  it('oferece fluxos completos para fonte, hover e animação', () => {
    expect(argOf('sz_css_use_font', 'SELECTOR')).toMatchObject({
      type: 'field_name_picker',
      kind: 'selector',
    })
    expect(argOf('sz_css_use_font', 'FONT')).toMatchObject({
      type: 'field_name_picker',
      kind: 'font',
    })
    expect(argOf('sz_css_apply_animation', 'NAME')).toMatchObject({
      type: 'field_name_picker',
      kind: 'animation',
    })
    expect(argsOf('sz_css_hover').some((arg) => arg.type === 'input_statement')).toBe(true)
  })

  it('usa campos limitados para números e seletor de imagem para assets', () => {
    expect(argOf('sz_css_opacity', 'VALUE')).toMatchObject({
      type: 'field_number',
      min: 0,
      max: 1,
      precision: 0.1,
    })
    expect(argOf('sz_css_grid', 'COLS')).toMatchObject({ type: 'field_number', precision: 1 })
    expect(argOf('sz_css_background_image', 'URL').type).toBe('field_asset_picker')
  })

  it('começa por estilo visual e deixa controles técnicos de jogo para depois', () => {
    const beginner = [
      'sz_css_body_background',
      'sz_css_body_text_color',
      'sz_css_body_center',
      'sz_css_width',
      'sz_css_height',
      'sz_css_border',
      'sz_css_padding',
      'sz_css_margin',
      'sz_css_font_size',
      'sz_css_text_color',
      'sz_css_background_color',
      'sz_css_border_radius',
    ]
    for (const type of beginner) expect(resolveBlockLevel(type), type).toBe('iniciante-2d')

    const gameControls = [
      'sz_css_position',
      'sz_css_offset',
      'sz_css_overflow',
      'sz_css_object_fit',
      'sz_css_opacity',
      'sz_css_z_index',
    ]
    for (const type of gameControls) expect(resolveBlockLevel(type), type).toBe('intermediario-2d')
  })

  it('mantém contraste AA com o texto branco em todos os grupos', () => {
    const shades = categoryShades(CATEGORY_COLORS.css, 8)
    expect(Math.min(...shades.map(whiteContrast))).toBeGreaterThanOrEqual(4.5)
  })

  it('expõe rótulos compreensíveis no catálogo do professor', () => {
    const labels = new Map(BLOCK_CATALOG.map((entry) => [entry.type, entry.label]))
    expect(labels.get('sz_css_rule')).toBe('Regra de estilo para uma parte da página')
    expect(labels.get('sz_css_decl')).toBe('Propriedade e valor de CSS')
    expect(labels.get('sz_css_var')).toBe('Criar variável de estilo')
    expect(labels.get('sz_css_media_query')).toBe('Adaptar o estilo ao tamanho da tela')
  })
})
