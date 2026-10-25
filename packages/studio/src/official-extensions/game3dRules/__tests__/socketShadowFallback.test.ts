import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { behaviorStatements } from '#ir'
import 'blockly/blocks'
import { attachBlockInContractContext } from '../../../blockly/__tests__/blockContractTestUtils'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import type { BlockDefinition } from '../../../blockly/blocks/types'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import type { ExtensionToolboxCategory } from '../../../extensions/toolboxTypes'
import { gameThreeDBlocks, gameThreeDToolboxCategory } from '../../game-3d/blocks'
import { gameKit3DBlocks, gameKit3DToolboxCategory } from '../../game-3d-advanced/blocks'
import { world3DBlocks, world3DToolboxCategory } from '../../world-3d/blocks'

/**
 * Soquete VAZIO = a SOMBRA. O soquete só fica vazio quando a sombra se perdeu (estado salvo
 * antigo, colar sem sombra), e aí o bloco tem de fazer o que a paleta mostra: a câmera em
 * (4, 3, 6), girar 90°, andar 1, o texto do canto e o mapa padrão. Antes o buildIR caía em
 * números próprios (0, 0, 5 e 0°), e o mesmo bloco fazia outra coisa.
 */
ensureBlocklyInitialized()

const EXTENSIONS: [string, readonly BlockDefinition[], ExtensionToolboxCategory, string, string][] =
  [
    ['game-3d', gameThreeDBlocks, gameThreeDToolboxCategory, 'sz_g3d_set_scale', 'sz_g3d_animate'],
    ['world-3d', world3DBlocks, world3DToolboxCategory, 'sz_w3d_hud_text', 'sz_w3d_on_update'],
    [
      'game-3d-advanced',
      gameKit3DBlocks,
      gameKit3DToolboxCategory,
      'sz_g3k_hud_text',
      'sz_g3k_on_update',
    ],
  ]
for (const [, blocks] of EXTENSIONS) registerExtensionBlocks(blocks as BlockDefinition[])

interface Entry {
  kind?: string
  type?: string
  inputs?: Record<string, { shadow?: { fields?: Record<string, unknown> } }>
}
function walk(node: unknown, out: Entry[]) {
  if (Array.isArray(node)) for (const item of node) walk(item, out)
  else if (node && typeof node === 'object') {
    const entry = node as Entry
    if (entry.kind === 'block' && entry.type) out.push(entry)
    for (const value of Object.values(node)) walk(value, out)
  }
}
function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => k !== '__id')
        .map(([k, v]) => [k, stripIds(v)]),
    )
  }
  return value
}

describe('soquete vazio dá o mesmo resultado que a sombra da paleta', () => {
  for (const [id, , toolbox, exprHost, loopHost] of EXTENSIONS) {
    it(id, () => {
      const entries: Entry[] = []
      walk(toolbox, entries)
      const seen = new Set<string>()
      const wrong: string[] = []
      let checked = 0
      for (const entry of entries) {
        if (!entry.inputs || !entry.type || seen.has(entry.type)) continue
        seen.add(entry.type)
        const workspace = new Blockly.Workspace()
        try {
          const probe = workspace.newBlock(entry.type)
          const isExpr = Boolean(probe.outputConnection)
          probe.dispose()
          const exprInput = exprHost.endsWith('hud_text') ? 'TEXT' : 'FACTOR'
          const target = attachBlockInContractContext({
            workspace,
            type: entry.type,
            kind: isExpr ? 'expr' : 'statement',
            expressionHost: exprHost,
            expressionInput: exprInput,
            loopHost,
          })
          for (const input of target.inputList) {
            const child = input.connection?.targetBlock()
            if (!child) continue
            input.connection?.setShadowState(null)
            child.dispose(false)
          }
          const ir = JSON.stringify(stripIds(behaviorStatements(buildIRFromWorkspace(workspace))))
          for (const [name, socket] of Object.entries(entry.inputs)) {
            const value = socket.shadow?.fields?.NUM ?? socket.shadow?.fields?.TEXT
            if (value === undefined) continue
            checked++
            const needle = `"value":${JSON.stringify(value)}`
            // Soquete opcional que some do nó (o runtime usa o mesmo padrão) também vale.
            const omitted = !ir.includes(`"${name.toLowerCase()}"`) && !ir.includes('"value":')
            if (!ir.includes(needle) && !omitted) wrong.push(`${entry.type}.${name}: ${ir}`)
          }
        } finally {
          workspace.dispose()
        }
      }
      expect(checked).toBeGreaterThan(10)
      expect(wrong).toEqual([])
    })
  }
})
