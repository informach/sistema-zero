import { describe, expect, it } from 'bun:test'
import { differsOnlyInStackPositions } from './transientExpansion'

/**
 * A comparação da gravação de saída e do Rodar com uma pilha afastada por "Mostrar o bloco"
 * (revisão do lote 2, 22/11/2026): só a posição das pilhas soltas pode ser ignorada.
 */
const state = (blocks: unknown[]) =>
  JSON.stringify({ blocks: { languageVersion: 0, blocks }, szBehaviorAreasVersion: 1 })

const area = {
  type: 'sz_frame_start',
  id: 'a',
  x: 10,
  y: 20,
  inputs: { CHILDREN: { block: { type: 'sz_js_let', id: 'b', fields: { NAME: 'pontos' } } } },
}
const solta = { type: 'sz_js_let', id: 'c', x: 32, y: 392, fields: { NAME: 'vidas' } }

describe('differsOnlyInStackPositions', () => {
  it('a pilha solta afastada não conta como mudança', () => {
    expect(
      differsOnlyInStackPositions(state([area, solta]), state([area, { ...solta, x: 60, y: 348 }])),
    ).toBe(true)
  })

  it('qualquer outra diferença conta: um campo, um bloco a mais, a função aberta', () => {
    const outroNome = { ...solta, fields: { NAME: 'tempo' } }
    expect(differsOnlyInStackPositions(state([area, solta]), state([area, outroNome]))).toBe(false)
    expect(differsOnlyInStackPositions(state([area]), state([area, solta]))).toBe(false)
    expect(
      differsOnlyInStackPositions(
        state([{ ...area, collapsed: true }, solta]),
        state([area, solta]),
      ),
    ).toBe(false)
  })

  it('a posição de um bloco DENTRO de uma pilha não é ignorada', () => {
    const dentro = (x: number) => ({
      ...area,
      inputs: { CHILDREN: { block: { type: 'sz_js_let', id: 'b', x, fields: { NAME: 'p' } } } },
    })
    expect(differsOnlyInStackPositions(state([dentro(1)]), state([dentro(2)]))).toBe(false)
  })

  it('texto que não é um estado salvo nunca passa por igual', () => {
    expect(differsOnlyInStackPositions('{', '{')).toBe(false)
    expect(differsOnlyInStackPositions('{}', '{}')).toBe(false)
  })
})
