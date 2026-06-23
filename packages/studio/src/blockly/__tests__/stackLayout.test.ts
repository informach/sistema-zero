import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
import {
  buildWorkspaceStateFromIR,
  isBlocksStateEmpty,
  type SerializedBlocklyBlock,
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

// Modelo CONTAINER (estilo MakeCode): buildWorkspaceStateFromIR sempre emite os 3
// frames (🧱 Estrutura / 🎨 Aparência / ⚙️ Comportamento), com os blocos da categoria
// DENTRO de cada um. (A antiga preservação de layout multi-pilha foi removida — com
// um frame por categoria não há várias pilhas do mesmo tipo para reposicionar.)
describe('buildWorkspaceStateFromIR — modelo CONTAINER (3 frames)', () => {
  it('emite SEMPRE os 3 frames, na ordem Estrutura → Aparência → Comportamento', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();'))
    expect(state.blocks.blocks.map((t) => t.type)).toEqual([
      'sz_frame_structure',
      'sz_frame_appearance',
      'sz_frame_behavior',
    ])
  })

  it('os statements JS entram DENTRO do Comportamento, encadeados na ordem', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();'))
    const behavior = state.blocks.blocks.find((t) => t.type === 'sz_frame_behavior')
    expect(chainLen(behavior?.inputs?.CHILDREN?.block)).toBe(4)
  })

  it('IR vazio → 3 frames VAZIOS (semente do projeto novo, sem CHILDREN)', () => {
    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: [], extensions: [] })
    expect(state.blocks.blocks).toHaveLength(3)
    for (const frame of state.blocks.blocks) expect(frame.inputs?.CHILDREN).toBeUndefined()
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

  it('os 3 frames → não-vazio', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();'))
    expect(isBlocksStateEmpty(state)).toBe(false)
  })
})
