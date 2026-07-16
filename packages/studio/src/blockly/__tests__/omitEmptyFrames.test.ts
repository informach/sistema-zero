import { describe, expect, it } from 'bun:test'
import type { SZIR } from '../../ir/schema'
import { FRAME_APPEARANCE, FRAME_BEHAVIOR, FRAME_STRUCTURE } from '../buildIR'
import { buildWorkspaceStateFromIR } from '../workspaceState'

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

describe('buildWorkspaceStateFromIR — omitEmptyAuxFrames', () => {
  it('SEM a opção: sempre os 3 frames (compat do seed de projeto novo)', () => {
    const types = frameTypes(buildWorkspaceStateFromIR(jsOnly))
    expect(types).toEqual([FRAME_STRUCTURE, FRAME_APPEARANCE, FRAME_BEHAVIOR])
  })

  it('projeto só-JS: omite Estrutura e Aparência vazias, mantém Comportamento', () => {
    const types = frameTypes(buildWorkspaceStateFromIR(jsOnly, { omitEmptyAuxFrames: true }))
    expect(types).toEqual([FRAME_BEHAVIOR])
  })

  it('com HTML mas sem CSS: mantém Estrutura + Comportamento, omite Aparência', () => {
    const withHtml: SZIR = {
      html: [{ type: 'element', tag: 'p', attrs: {}, children: [{ type: 'text', text: 'oi' }] }],
      css: [],
      js: [],
      extensions: [],
    }
    const types = frameTypes(buildWorkspaceStateFromIR(withHtml, { omitEmptyAuxFrames: true }))
    expect(types).toEqual([FRAME_STRUCTURE, FRAME_BEHAVIOR])
  })
})
