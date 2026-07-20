import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../blockly/blocks'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { world3DBlocks } from '../../official-extensions/world-3d/blocks'
import {
  appendWorldComposerBlock,
  collectWorldComposerItems,
  moveWorldComposerItem,
} from './worldComposerModel'

function connectNumber(
  workspace: Blockly.Workspace,
  block: Blockly.Block,
  input: string,
  value: number,
): void {
  const numberBlock = workspace.newBlock('sz_val_number')
  numberBlock.setFieldValue(String(value), 'NUM')
  const connection = block.getInput(input)?.connection
  if (connection && numberBlock.outputConnection) connection.connect(numberBlock.outputConnection)
}

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(world3DBlocks)
})

describe('modelo do editor visual do Mundo 3D', () => {
  it('adiciona na área Ao iniciar e nunca cria uma área automaticamente', () => {
    const withoutArea = new Blockly.Workspace()
    expect(appendWorldComposerBlock(withoutArea, 'sz_w3d_district')).toBeNull()
    expect(withoutArea.getBlocksByType('sz_frame_start', false)).toHaveLength(0)
    expect(withoutArea.getBlocksByType('sz_w3d_district', false)).toHaveLength(0)
    withoutArea.dispose()

    const workspace = new Blockly.Workspace()
    const start = workspace.newBlock('sz_frame_start')
    const id = appendWorldComposerBlock(workspace, 'sz_w3d_district')
    expect(id).not.toBeNull()
    expect(workspace.getBlockById(id ?? '')?.getSurroundParent()).toBe(start)
    expect(workspace.getBlocksByType('sz_frame_behavior', false)).toHaveLength(0)
    workspace.dispose()
  })

  it('lê posições dos mesmos blocos e grava o movimento nos valores conectados', () => {
    const workspace = new Blockly.Workspace()
    const district = workspace.newBlock('sz_w3d_district')
    connectNumber(workspace, district, 'X', 12)
    connectNumber(workspace, district, 'Z', -8)

    expect(collectWorldComposerItems(workspace)).toEqual([
      {
        id: district.id,
        type: 'sz_w3d_district',
        label: 'Distrito',
        x: 12,
        z: -8,
        color: '#34d399',
        movable: true,
      },
    ])

    expect(moveWorldComposerItem(workspace, district.id, 20.25, -3.75)).toBe(true)
    expect(district.getInputTargetBlock('X')?.getFieldValue('NUM')).toBe(20.3)
    expect(district.getInputTargetBlock('Z')?.getFieldValue('NUM')).toBe(-3.7)
    workspace.dispose()
  })

  it('mostra expressões como posição bloqueada sem substituir a lógica do aluno', () => {
    const workspace = new Blockly.Workspace()
    const lamp = workspace.newBlock('sz_w3d_lamp')
    const variable = workspace.newBlock('sz_val_text')
    variable.setFieldValue('posição calculada', 'TEXT')
    const xConnection = lamp.getInput('X')?.connection
    if (xConnection && variable.outputConnection) xConnection.connect(variable.outputConnection)
    connectNumber(workspace, lamp, 'Z', 6)

    expect(collectWorldComposerItems(workspace)[0]?.movable).toBe(false)
    expect(moveWorldComposerItem(workspace, lamp.id, 1, 2)).toBe(false)
    expect(lamp.getInputTargetBlock('X')?.type).toBe('sz_val_text')
    workspace.dispose()
  })

  it('move uma fileira de casas preservando seu comprimento e direção', () => {
    const workspace = new Blockly.Workspace()
    const houses = workspace.newBlock('sz_w3d_house_row')
    connectNumber(workspace, houses, 'X1', -10)
    connectNumber(workspace, houses, 'Z1', 4)
    connectNumber(workspace, houses, 'X2', 10)
    connectNumber(workspace, houses, 'Z2', 4)

    const item = collectWorldComposerItems(workspace)[0]
    expect(item).toMatchObject({ label: 'Casas', x: 0, z: 4, movable: true })
    expect(moveWorldComposerItem(workspace, houses.id, 6, -2)).toBe(true)
    expect(houses.getInputTargetBlock('X1')?.getFieldValue('NUM')).toBe(-4)
    expect(houses.getInputTargetBlock('Z1')?.getFieldValue('NUM')).toBe(-2)
    expect(houses.getInputTargetBlock('X2')?.getFieldValue('NUM')).toBe(16)
    expect(houses.getInputTargetBlock('Z2')?.getFieldValue('NUM')).toBe(-2)
    workspace.dispose()
  })
})
