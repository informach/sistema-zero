import { describe, expect, it } from 'bun:test'
import type { SZIR } from '#ir'
import { markLifecycleBlocksState, normalizeBlocksStateToFrames } from '../normalizeFrames'
import { buildWorkspaceStateFromIR, type SerializedBlocklyBlock } from '../workspaceState'

function countBlocks(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  let count = 0
  const rec = node as {
    type?: string
    inputs?: Record<string, { block?: unknown; shadow?: unknown }>
    next?: { block?: unknown }
  }
  if (typeof rec.type === 'string') count += 1
  for (const input of Object.values(rec.inputs ?? {})) {
    count += countBlocks(input.block)
  }
  count += countBlocks(rec.next?.block)
  return count
}

function totalBlocks(state: unknown): number {
  const tops = (state as { blocks?: { blocks?: unknown[] } }).blocks?.blocks ?? []
  return tops.reduce<number>((sum, top) => sum + countBlocks(top), 0)
}

/**
 * Regressão do bug 24/07: "Dar um nome ao desenho" (filho-de-svg) recusado pelo
 * encaixe semântico vira RASCUNHO solto — num projeto ATUAL, a normalização do
 * load NÃO pode reescrevê-lo (a reescrita embrulhava o rascunho num svg novo, o
 * restore do BlocklyPanel recarregava o canvas no meio da edição e a criança via
 * "o bloco se auto-encaixar e duplicar o resto"). Estado LEGADO (sem marcador)
 * segue migrando o topo — lá o bloco solto ERA o programa.
 */
describe('normalização × rascunho de filho-de-svg solto', () => {
  const ir: SZIR = {
    html: [
      {
        type: 'element',
        tag: 'svg',
        attrs: { width: '200', height: '200', viewBox: '0 0 200 200' },
        children: [
          {
            type: 'element',
            tag: 'circle',
            attrs: { cx: '100', cy: '100', r: '50', fill: 'red' },
            children: [],
          },
        ],
      },
      { type: 'element', tag: 'p', attrs: {}, children: [{ type: 'text', text: 'Olá!' }] },
    ],
    css: [],
    js: [
      { type: 'consoleLog', value: { type: 'str', value: 'oi' } },
      { type: 'var', name: 'placar', value: { type: 'num', value: 0 } },
    ],
    extensions: [],
  }

  function stateWithLooseTitle(marked: boolean): unknown {
    // Normaliza + MARCA antes de soltar o rascunho (espelha a vida real: o estado
    // salvo passa pelo `markLifecycleBlocksState` do save do BlocklyPanel; o
    // rascunho é adicionado pelo editor depois).
    const normalized = normalizeBlocksStateToFrames(buildWorkspaceStateFromIR(ir))
    const state = (marked ? markLifecycleBlocksState(normalized) : normalized) as {
      blocks: { blocks: SerializedBlocklyBlock[] }
      szBehaviorAreasVersion?: number
    }
    state.blocks.blocks.push({
      type: 'sz_svg_title',
      fields: { TEXT: 'Meu desenho', CLASS: '' },
      x: 40,
      y: 700,
    } as unknown as SerializedBlocklyBlock)
    return state
  }

  it('estado ATUAL: o rascunho fica INTOCADO (mesma referência — sem reload do canvas)', () => {
    const state = stateWithLooseTitle(true)
    const before = totalBlocks(state)
    const normalized = normalizeBlocksStateToFrames(state)
    // Mesma referência = o restore do BlocklyPanel dá early-return e o canvas
    // vivo não é recarregado por causa de um rascunho.
    expect(normalized).toBe(state)
    expect(totalBlocks(normalized)).toBe(before)
  })

  it('estado LEGADO (sem marcador): o topo ainda migra (título absorvido num svg)', () => {
    const state = stateWithLooseTitle(false)
    const before = totalBlocks(state)
    const normalized = normalizeBlocksStateToFrames(state)
    const tops = (normalized as { blocks: { blocks: Array<{ type: string }> } }).blocks.blocks
    // O título solto foi recolhido para dentro da Estrutura (embrulhado num svg
    // novo → +1 bloco) — comportamento de MIGRAÇÃO, correto p/ estados legados.
    expect(tops.map((t) => t.type)).toEqual(['sz_frame_structure', 'sz_frame_start'])
    expect(totalBlocks(normalized)).toBe(before + 1)
  })
})
