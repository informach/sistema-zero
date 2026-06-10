import { describe, expect, it } from 'bun:test'
import { irBlockStructureEqual } from '../helpers'
import type { SZIR } from '../schema'

const base = (): SZIR => ({
  html: [{ type: 'element', tag: 'h1', text: 'Oi', __id: 'a' }],
  css: [],
  js: [{ type: 'rawJS', code: 'console.log(1);', advanced: true, __id: 'b' }],
  extensions: [],
})

describe('irBlockStructureEqual', () => {
  it('ignora __id e htmlShell (mudança cosmética → estruturalmente igual)', () => {
    const a: SZIR = { ...base(), htmlShell: { head: '<title>A</title>\n\n' } }
    const b: SZIR = {
      html: [{ type: 'element', tag: 'h1', text: 'Oi', __id: 'OUTRO_ID' }],
      css: [],
      js: [{ type: 'rawJS', code: 'console.log(1);', advanced: true, __id: 'X' }],
      extensions: [],
      htmlShell: { head: '<title>A</title>' }, // sem as linhas em branco
    }
    expect(irBlockStructureEqual(a, b)).toBe(true)
  })

  it('detecta mudança real na estrutura (texto do bloco)', () => {
    const a = base()
    const b: SZIR = { ...base(), html: [{ type: 'element', tag: 'h1', text: 'Mudou' }] }
    expect(irBlockStructureEqual(a, b)).toBe(false)
  })
})
