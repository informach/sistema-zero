import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
import {
  buildWorkspaceStateFromIR,
  isBlocksStateEmpty,
  layoutFromBlocksState,
  type SerializedBlocklyBlock,
  type StacksLayout,
} from '../workspaceState'

const raw = (code: string): SZIR['js'][number] => ({ type: 'rawJS', code, advanced: true })

function irWithJs(...codes: string[]): SZIR {
  return { html: [], css: [], extensions: [], js: codes.map(raw) }
}

function chainLen(block: SerializedBlocklyBlock | undefined): number {
  let n = 0
  let cur = block
  while (cur) {
    n += 1
    cur = cur.next?.block
  }
  return n
}

const SPLIT_LAYOUT: StacksLayout = {
  html: [],
  css: [],
  js: [
    { startIndex: 0, x: 872, y: 32 },
    { startIndex: 3, x: 1300, y: 200 },
  ],
}

describe('layout de pilhas (várias colunas do mesmo tipo)', () => {
  it('sem layout: uma pilha por categoria (comportamento padrão)', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();'))
    const tops = state.blocks.blocks
    expect(tops.length).toBe(1)
    expect(chainLen(tops[0])).toBe(4)
  })

  it('com layout: divide nas pilhas certas e posiciona cada uma', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();'), {
      layout: SPLIT_LAYOUT,
    })
    const tops = state.blocks.blocks
    expect(tops.length).toBe(2)
    expect([tops[0]?.x, tops[0]?.y]).toEqual([872, 32])
    expect(chainLen(tops[0])).toBe(3)
    expect([tops[1]?.x, tops[1]?.y]).toEqual([1300, 200])
    expect(chainLen(tops[1])).toBe(1)
  })

  it('layoutFromBlocksState recupera o layout (round-trip)', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();'), {
      layout: SPLIT_LAYOUT,
    })
    expect(layoutFromBlocksState(state)).toEqual(SPLIT_LAYOUT)
  })

  it('editar um valor (mesma contagem) preserva a separação em 2 colunas', () => {
    const layout = layoutFromBlocksState(
      buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();'), { layout: SPLIT_LAYOUT }),
    )
    // Simula edição de código: 'c()' virou 'c(1)', mesma quantidade de statements.
    const edited = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c(1);', 'd();'), { layout })
    const tops = edited.blocks.blocks
    expect(tops.length).toBe(2)
    expect(chainLen(tops[0])).toBe(3)
    expect(chainLen(tops[1])).toBe(1)
  })

  it('statement adicionado entra na última pilha (degradação graciosa, sem perder blocos)', () => {
    const five = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();', 'e();'), {
      layout: SPLIT_LAYOUT,
    })
    const tops = five.blocks.blocks
    expect(tops.length).toBe(2)
    expect(chainLen(tops[0])).toBe(3)
    expect(chainLen(tops[1])).toBe(2) // d() + e()
  })

  it('preserva posição custom de pilha única (não volta às colunas padrão)', () => {
    // O aluno tem só uma pilha de JS, mas a moveu para x=300 (encostada na CSS).
    // Antes, layoutFromBlocksState descartava esse caso como "trivial" e o rebuild
    // aplicava o default x=872 — apagando o arranjo do aluno num refresh.
    const original = buildWorkspaceStateFromIR(irWithJs('a();', 'b();'))
    const top = original.blocks.blocks[0]
    if (!top) throw new Error('esperava pilha')
    top.x = 300
    top.y = 120

    const layout = layoutFromBlocksState(original)
    expect(layout?.js).toEqual([{ startIndex: 0, x: 300, y: 120 }])

    const rebuilt = buildWorkspaceStateFromIR(irWithJs('a();', 'b();'), { layout })
    expect([rebuilt.blocks.blocks[0]?.x, rebuilt.blocks.blocks[0]?.y]).toEqual([300, 120])
  })

  it('workspace vazio → null (não tem o que preservar)', () => {
    expect(layoutFromBlocksState({ blocks: { languageVersion: 0, blocks: [] } })).toBeNull()
    expect(layoutFromBlocksState(null)).toBeNull()
  })
})

describe('isBlocksStateEmpty', () => {
  it('null/undefined/forma inválida → empty', () => {
    expect(isBlocksStateEmpty(null)).toBe(true)
    expect(isBlocksStateEmpty(undefined)).toBe(true)
    expect(isBlocksStateEmpty({})).toBe(true)
    expect(isBlocksStateEmpty({ blocks: null })).toBe(true)
  })

  it('lista de blocos vazia → empty (caso do sintoma "canvas em branco depois do refresh")', () => {
    expect(isBlocksStateEmpty({ blocks: { languageVersion: 0, blocks: [] } })).toBe(true)
  })

  it('pelo menos uma pilha → não-vazio', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();'))
    expect(isBlocksStateEmpty(state)).toBe(false)
  })
})
