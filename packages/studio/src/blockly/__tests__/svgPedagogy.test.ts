import { describe, expect, it } from 'bun:test'
import { HTML_ELEMENT_CATALOG } from '../../html/catalog'
import { SVG_BLOCKS, SVG_GROUPS } from '../blocks/svg'

type FieldDefinition = {
  type?: string
  name?: string
  text?: string
  colour?: string
  kind?: string
}

function field(blockType: string, name: string): FieldDefinition | undefined {
  const block = SVG_BLOCKS.find((candidate) => candidate.type === blockType)
  return [block?.args0, block?.args1, block?.args2, block?.args3, block?.args4, block?.args5]
    .flatMap((args) => (Array.isArray(args) ? args : []))
    .find(
      (candidate): candidate is FieldDefinition =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'name' in candidate &&
        candidate.name === name,
    )
}

describe('SVG — contrato pedagógico infantil', () => {
  it('oferece o fluxo completo de desenho, acessibilidade e reutilização', () => {
    const types = new Set(SVG_BLOCKS.map((block) => block.type))
    for (const type of [
      'sz_html_svg',
      'sz_svg_title',
      'sz_svg_desc',
      'sz_svg_defs',
      'sz_svg_symbol',
      'sz_svg_use',
      'sz_svg_circle',
      'sz_css_fill',
    ]) {
      expect(types.has(type)).toBe(true)
    }
  })

  it('todo bloco explica sua função e pertence a exatamente um grupo', () => {
    const grouped = SVG_GROUPS.flatMap((group) => group.types)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect(new Set(grouped)).toEqual(new Set(SVG_BLOCKS.map((block) => block.type)))
    for (const block of SVG_BLOCKS) {
      expect(block.tooltip?.trim().length).toBeGreaterThan(0)
    }
  })

  it('os blocos de formas reutilizáveis expõem um id opcional', () => {
    for (const type of [
      'sz_svg_circle',
      'sz_svg_ellipse',
      'sz_svg_rect',
      'sz_svg_line',
      'sz_svg_polyline',
      'sz_svg_polygon',
      'sz_svg_path',
      'sz_svg_text',
      'sz_svg_symbol',
    ]) {
      expect(field(type, 'ID')?.type).toBe('field_input')
      expect(field(type, 'ID')?.text).toBe('')
    }
  })

  it('consumidores usam seletores visuais sem perder texto livre', () => {
    for (const type of [
      'sz_css_fill',
      'sz_css_stroke',
      'sz_css_stroke_width',
      'sz_css_stroke_dasharray',
      'sz_css_stroke_linecap',
      'sz_css_text_anchor',
    ]) {
      expect(field(type, 'SELECTOR')).toMatchObject({
        type: 'field_name_picker',
        kind: 'selector',
      })
    }
    expect(field('sz_svg_use', 'HREF')).toMatchObject({
      type: 'field_name_picker',
      kind: 'svg-reference',
    })
  })

  it('cores usam a paleta visual que também preserva none e texto CSS', () => {
    for (const [type, name] of [
      ['sz_svg_circle', 'FILL'],
      ['sz_svg_line', 'STROKE'],
      ['sz_css_fill', 'VALUE'],
      ['sz_css_stroke', 'VALUE'],
    ] as const) {
      expect(field(type, name)?.type).toBe('field_svg_paint')
    }
  })

  it('novos blocos entregam um resultado visível e compatível entre si', () => {
    expect(field('sz_html_svg', 'VIEWBOX')?.text).toBe('0 0 200 200')
    expect(field('sz_svg_circle', 'CX')?.text).toBe('100')
    expect(field('sz_svg_circle', 'CY')?.text).toBe('100')
    expect(field('sz_svg_circle', 'R')?.text).toBe('50')
    expect(field('sz_svg_circle', 'CLASS')?.text).toBe('forma')
    expect(field('sz_svg_text', 'TEXT')?.text).toBe('Olá!')
    expect(field('sz_svg_text', 'CLASS')?.text).toBe('texto')
    expect(field('sz_css_fill', 'SELECTOR')?.text).toBe('.forma')
    expect(field('sz_css_text_anchor', 'SELECTOR')?.text).toBe('.texto')
  })

  it('quebra os blocos largos em linhas curtas para telas pequenas', () => {
    for (const block of SVG_BLOCKS) {
      const lines = (block.message0 ?? '').split('\n')
      for (const line of lines)
        expect(line.replace(/%\d+/g, '').trim().length).toBeLessThanOrEqual(34)
    }
  })

  it('o catálogo central cobre todos os elementos SVG da paleta', () => {
    const catalogTypes = HTML_ELEMENT_CATALOG.filter((entry) =>
      entry.categories.includes('svg'),
    ).map((entry) => entry.blockType)
    const elementBlocks = SVG_BLOCKS.filter((block) => block.previousStatement === 'HTMLNode').map(
      (block) => block.type,
    )
    expect(new Set(catalogTypes)).toEqual(new Set(elementBlocks))
  })
})
