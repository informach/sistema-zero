import * as Blockly from 'blockly/core'

/** Wait for Blockly's public event delivery, rather than a platform timer tick. */
export function deliveredBlocklyEvents(workspace: Blockly.Workspace): Promise<void> {
  return new Promise((resolve, reject) => {
    const marker = new Blockly.Events.FinishedLoading(workspace)
    const timeout = setTimeout(() => {
      workspace.removeChangeListener(listener)
      reject(new Error('Blockly did not deliver the event barrier.'))
    }, 2000)
    const listener = (event: Blockly.Events.Abstract) => {
      if (event !== marker) return
      clearTimeout(timeout)
      workspace.removeChangeListener(listener)
      resolve()
    }
    workspace.addChangeListener(listener)
    Blockly.Events.fire(marker)
  })
}
