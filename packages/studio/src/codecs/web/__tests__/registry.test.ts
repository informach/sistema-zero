import { describe, expect, it } from 'bun:test'
import { CANVAS_BLOCKS } from '../../../blockly/blocks/canvas'
import { CSS_BLOCKS } from '../../../blockly/blocks/css'
import { HTML_BLOCKS } from '../../../blockly/blocks/html'
import { SVG_BLOCKS } from '../../../blockly/blocks/svg'
import {
  createWebBlockRegistry,
  FORWARD_ONLY_WEB_BLOCK_TYPES,
  WEB_BLOCK_CODECS,
  WEB_BLOCK_TYPES_BY_CATEGORY,
  webCodecForBlockType,
  webCodecSupports,
} from '../registry'

describe('registry dos codecs web', () => {
  it('registra exatamente os 153 blocos aprovados, por categoria', () => {
    expect(WEB_BLOCK_TYPES_BY_CATEGORY.html).toHaveLength(24)
    expect(WEB_BLOCK_TYPES_BY_CATEGORY.css).toHaveLength(53)
    expect(WEB_BLOCK_TYPES_BY_CATEGORY.svg).toHaveLength(21)
    expect(WEB_BLOCK_TYPES_BY_CATEGORY.canvas).toHaveLength(55)
    expect(WEB_BLOCK_CODECS).toHaveLength(153)

    const definitions = {
      html: HTML_BLOCKS,
      css: CSS_BLOCKS,
      svg: SVG_BLOCKS,
      canvas: CANVAS_BLOCKS,
    } as const

    for (const [category, blocks] of Object.entries(definitions)) {
      expect(WEB_BLOCK_TYPES_BY_CATEGORY[category as keyof typeof definitions]).toEqual(
        blocks.map((block) => block.type),
      )
    }
  })

  it('mantém cada tipo único, pesquisável e com capacidades declaradas', () => {
    const types = WEB_BLOCK_CODECS.map((codec) => codec.blockType)
    expect(new Set(types).size).toBe(types.length)

    for (const codec of WEB_BLOCK_CODECS) {
      expect(webCodecForBlockType(codec.blockType)).toBe(codec)
      expect(codec.directions.length).toBeGreaterThan(0)
      expect(Object.isFrozen(codec)).toBe(true)
    }
    expect(Object.isFrozen(WEB_BLOCK_CODECS)).toBe(true)
  })

  it('preserva o bloco Canvas legado oculto no contrato', () => {
    const codec = webCodecForBlockType('sz_canvas_keyboard')
    expect(codec?.category).toBe('canvas')
    expect(codec?.compatibility).toBe('legacy-hidden')
  })

  it('declara como forward-only somente os nove atalhos CSS que convergem para IR genérico', () => {
    const forwardOnly = WEB_BLOCK_CODECS.filter((codec) => codec.compatibility === 'forward-only')
    expect(forwardOnly.map((codec) => codec.blockType)).toEqual([...FORWARD_ONLY_WEB_BLOCK_TYPES])
    expect(forwardOnly).toHaveLength(9)
    for (const codec of forwardOnly) {
      expect(webCodecSupports(codec, 'block-to-ir')).toBe(true)
      expect(webCodecSupports(codec, 'ir-to-code')).toBe(true)
      expect(webCodecSupports(codec, 'ir-to-block')).toBe(false)
      expect(webCodecSupports(codec, 'code-to-ir')).toBe(false)
    }
  })

  it('rejeita tipos duplicados em vez de escolher um silenciosamente', () => {
    const duplicate = {
      blockType: 'sz_html_p',
      category: 'html' as const,
      irKind: 'html' as const,
      directions: ['block-to-ir'] as const,
      compatibility: 'bidirectional' as const,
    }
    expect(() => createWebBlockRegistry([duplicate, duplicate])).toThrow('sz_html_p')
  })

  it('rejeita capacidades incompatíveis em vez de criar um registro enganoso', () => {
    const incomplete = {
      blockType: 'sz_html_p',
      category: 'html' as const,
      irKind: 'html' as const,
      directions: ['block-to-ir'] as const,
      compatibility: 'bidirectional' as const,
    }
    expect(() => createWebBlockRegistry([incomplete])).toThrow('incompleto')
  })
})
