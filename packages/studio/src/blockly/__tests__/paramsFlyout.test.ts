import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { FULL_LEARNING_PROFILE } from '#core'
import { classFlyoutItems, functionFlyoutItemsForSelection } from '../paramsFlyout'
import { ensureBlocklyInitialized } from '../setup'

function parameterNames(items: ReturnType<typeof functionFlyoutItemsForSelection>): string[] {
  return items.flatMap((item) =>
    item.kind === 'block' && item.type === 'sz_val_arg' && item.fields?.NAME
      ? [item.fields.NAME]
      : [],
  )
}

describe('flyouts escopados de Programação', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('não oferece parâmetros de outras funções quando nada está selecionado', () => {
    expect(functionFlyoutItemsForSelection(null, FULL_LEARNING_PROFILE)).not.toContainEqual(
      expect.objectContaining({ type: 'sz_val_arg' }),
    )
  })

  it('oferece somente os parâmetros da função selecionada', () => {
    const workspace = new Blockly.Workspace()
    const primeira = workspace.newBlock('sz_js_function')
    primeira.loadExtraState?.({ params: [{ id: 'p-a', name: 'primeiro' }] })
    const segunda = workspace.newBlock('sz_js_function')
    segunda.loadExtraState?.({ params: [{ id: 'p-b', name: 'segundo' }] })

    expect(
      parameterNames(functionFlyoutItemsForSelection(primeira, FULL_LEARNING_PROFILE)),
    ).toEqual(['primeiro'])
    expect(parameterNames(functionFlyoutItemsForSelection(segunda, FULL_LEARNING_PROFILE))).toEqual(
      ['segundo'],
    )
    workspace.dispose()
  })

  it('mantém parâmetros fora da categoria Classes', () => {
    expect(classFlyoutItems(FULL_LEARNING_PROFILE)).not.toContainEqual(
      expect.objectContaining({ type: 'sz_val_arg' }),
    )
  })
})
