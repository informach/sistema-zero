import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { parseProjectFiles } from '#parsers'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'
import { buildWorkspaceStateFromIR } from '../workspaceState'

/** Ciclo da Ponte: código → IR → blocos → Blockly → IR → código. */
function bridgeJs(js: string): string {
  const ir1 = parseProjectFiles({ 'index.html': '<h1>x</h1>', 'style.css': '', 'script.js': js })
  const state = buildWorkspaceStateFromIR(ir1)
  const ws = new Blockly.Workspace()
  Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
  const ir2 = buildIRFromWorkspace(ws)
  return generateProjectFiles({ ir: ir2, projectName: 'X' })['script.js']
}

describe('operador ternário no round-trip pelos blocos', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('preserva o ternário simples (não vira código avançado)', () => {
    const out = bridgeJs('const sinal = x > 0 ? "positivo" : "negativo";')
    expect(out).toContain('x > 0 ? "positivo" : "negativo"')
    // Não caiu em rawJS (sem comentário de bloco avançado).
    expect(out).not.toContain('código avançado')
  })

  it('parentesa o ternário quando aninhado numa conta', () => {
    const out = bridgeJs('const y = (a > b ? 1 : 2) + 10;')
    expect(out).toMatch(/\(a > b \? 1 : 2\) \+ 10/)
  })
})
