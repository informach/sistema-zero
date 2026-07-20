import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { ensureBlocklyInitialized } from '../../setup'
import { FieldSvgPaint } from '../FieldSvgPaint'

describe('FieldSvgPaint', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
  })

  it('mantém cores especiais e variáveis CSS como texto livre', () => {
    const workspace = new Blockly.Workspace()
    const circle = workspace.newBlock('sz_svg_circle')
    const fill = circle.getField('FILL')

    expect(fill).toBeInstanceOf(FieldSvgPaint)
    circle.setFieldValue('none', 'FILL')
    expect(circle.getFieldValue('FILL')).toBe('none')
    circle.setFieldValue('var(--cor-do-planeta)', 'FILL')
    expect(circle.getFieldValue('FILL')).toBe('var(--cor-do-planeta)')
  })

  it('preserva o paint exatamente ao salvar e reabrir o workspace', () => {
    const original = new Blockly.Workspace()
    const circle = original.newBlock('sz_svg_circle')
    circle.setFieldValue('currentColor', 'FILL')

    const state = Blockly.serialization.workspaces.save(original)
    const restored = new Blockly.Workspace()
    Blockly.serialization.workspaces.load(state, restored)

    expect(restored.getAllBlocks(false)).toHaveLength(1)
    expect(restored.getAllBlocks(false)[0]?.getFieldValue('FILL')).toBe('currentColor')
  })
})
