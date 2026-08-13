import { describe, expect, it } from 'bun:test'
import { isPureWorkspaceLayoutMove } from '../changeSemantics'

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
