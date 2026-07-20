import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { isGuidedDomAttributeName, isGuidedDomProperty } from '../domSafety'
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
})
