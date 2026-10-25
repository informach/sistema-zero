import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import {
  BLOCKLY_EVENT_TYPES,
  isProgramStructureChange,
  isPureWorkspaceLayoutMove,
} from '../changeSemantics'
import { findDraftStacks } from '../draftDiagnostics'
import { ensureBlocklyInitialized } from '../setup'

describe('semântica dos movimentos do Blockly', () => {
  it('trata arrastar uma pilha top-level como mudança só de layout', () => {
    expect(
      isPureWorkspaceLayoutMove({
        oldCoordinate: { x: 10, y: 20 },
        newCoordinate: { x: 40, y: 50 },
      }),
    ).toBe(true)
  })

  it('trata conectar ou desconectar como mudança do programa', () => {
    expect(
      isPureWorkspaceLayoutMove({
        oldCoordinate: { x: 10, y: 20 },
        newParentId: 'area',
        newInputName: 'CHILDREN',
      }),
    ).toBe(false)
    expect(
      isPureWorkspaceLayoutMove({
        oldParentId: 'area',
        oldInputName: 'CHILDREN',
        newCoordinate: { x: 40, y: 50 },
      }),
    ).toBe(false)
  })
})

describe('o que conta como mudança de ESTRUTURA do programa', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('os literais deste módulo puro são os do Blockly', () => {
    expect(BLOCKLY_EVENT_TYPES.finishedLoading).toBe(Blockly.Events.FINISHED_LOADING)
    expect(BLOCKLY_EVENT_TYPES.blockCreate).toBe(Blockly.Events.BLOCK_CREATE)
    expect(BLOCKLY_EVENT_TYPES.blockDelete).toBe(Blockly.Events.BLOCK_DELETE)
    expect(BLOCKLY_EVENT_TYPES.blockChange).toBe(Blockly.Events.BLOCK_CHANGE)
    expect(BLOCKLY_EVENT_TYPES.blockMove).toBe(Blockly.Events.BLOCK_MOVE)
  })

  it('criar, apagar, mutar e terminar a carga contam; mover só o layout não', () => {
    for (const type of [
      BLOCKLY_EVENT_TYPES.finishedLoading,
      BLOCKLY_EVENT_TYPES.blockCreate,
      BLOCKLY_EVENT_TYPES.blockDelete,
      BLOCKLY_EVENT_TYPES.blockChange,
    ]) {
      expect(isProgramStructureChange({ type })).toBe(true)
    }
    expect(
      isProgramStructureChange({
        type: BLOCKLY_EVENT_TYPES.blockMove,
        oldCoordinate: { x: 1, y: 2 },
        newCoordinate: { x: 3, y: 4 },
      }),
    ).toBe(false)
    expect(
      isProgramStructureChange({
        type: BLOCKLY_EVENT_TYPES.blockMove,
        oldCoordinate: { x: 1, y: 2 },
        newParentId: 'area',
        newInputName: 'CHILDREN',
      }),
    ).toBe(true)
    expect(isProgramStructureChange({ type: 'click' })).toBe(false)
  })

  /**
   * O `−` do "Se / senão" remonta os inputs dentro de `Blockly.Events.disable()`:
   * a pilha do ramo removido fica flutuando (vira rascunho, deixa de gerar
   * código) e o ÚNICO evento que sai é um `change` de mutação. Enquanto ele não
   * contava como edição estrutural, o conjunto de rascunhos ficava defasado.
   */
  it('o "−" do Se/senão solta a pilha do ramo emitindo SÓ um change de mutação', async () => {
    const workspace = new Blockly.Workspace()
    let deadline: ReturnType<typeof setTimeout> | undefined
    try {
      // Fixture construction must not enqueue events for the operation's listener.
      // A fixed sleep does not acknowledge Blockly's deferred event queue.
      Blockly.Events.disable()
      let ifElse: Blockly.Block & { addElse_(): void; removeLast_(): void }
      let stack: Blockly.Block
      try {
        const area = workspace.newBlock('sz_frame_start')
        ifElse = workspace.newBlock('sz_js_if_else') as typeof ifElse
        area
          .getInput('CHILDREN')
          ?.connection?.connect(ifElse.previousConnection as Blockly.Connection)
        ifElse.addElse_()
        stack = workspace.newBlock('sz_js_console_log_text')
        ifElse.getInput('ELSE')?.connection?.connect(stack.previousConnection as Blockly.Connection)
      } finally {
        Blockly.Events.enable()
      }
      expect(findDraftStacks(workspace)).toEqual([])
      const heard: Blockly.Events.Abstract[] = []
      const changed = new Promise<void>((resolve) => {
        workspace.addChangeListener((event) => {
          heard.push(event)
          if (event.type === BLOCKLY_EVENT_TYPES.blockChange) resolve()
        })
      })
      ifElse.removeLast_()
      await Promise.race([
        changed,
        new Promise<never>((_, reject) => {
          deadline = setTimeout(() => reject(new Error('Blockly mutation was not delivered')), 1000)
        }),
      ])
      expect(findDraftStacks(workspace).map((block) => block.id)).toEqual([stack.id])
      expect(heard.map((event) => event.type)).toEqual([BLOCKLY_EVENT_TYPES.blockChange])
      expect(heard.every((event) => isProgramStructureChange(event))).toBe(true)
    } finally {
      clearTimeout(deadline)
      workspace.dispose()
    }
  })
})
