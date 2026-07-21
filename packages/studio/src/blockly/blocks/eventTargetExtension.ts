import * as Blockly from 'blockly/core'

export const EVENT_TARGET_EXTENSION = 'sz_event_target'

function usesNamedElementTarget(value: unknown): boolean {
  return value === 'id' || value === 'var'
}

/** Mantém o nome do alvo visível somente quando o listener usa elemento/variável. */
export function registerEventTargetExtension(): void {
  if (Blockly.Extensions.isRegistered(EVENT_TARGET_EXTENSION)) return
  Blockly.Extensions.register(EVENT_TARGET_EXTENSION, function (this: Blockly.Block) {
    const kindField = this.getField('TARGET_KIND')
    const targetField = this.getField('TARGET')
    if (!kindField || !targetField) return

    const updateTargetVisibility = (kind: unknown): void => {
      targetField.setVisible(usesNamedElementTarget(kind))
    }
    kindField.setValidator((value) => {
      updateTargetVisibility(value)
      return value
    })
    updateTargetVisibility(kindField.getValue())
  })
}
