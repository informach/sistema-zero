import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { enforceUniqueProjectAreas } from '../projectAreaGuard'
import { ensureBlocklyInitialized } from '../setup'

describe('unicidade das Áreas do projeto', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('remove a segunda área e preserva seu conteúdo como rascunho', () => {
    const workspace = new Blockly.Workspace()
    const first = workspace.newBlock('sz_frame_start')
    const duplicate = workspace.newBlock('sz_frame_start')
    const draft = workspace.newBlock('sz_js_console_log_text')
    const parentConnection = duplicate.getInput('CHILDREN')?.connection
    const childConnection = draft.previousConnection
    if (!parentConnection || !childConnection) throw new Error('Conexões do fixture ausentes')
    parentConnection.connect(childConnection)

    const result = enforceUniqueProjectAreas(workspace)

    expect(result).toEqual({ removed: 1, focusedBlockId: first.id })
    expect(workspace.getBlockById(duplicate.id)).toBeNull()
    expect(workspace.getBlockById(draft.id)).toBe(draft)
    expect(draft.getParent()).toBeNull()
  })

  it('considera a área antiga e Ao iniciar como a mesma área semântica', () => {
    const workspace = new Blockly.Workspace()
    workspace.newBlock('sz_frame_behavior')
    workspace.newBlock('sz_frame_start')
    expect(enforceUniqueProjectAreas(workspace).removed).toBe(1)
  })
})
