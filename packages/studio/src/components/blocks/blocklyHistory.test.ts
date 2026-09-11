import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import * as Blockly from 'blockly/core'
import { withWorkspaceLoad } from '../../blockly/loadFence'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { createBlocklyHistory, forgetBlocklyHistory } from './blocklyHistory'

/**
 * A pilha dos BLOCOS na barra do editor, sobre um workspace headless DE VERDADE (a pilha é a do
 * próprio Blockly). O Blockly dispara os eventos numa tarefa depois da edição, e é nesse disparo
 * que ele empilha: por isso os testes esperam uma volta do relógio (`tick`).
 */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

const areaState = (name: string) => ({
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'sz_frame_start',
        x: 10,
        y: 10,
        inputs: {
          CHILDREN: { block: { type: 'sz_js_var_create', fields: { NAME: name } } },
        },
      },
    ],
  },
})

describe('blocklyHistory: desfazer e refazer dos blocos', () => {
  let workspace: Blockly.WorkspaceSvg

  beforeAll(() => {
    ensureBlocklyInitialized()
  })
  beforeEach(() => {
    // Headless: o que a barra usa existe no Workspace comum, menos o `hideChaff` do SVG.
    workspace = new Blockly.Workspace() as unknown as Blockly.WorkspaceSvg
    ;(workspace as unknown as { hideChaff: () => void }).hideChaff = () => {}
  })
  afterEach(() => {
    workspace.dispose()
  })

  it('segue a pilha do Blockly: criar um bloco liga o desfazer, desfazer liga o refazer', async () => {
    const history = createBlocklyHistory(workspace)
    const heard = mock(() => {})
    history.subscribe(heard)
    expect(history.canUndo()).toBe(false)

    // Criar um bloco já dispara o BLOCK_CREATE (o construtor do Blockly faz isso).
    workspace.newBlock('sz_js_var_create')
    await tick()
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
    expect(heard).toHaveBeenCalled()

    history.undo()
    await tick()
    expect(workspace.getAllBlocks(false)).toHaveLength(0)
    expect(history.canRedo()).toBe(true)

    history.redo()
    await tick()
    expect(workspace.getAllBlocks(false)).toHaveLength(1)
    history.dispose()
  })

  it('eventos que não mexem nas pilhas não acordam a barra', async () => {
    const history = createBlocklyHistory(workspace)
    await tick()
    const heard = mock(() => {})
    history.subscribe(heard)
    // Um evento de interface (selecionar, rolar) não entra na pilha de desfazer.
    Blockly.Events.fire(
      new (Blockly.Events.get(Blockly.Events.VIEWPORT_CHANGE))(0, 0, 1, workspace.id, 1),
    )
    await tick()
    expect(heard).not.toHaveBeenCalled()
    history.dispose()
  })

  it('workspace só de leitura: os botões não desfazem nada', async () => {
    const history = createBlocklyHistory(workspace)
    workspace.newBlock('sz_js_var_create')
    await tick()
    workspace.setIsReadOnly(true)
    history.undo()
    await tick()
    expect(workspace.getAllBlocks(false)).toHaveLength(1)
    history.dispose()
  })

  it('depois de uma recarga feita por programa, a pilha de antes é esquecida', async () => {
    workspace.newBlock('sz_js_var_create')
    await tick()
    expect(workspace.getUndoStack().length).toBeGreaterThan(0)

    // O que o BlocklyPanel faz quando a Ponte reconstrói os blocos a partir do código. Sem o
    // `forget`, o Blockly mantém a pilha: o `load` NUNCA a limpa (confere a primeira asserção).
    withWorkspaceLoad(() => Blockly.serialization.workspaces.load(areaState('vida'), workspace))
    expect(workspace.getUndoStack().length).toBeGreaterThan(0)
    forgetBlocklyHistory(workspace)
    await tick()
    expect(workspace.getUndoStack()).toHaveLength(0)
    expect(workspace.getRedoStack()).toHaveLength(0)
  })

  it('o canvas limpo por fora (projeto sem blocos) também esquece o que a criança fez antes', async () => {
    workspace.newBlock('sz_js_var_create')
    await tick()
    withWorkspaceLoad(() => workspace.clear())
    await tick()
    // A limpeza não esvazia a pilha: sem o `forget`, o "desfazer" recriaria o bloco de antes.
    expect(workspace.getUndoStack().length).toBeGreaterThan(0)
    forgetBlocklyHistory(workspace)
    await tick()
    expect(workspace.getUndoStack()).toHaveLength(0)
  })
})
