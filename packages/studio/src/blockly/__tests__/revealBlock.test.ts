import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { expandAroundBlock } from '../runtimeMark'
import { ensureBlocklyInitialized } from '../setup'

beforeAll(() => {
  ensureBlocklyInitialized()
})

const raw = (id: string, code: string) => ({ type: 'sz_adv_raw_js', id, fields: { CODE: code } })
const collapsedIf = (id: string, then: Record<string, unknown>) => ({
  type: 'sz_js_if_else',
  id,
  collapsed: true,
  extraState: { elseIf: 0, hasElse: false },
  inputs: {
    COND: { block: { type: 'sz_val_variable', id: `${id}-cond`, fields: { NAME: 'ok' } } },
    THEN: { block: then },
  },
})

function workspaceWith(blocks: Record<string, unknown>[]) {
  const workspace = new Blockly.Workspace()
  Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks } }, workspace)
  return workspace
}

// Achado na conferência do staging (21/11/2026): "Mostrar o bloco" abria toda função recolhida
// ACIMA do alvo na mesma pilha, porque subia pelo `getParent` (numa pilha, o bloco de cima).
describe('Mostrar o bloco abre só o que envolve o alvo', () => {
  it('um bloco recolhido acima, na mesma pilha, continua recolhido', () => {
    const workspace = workspaceWith([
      { ...collapsedIf('acima', raw('dentro-acima', 'a()')), next: { block: raw('alvo', 'b()') } },
    ])
    try {
      expandAroundBlock(workspace.getBlockById('alvo') as Blockly.Block)
      expect(workspace.getBlockById('acima')?.isCollapsed()).toBe(true)
    } finally {
      workspace.dispose()
    }
  })

  it('o bloco recolhido que contém o alvo abre, e também o de fora dele', () => {
    const workspace = workspaceWith([collapsedIf('fora', collapsedIf('meio', raw('alvo', 'c()')))])
    try {
      expandAroundBlock(workspace.getBlockById('alvo') as Blockly.Block)
      expect(workspace.getBlockById('meio')?.isCollapsed()).toBe(false)
      expect(workspace.getBlockById('fora')?.isCollapsed()).toBe(false)
    } finally {
      workspace.dispose()
    }
  })
})
