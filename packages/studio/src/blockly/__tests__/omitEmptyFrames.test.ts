import { describe, expect, it } from 'bun:test'
import type { SZIR, SZIRV2 } from '../../ir/schema'
import { FRAME_EVENTS, FRAME_LOOPS, FRAME_START, FRAME_STRUCTURE } from '../buildIR'
import { buildWorkspaceStateFromIR, emptyFramesBlocksState } from '../workspaceState'

/**
 * `omitEmptyAuxFrames` (Bug: num projeto só-JS — ex.: Canvas 3D — os frames
 * 🧱 Estrutura / 🎨 Aparência VAZIOS "ressuscitavam" a cada ida-e-volta pela
 * Ponte). Com a opção, HTML/CSS vazios são omitidos; ⚙️ Comportamento fica sempre.
 * O seed de projeto novo NÃO passa a opção → segue com os 3 frames.
 */
function frameTypes(state: ReturnType<typeof buildWorkspaceStateFromIR>): string[] {
  return state.blocks.blocks.map((b) => b.type)
}

const jsOnly: SZIR = {
  html: [],
  css: [],
  js: [{ type: 'consoleLog', value: { type: 'str', value: 'oi' } }],
  extensions: [],
}

describe('buildWorkspaceStateFromIR — áreas opcionais', () => {
  it('projeto só-JS legado cria somente Ao iniciar', () => {
    const types = frameTypes(buildWorkspaceStateFromIR(jsOnly))
    expect(types).toEqual([FRAME_START])
  })

  it('a opção legada não ressuscita áreas vazias', () => {
    const types = frameTypes(buildWorkspaceStateFromIR(jsOnly, { omitEmptyAuxFrames: true }))
    expect(types).toEqual([FRAME_START])
  })

  it('com HTML sem comportamento cria somente Estrutura', () => {
    const withHtml: SZIR = {
      html: [{ type: 'element', tag: 'p', attrs: {}, children: [{ type: 'text', text: 'oi' }] }],
      css: [],
      js: [],
      extensions: [],
    }
    const types = frameTypes(buildWorkspaceStateFromIR(withHtml, { omitEmptyAuxFrames: true }))
    expect(types).toEqual([FRAME_STRUCTURE])
  })

  it('preserva as seções explícitas da IR v2', () => {
    const v2: SZIRV2 = {
      version: 2,
      html: [],
      css: [],
      behavior: {
        start: [],
        events: [{ type: 'event', target: 'botao', event: 'click', body: [] }],
        loops: [{ type: 'animationLoop', body: [] }],
      },
      extensions: [],
    }
    expect(frameTypes(buildWorkspaceStateFromIR(v2))).toEqual([FRAME_EVENTS, FRAME_LOOPS])
  })

  it('workspace inicial permanece completamente vazio', () => {
    expect(frameTypes(emptyFramesBlocksState())).toEqual([])
  })
})
