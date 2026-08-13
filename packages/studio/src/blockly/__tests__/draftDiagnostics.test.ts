import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { applyDraftDiagnostics, findDraftStacks } from '../draftDiagnostics'
import { ensureBlocklyInitialized } from '../setup'

describe('diagnósticos de rascunho', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('identifica pilhas executáveis fora das Áreas do projeto', () => {
    const workspace = new Blockly.Workspace()
    const area = workspace.newBlock('sz_frame_start')
    const inside = workspace.newBlock('sz_js_console_log_text')
    const draft = workspace.newBlock('sz_js_console_log_text')
    const areaConnection = area.getInput('CHILDREN')?.connection
    if (!areaConnection || !inside.previousConnection) throw new Error('Conexões ausentes')
    areaConnection.connect(inside.previousConnection)

    expect(findDraftStacks(workspace).map((block) => block.id)).toEqual([draft.id])
    expect(applyDraftDiagnostics(workspace)).toEqual([draft.id])
  })

  it('não acusa blocos de valor soltos e remove o rascunho ao encaixar a pilha', () => {
    const workspace = new Blockly.Workspace()
    const area = workspace.newBlock('sz_frame_start')
    const draft = workspace.newBlock('sz_js_console_log_text')
    workspace.newBlock('sz_val_number')

    expect(applyDraftDiagnostics(workspace)).toEqual([draft.id])

    const areaConnection = area.getInput('CHILDREN')?.connection
    if (!areaConnection || !draft.previousConnection) throw new Error('Conexões ausentes')
    areaConnection.connect(draft.previousConnection)
    expect(applyDraftDiagnostics(workspace)).toEqual([])
  })

  it('não percorre todos os blocos para atualizar duas raízes de rascunho', () => {
    const workspace = new Blockly.Workspace()
    workspace.newBlock('sz_js_console_log_text')
    for (let index = 0; index < 200; index += 1) workspace.newBlock('sz_val_number')
    const allBlocks = spyOn(workspace, 'getAllBlocks')

    expect(applyDraftDiagnostics(workspace)).toHaveLength(1)
    expect(allBlocks).not.toHaveBeenCalled()
  })
})
