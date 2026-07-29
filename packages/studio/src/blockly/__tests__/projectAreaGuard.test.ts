import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { attachProjectAreaGuard, enforceUniqueProjectAreas } from '../projectAreaGuard'
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

  it('espera a desserialização da duplicata terminar antes de removê-la', async () => {
    const workspace = new Blockly.Workspace()
    const first = workspace.newBlock('sz_frame_start')
    const child = workspace.newBlock('sz_js_console_log_text')
    first.getInput('CHILDREN')?.connection?.connect(child.previousConnection as Blockly.Connection)
    const detach = attachProjectAreaGuard(workspace)

    Blockly.serialization.blocks.append({ type: 'sz_frame_start' }, workspace)
    workspace.fireChangeListener({ type: Blockly.Events.BLOCK_CREATE } as Blockly.Events.Abstract)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(workspace.getBlocksByType('sz_frame_start', false)).toHaveLength(1)
    expect(workspace.getBlocksByType('sz_js_console_log_text', false)).toEqual([child])
    expect(child.getParent()).toBe(first)
    detach()
    workspace.dispose()
  })

  it('excluir uma área solta seu conteúdo como rascunho e desfazer reconecta tudo', async () => {
    const workspace = new Blockly.Workspace()
    const frame = workspace.newBlock('sz_frame_start')
    const child = workspace.newBlock('sz_js_console_log_text')
    const parentConnection = frame.getInput('CHILDREN')?.connection
    if (!parentConnection || !child.previousConnection) {
      throw new Error('Conexões do fixture ausentes')
    }
    parentConnection.connect(child.previousConnection)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    workspace.clearUndo()

    Blockly.Events.setGroup(true)
    frame.dispose(false)
    Blockly.Events.setGroup(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    expect(workspace.getBlockById(frame.id)).toBeNull()
    expect(workspace.getBlockById(child.id)).toBe(child)
    expect(child.getParent()).toBeNull()

    workspace.undo(false)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const restoredFrame = workspace.getBlockById(frame.id)
    expect(restoredFrame?.type).toBe('sz_frame_start')
    expect(workspace.getBlockById(child.id)?.getParent()?.id).toBe(frame.id)
    workspace.dispose()
  })
})
