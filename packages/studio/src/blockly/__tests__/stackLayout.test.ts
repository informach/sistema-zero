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

// Cada área é opcional: a Ponte só materializa os frames que realmente possuem
// conteúdo. Projetos novos, portanto, começam vazios e a criança escolhe as áreas.
describe('buildWorkspaceStateFromIR — áreas opcionais do projeto', () => {
  it('migra statements JS legados para a área Ao iniciar', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();'))
    expect(state.blocks.blocks.map((t) => t.type)).toEqual(['sz_frame_start'])
  })

  it('os statements JS entram DENTRO de Ao iniciar, encadeados na ordem', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();', 'b();', 'c();', 'd();'))
    const start = state.blocks.blocks.find((t) => t.type === 'sz_frame_start')
    expect(chainLen(start?.inputs?.CHILDREN?.block)).toBe(4)
  })

  it('IR vazio → nenhum frame (a criança escolhe quais áreas usar)', () => {
    const state = buildWorkspaceStateFromIR({ html: [], css: [], js: [], extensions: [] })
    expect(state.blocks.blocks).toEqual([])
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

  it('um frame com conteúdo → não-vazio', () => {
    const state = buildWorkspaceStateFromIR(irWithJs('a();'))
    expect(isBlocksStateEmpty(state)).toBe(false)
  })
})
