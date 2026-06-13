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

  it('ignora ctorId do classDecl (campo só-de-source-map)', () => {
    const classIr = (ctorId?: string): SZIR => ({
      html: [],
      css: [],
      js: [
        {
          type: 'classDecl',
          name: 'Player',
          ...(ctorId ? { ctorId } : {}),
          ctorBody: [{ type: 'setThisProp', name: 'x', value: { type: 'num', value: 0 } }],
          methods: [],
        },
      ],
      extensions: [],
    })
    // Mesma estrutura; só o ctorId difere (canvas tem, reverse-parse não).
    expect(irBlockStructureEqual(classIr('ctor_block_1'), classIr())).toBe(true)
  })

  it('ignora __declIds da CSSRule (campo só-de-source-map)', () => {
    const cssIr = (declIds?: Record<string, string>): SZIR => ({
      html: [],
      css: [
        {
          selector: 'body',
          declarations: { color: '#fff' },
          ...(declIds ? { __declIds: declIds } : {}),
        },
      ],
      js: [],
      extensions: [],
    })
    // Mesma regra; só o __declIds difere (canvas tem, reverse-parse não).
    expect(irBlockStructureEqual(cssIr({ color: 'decl_block_1' }), cssIr())).toBe(true)
  })
})
