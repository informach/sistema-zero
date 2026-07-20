import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { JSStatementSchema } from '#ir'
import { isGuidedDomAttributeName, isGuidedDomElementTag, isGuidedDomProperty } from '../domSafety'
import { ensureBlocklyInitialized } from '../setup'

describe('segurança do DOM guiado', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it.each(['fill', 'stroke-width', 'data-card', 'aria-label'])('aceita o atributo %s', (name) => {
    expect(isGuidedDomAttributeName(name)).toBe(true)
  })

  it.each([
    'onclick',
    'onLoad',
    'srcdoc',
    'href',
    'src',
    'xlink:href',
    'formaction',
  ])('reserva o atributo %s para o modo avançado', (name) => {
    expect(isGuidedDomAttributeName(name)).toBe(false)
  })

  it('oferece somente texto e valor como propriedades guiadas', () => {
    expect(isGuidedDomProperty('textContent')).toBe(true)
    expect(isGuidedDomProperty('value')).toBe(true)
    expect(isGuidedDomProperty('innerHTML')).toBe(false)
  })

  it('rejeita um atributo perigoso digitado no bloco', () => {
    const block = new Blockly.Workspace().newBlock('sz_js_set_attribute')
    block.setFieldValue('fill', 'NAME')
    block.setFieldValue('onclick', 'NAME')
    expect(block.getFieldValue('NAME')).toBe('fill')
  })

  it.each(['div', 'button', 'canvas', 'meu-componente'])('aceita a tag HTML passiva %s', (tag) => {
    expect(isGuidedDomElementTag(tag, 'html')).toBe(true)
  })

  it.each([
    'script',
    'iframe',
    'object',
    'embed',
    'base',
    'meta',
    'link',
  ])('reserva a tag HTML executável ou navegável %s para o modo avançado', (tag) => {
    expect(isGuidedDomElementTag(tag, 'html')).toBe(false)
  })

  it('aceita formas SVG conhecidas e rejeita script/foreignObject', () => {
    expect(isGuidedDomElementTag('circle', 'svg')).toBe(true)
    expect(isGuidedDomElementTag('linearGradient', 'svg')).toBe(true)
    expect(isGuidedDomElementTag('script', 'svg')).toBe(false)
    expect(isGuidedDomElementTag('foreignObject', 'svg')).toBe(false)
  })

  it('rejeita uma tag executável digitada nos blocos de criação', () => {
    const html = new Blockly.Workspace().newBlock('sz_js_create_element')
    html.setFieldValue('section', 'TAG')
    html.setFieldValue('script', 'TAG')
    expect(html.getFieldValue('TAG')).toBe('section')

    const svg = new Blockly.Workspace().newBlock('sz_js_create_element_ns')
    svg.setFieldValue('rect', 'TAG')
    svg.setFieldValue('script', 'TAG')
    expect(svg.getFieldValue('TAG')).toBe('rect')
  })

  it('rejeita tags executáveis também na fronteira persistida da IR', () => {
    expect(
      JSStatementSchema.safeParse({ type: 'createElement', tag: 'script', varName: 'codigo' })
        .success,
    ).toBe(false)
    expect(
      JSStatementSchema.safeParse({ type: 'createElementNS', tag: 'script', varName: 'codigo' })
        .success,
    ).toBe(false)
    expect(
      JSStatementSchema.safeParse({ type: 'createElement', tag: 'section', varName: 'secao' })
        .success,
    ).toBe(true)
  })
})
